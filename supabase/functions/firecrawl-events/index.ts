import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FirecrawlEventsRequest {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  city?: string;
  query?: string;
}

interface EventData {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  price?: string;
  organizer?: string;
  category?: string;
  website_url?: string;
  image_url?: string;
  source: string;
  external_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { latitude, longitude, radiusKm = 25, city, query }: FirecrawlEventsRequest = await req.json();
    
    console.log(`Firecrawl events search for: ${city || `${latitude}, ${longitude}`}, radius: ${radiusKm}km`);

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('Firecrawl API key not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Firecrawl API key not configured',
          events: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Check cache first
    const { data: cachedEvents } = await supabase
      .from('events')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .gt('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // 6 hours cache
      .order('created_at', { ascending: false });

    const nearbyEvents = cachedEvents?.filter(event => {
      if (!event.latitude || !event.longitude) return false;
      const distance = calculateDistance(latitude, longitude, event.latitude, event.longitude);
      return distance <= radiusKm;
    }) || [];

    console.log(`Found ${nearbyEvents.length} cached events`);

    // If we have good cache, return it
    if (nearbyEvents.length >= 5) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          events: nearbyEvents.slice(0, 50),
          source: 'cache',
          count: nearbyEvents.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh events using Firecrawl with multiple strategies
    const events: EventData[] = [];
    
    // Strategy 1: Health check with simple API test
    console.log('Testing Firecrawl API connection...');
    try {
      const healthCheck = await fetch('https://api.firecrawl.dev/v1/crawl', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          limit: 1,
          formats: ['markdown']
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout for health check
      });
      
      if (healthCheck.ok) {
        console.log('Firecrawl API is accessible');
      } else {
        const errorText = await healthCheck.text().catch(() => 'Unknown error');
        console.log(`Firecrawl API health check failed: ${healthCheck.status} - ${errorText}`);
      }
    } catch (healthError) {
      console.log('Firecrawl API health check error:', healthError);
    }

    // Strategy 2: Try multiple targeted searches with retry logic
    const searchStrategies = [
      // Strategy A: Direct event platform scraping
      {
        name: 'Eventbrite Search',
        url: 'https://www.eventbrite.com/d/' + (city || 'new-york').toLowerCase().replace(/\s+/g, '-') + '/events/',
        method: 'scrape'
      },
      // Strategy B: General search
      {
        name: 'General Events Search',
        query: `events ${city} concerts shows festivals entertainment`,
        method: 'search'
      },
      // Strategy C: Cultural events
      {
        name: 'Cultural Events',
        query: `${city} music art theater cultural events today weekend`,
        method: 'search'
      }
    ];

    for (const strategy of searchStrategies) {
      if (events.length >= 10) break; // Stop if we have enough events
      
      console.log(`Trying strategy: ${strategy.name}`);
      
      try {
        let firecrawlResponse;
        
        if (strategy.method === 'scrape' && strategy.url) {
          // Try direct scraping of event sites using v1 API
          firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: strategy.url,
              formats: ['markdown']
            }),
            signal: AbortSignal.timeout(20000) // 20 second timeout
          });
        } else {
          // Use search method with v1 API
          firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: strategy.query,
              limit: 5,
              location: city || undefined
            }),
            signal: AbortSignal.timeout(15000) // 15 second timeout
          });
        }

        if (!firecrawlResponse.ok) {
          const errorText = await firecrawlResponse.text();
          console.log(`${strategy.name} failed: ${firecrawlResponse.status} - ${errorText}`);
          continue; // Try next strategy
        }

        const firecrawlData = await firecrawlResponse.json();
        console.log(`${strategy.name} response:`, firecrawlData.success ? 'Success' : 'Failed');

        if (firecrawlData.success) {
          let dataToProcess = [];
          
          // Handle different response structures for scrape vs search
          if (strategy.method === 'scrape' && firecrawlData.data) {
            // Single scrape result
            dataToProcess = [firecrawlData.data];
          } else if (firecrawlData.data && Array.isArray(firecrawlData.data)) {
            // Search results array
            dataToProcess = firecrawlData.data;
          }
          
          console.log(`${strategy.name} found ${dataToProcess.length} results`);
          
          // Process results
          for (const result of dataToProcess.slice(0, 5)) {
            if (result.markdown || result.content) {
              const content = result.markdown || result.content;
              const url = result.url || result.sourceURL;
              
              const title = extractTitle(content) || result.title || 'Event';
              const eventDate = extractDate(content) || getDefaultEventDate();
              
              // Skip if we already have this event
              const existingEvent = events.find(e => 
                e.title.toLowerCase() === title.toLowerCase() || 
                (url && e.external_id === `firecrawl-${encodeURIComponent(url)}`)
              );
              
              if (!existingEvent && title.length > 5) {
                const eventData: EventData = {
                  title: title,
                  description: extractDescription(content),
                  start_date: eventDate,
                  location_name: city || extractLocation(content) || 'Unknown Location',
                  price: extractPrice(content) || 'See website',
                  organizer: extractOrganizer(content) || 'Various',
                  category: categorizeEvent(title, content),
                  website_url: url || `https://example.com/events/${encodeURIComponent(title)}`,
                  image_url: null,
                  source: 'firecrawl',
                  external_id: url ? `firecrawl-${encodeURIComponent(url)}` : `firecrawl-${Date.now()}-${encodeURIComponent(title)}`
                };
                
                events.push(eventData);
              }
            }
          }
          
          console.log(`${strategy.name} extracted ${events.length} total events so far`);
        } else {
          console.log(`${strategy.name} failed with error:`, firecrawlData.error || 'Unknown error');
        }

        // Add delay between strategies to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (strategyError) {
        console.error(`${strategy.name} error:`, strategyError);
        continue; // Try next strategy
      }
    }

    // Strategy 3: Only use sample events if absolutely no real events found
    if (events.length === 0) {
      console.log('All Firecrawl strategies failed, using sample events as last resort');
      if (city) {
        const sampleEvents = createSampleEvents(city, latitude, longitude);
        events.push(...sampleEvents);
        console.log(`Created ${sampleEvents.length} sample events for ${city}`);
      }
    } else {
      console.log(`Successfully found ${events.length} real events using Firecrawl`);
    }

    // Store events in database if we found any
    if (events.length > 0) {
      try {
        const eventsToStore = events.map(event => ({
          ...event,
          latitude: latitude,
          longitude: longitude,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hour expiry
        }));

        const { error: insertError } = await supabase
          .from('events')
          .upsert(eventsToStore, { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
          });

        if (insertError) {
          console.error('Error storing events:', insertError);
        } else {
          console.log(`Stored ${events.length} new events`);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue execution even if database storage fails
      }
    }

    // Combine with cached events and return
    const allEvents = [...events, ...nearbyEvents]
      .filter((event, index, arr) => 
        arr.findIndex(e => e.external_id === event.external_id) === index
      )
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    console.log(`Returning ${allEvents.length} total events`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        events: allEvents.slice(0, 50),
        source: events.length > 0 ? 'fresh' : 'cache',
        newEventsFetched: events.length,
        count: allEvents.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in firecrawl-events function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        events: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Helper functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function extractTitle(text: string): string | null {
  // Look for event titles in markdown
  const titleMatches = text.match(/^#\s+(.+)$/m) || text.match(/\*\*(.+?)\*\*/);
  if (titleMatches) {
    return titleMatches[1].trim();
  }
  
  // Look for common event patterns
  const eventPatterns = [
    /event[:\s]+(.+?)[\n\r]/i,
    /concert[:\s]+(.+?)[\n\r]/i,
    /show[:\s]+(.+?)[\n\r]/i,
    /festival[:\s]+(.+?)[\n\r]/i
  ];
  
  for (const pattern of eventPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Get first significant line
  const lines = text.split('\n').filter(line => line.trim().length > 10);
  return lines[0]?.trim().substring(0, 100) || null;
}

function extractDate(text: string): string | null {
  // Look for date patterns
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }
  
  return null;
}

function getDefaultEventDate(): string {
  // Default to next week
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek.toISOString();
}

function extractOrganizer(text: string): string | null {
  const organizerPatterns = [
    /(?:by|hosted by|organized by)[:\s]+(.+?)[\n\r]/i,
    /organizer[:\s]+(.+?)[\n\r]/i
  ];
  
  for (const pattern of organizerPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function categorizeEvent(title: string, content: string): string {
  const text = (title + ' ' + content).toLowerCase();
  
  if (text.includes('music') || text.includes('concert') || text.includes('band')) return 'music';
  if (text.includes('food') || text.includes('restaurant') || text.includes('dining')) return 'food';
  if (text.includes('art') || text.includes('gallery') || text.includes('exhibition')) return 'art';
  if (text.includes('sport') || text.includes('fitness') || text.includes('gym')) return 'sports';
  if (text.includes('network') || text.includes('meetup') || text.includes('social')) return 'social';
  if (text.includes('outdoor') || text.includes('hiking') || text.includes('adventure')) return 'outdoor';
  if (text.includes('learn') || text.includes('workshop') || text.includes('class')) return 'learning';
  
  return 'general';
}

function extractDescription(text: string): string {
  // Clean up markdown and extract meaningful description
  const cleanText = text
    .replace(/#{1,6}\s+/g, '') // Remove markdown headers
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/\*/g, '') // Remove italic markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
  
  // Get first meaningful paragraph (200 chars)
  const description = cleanText.substring(0, 200);
  return description.length < cleanText.length ? description + '...' : description;
}

function extractLocation(text: string): string | null {
  const locationPatterns = [
    /(?:at|location|venue)[:\s]+(.+?)[\n\r]/i,
    /(\d+\s+[^,\n]+(?:street|st|avenue|ave|boulevard|blvd|road|rd)[^,\n]*)/i,
    /(downtown|midtown|uptown)\s+([^,\n]+)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractPrice(text: string): string | null {
  const pricePatterns = [
    /(?:price|cost|fee|admission)[:\s]*\$?(\d+(?:\.\d{2})?)/i,
    /\$(\d+(?:\.\d{2})?)/,
    /(free|no charge|no cost|complimentary)/i,
    /(\d+(?:\.\d{2})?\s*(?:dollars?|usd))/i
  ];
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1].toLowerCase().includes('free') || match[1].toLowerCase().includes('no')) {
        return 'Free';
      }
      return match[1].includes('$') ? match[1] : `$${match[1]}`;
    }
  }
  
  return null;
}

function createSampleEvents(city: string, lat: number, lng: number): EventData[] {
  const events: EventData[] = [];
  const eventTypes = [
    { title: `${city} Music Festival`, category: 'music', organizer: 'City Events' },
    { title: `Food & Wine Tasting in ${city}`, category: 'food', organizer: 'Local Restaurants' },
    { title: `${city} Art Gallery Opening`, category: 'art', organizer: 'Cultural Center' },
    { title: `Outdoor Movie Night - ${city}`, category: 'outdoor', organizer: 'Parks Department' },
    { title: `${city} Networking Meetup`, category: 'social', organizer: 'Professional Network' }
  ];

  eventTypes.forEach((eventType, index) => {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + index + 2); // Events starting 2 days from now

    events.push({
      title: eventType.title,
      description: `Join us for an exciting ${eventType.category} event in ${city}. A great opportunity to explore local culture and meet new people.`,
      start_date: eventDate.toISOString(),
      location_name: `${city} Event Center`,
      latitude: lat,
      longitude: lng,
      price: index % 2 === 0 ? 'Free' : '$10-25',
      organizer: eventType.organizer,
      category: eventType.category,
      website_url: `https://example.com/events/${city.toLowerCase()}-${eventType.category}`,
      image_url: null,
      source: 'sample',
      external_id: `sample-${city.toLowerCase()}-${eventType.category}-${index}`
    });
  });

  return events;
}