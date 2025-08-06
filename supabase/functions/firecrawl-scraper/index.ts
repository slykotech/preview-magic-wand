import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.29.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EventData {
  title: string;
  date?: string;
  location?: string;
  price?: string;
  description?: string;
  category?: string;
  url?: string;
  source?: string;
  platform?: string;
}

interface PlatformConfig {
  name: string;
  urlTemplate: string;
  method: 'crawl' | 'search';
  formatCity: (city: string) => string;
  extractionPrompt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { urls, city = 'mumbai', country = 'india' } = await req.json()
    
    // Get Firecrawl API key from Supabase secrets
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlApiKey) {
      throw new Error('Firecrawl API key not configured')
    }

    const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey })
    
    // Platform configurations with dynamic URL generation
    const platforms: PlatformConfig[] = [
      {
        name: 'BookMyShow',
        urlTemplate: 'https://in.bookmyshow.com/explore/home/{city}',
        method: 'crawl',
        formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
        extractionPrompt: 'Extract BookMyShow events with focus on movies, shows, concerts, and entertainment events.'
      },
      {
        name: 'Paytm Insider',
        urlTemplate: 'https://insider.in/all-events-in-{city}',
        method: 'crawl',
        formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
        extractionPrompt: 'Extract Paytm Insider events focusing on live events, workshops, and experiences.'
      },
      {
        name: 'EventsHigh',
        urlTemplate: 'https://eventshigh.com/{city}',
        method: 'crawl',
        formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
      },
      {
        name: 'Townscript',
        urlTemplate: 'https://www.townscript.com/in/{city}',
        method: 'crawl',
        formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
      },
      {
        name: 'Eventbrite',
        urlTemplate: 'https://www.eventbrite.com/d/{city}/events/',
        method: 'crawl',
        formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
      },
      {
        name: 'Meetup',
        urlTemplate: 'https://www.meetup.com/find/events/?allMeetups=true&radius=10&userFreeform={city}',
        method: 'crawl',
        formatCity: (c: string) => encodeURIComponent(c),
      },
      {
        name: 'AllEvents',
        urlTemplate: 'https://allevents.in/{city}',
        method: 'crawl',
        formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
      }
    ];

    // Generate URLs from platforms if not provided
    const urlsToScrape = urls || platforms.map(platform => {
      const formattedCity = platform.formatCity(city);
      return {
        url: platform.urlTemplate.replace('{city}', formattedCity),
        platform: platform.name,
        method: platform.method,
        extractionPrompt: platform.extractionPrompt
      };
    });
    const scrapedEvents: EventData[] = []

    for (const urlConfig of urlsToScrape) {
      try {
        const url = typeof urlConfig === 'string' ? urlConfig : urlConfig.url;
        const platform = typeof urlConfig === 'string' ? 'Unknown' : urlConfig.platform;
        const method = typeof urlConfig === 'string' ? 'crawl' : urlConfig.method;
        const customPrompt = typeof urlConfig === 'string' ? null : urlConfig.extractionPrompt;
        
        console.log(`Scraping ${platform}: ${url} using ${method}`)
        
        const basePrompt = `Extract event information from this ${platform} page. For each event found, extract:
          - title: Event name/title
          - date: Event date and time (format as readable string like "Dec 15, 2024 8:00 PM")
          - location: Venue name and full address
          - price: Ticket price (include currency) or "Free" if free
          - description: Brief event description (max 200 chars)
          - category: Event category (music, sports, arts, comedy, food, technology, etc.)
          - url: Direct link to event page
          
          ${customPrompt || ''}
          
          Return as a JSON array of events. If no events found, return empty array.
          Example: [{"title": "Concert Name", "date": "Dec 15, 2024 8:00 PM", "location": "Venue Name, Full Address", "price": "₹500", "description": "Description", "category": "music", "url": "https://..."}]`;

        const scrapeResponse = method === 'search' 
          ? await firecrawl.search(url, { limit: 10 })
          : await firecrawl.scrapeUrl(url, {
              formats: ['markdown', 'html'],
              extractorOptions: {
                mode: 'llm-extraction',
                extractionPrompt: basePrompt
              }
            })

        if (scrapeResponse.success && scrapeResponse.data) {
          let extractedEvents = []
          
          // Handle different response formats
          if (typeof scrapeResponse.data === 'string') {
            try {
              extractedEvents = JSON.parse(scrapeResponse.data)
            } catch {
              // If not JSON, try to extract events from text
              extractedEvents = []
            }
          } else if (Array.isArray(scrapeResponse.data)) {
            extractedEvents = scrapeResponse.data
          } else if (scrapeResponse.data.llm_extraction) {
            try {
              extractedEvents = JSON.parse(scrapeResponse.data.llm_extraction)
            } catch {
              extractedEvents = []
            }
          }

          // Validate and clean events
          if (Array.isArray(extractedEvents)) {
            extractedEvents.forEach((event: any) => {
              if (event && typeof event === 'object' && event.title) {
                scrapedEvents.push({
                  title: event.title,
                  date: event.date || undefined,
                  location: event.location || undefined,
                  price: event.price || undefined,
                  description: event.description || undefined,
                  category: event.category || undefined,
                  url: event.url || url,
                  source: platform,
                  platform: platform
                })
              }
            })
          }
        }
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 3000))
        
      } catch (error) {
        const url = typeof urlConfig === 'string' ? urlConfig : urlConfig.url;
        const platform = typeof urlConfig === 'string' ? 'Unknown' : urlConfig.platform;
        console.error(`Error scraping ${platform} (${url}):`, error)
        // Continue with other URLs even if one fails
      }
    }

    // Store events in Supabase if any were found
    if (scrapedEvents.length > 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Convert to database format
      const eventsToStore = scrapedEvents.map(event => ({
        title: event.title,
        description: event.description || '',
        start_date: event.date ? new Date(event.date).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location_name: event.location || `${city}, ${country}`,
        price: event.price || 'Free',
        category: event.category || 'general',
        source: event.platform || event.source || 'firecrawl',
        external_id: `${event.platform || 'firecrawl'}_${city}_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        website_url: event.url,
        city_name: city,
        latitude: null,
        longitude: null,
        ai_generated: false,
        created_at: new Date().toISOString()
      }))

      // Insert events, handling duplicates
      const { error: insertError } = await supabase
        .from('events')
        .upsert(eventsToStore, { 
          onConflict: 'external_id',
          ignoreDuplicates: true 
        })

      if (insertError) {
        console.error('Error storing events:', insertError)
      } else {
        console.log(`Stored ${eventsToStore.length} events in database`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        events: scrapedEvents,
        count: scrapedEvents.length,
        message: `Successfully scraped ${scrapedEvents.length} events`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
    
  } catch (error) {
    console.error('Error in firecrawl-scraper:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        events: [],
        count: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})