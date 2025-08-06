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
    
    const defaultUrls = [
      `https://www.eventbrite.com/d/${country}--${city}/events/`,
      `https://in.bookmyshow.com/explore/events-${city}`,
      `https://paytminsider.com/events/${city}`,
      `https://www.meetup.com/find/?location=${city}--${country}`,
    ]

    const urlsToScrape = urls || defaultUrls
    const scrapedEvents: EventData[] = []

    for (const url of urlsToScrape) {
      try {
        console.log(`Scraping: ${url}`)
        
        const scrapeResponse = await firecrawl.scrapeUrl(url, {
          formats: ['markdown', 'html'],
          extractorOptions: {
            mode: 'llm-extraction',
            extractionPrompt: `Extract event information from this page. For each event found, extract:
              - title: Event name/title
              - date: Event date and time (format as readable string)
              - location: Venue name and address
              - price: Ticket price or "Free" if free
              - description: Brief event description
              - category: Event category (music, sports, arts, comedy, etc.)
              - url: Direct link to event page
              
              Return as a JSON array of events. If no events found, return empty array.
              Example: [{"title": "Concert Name", "date": "Dec 15, 2024 8:00 PM", "location": "Venue Name", "price": "$25", "description": "Description", "category": "music", "url": "https://..."}]`
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
                  source: url
                })
              }
            })
          }
        }
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`Error scraping ${url}:`, error)
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
        event_date: event.date || new Date().toISOString(),
        location: event.location || `${city}, ${country}`,
        price: event.price || 'Free',
        category: event.category || 'general',
        source: 'firecrawl',
        external_id: `firecrawl_${event.url}_${Date.now()}`,
        external_url: event.url,
        city: city,
        country: country,
        latitude: null,
        longitude: null,
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