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
    if (nearbyEvents.length >= 8) {
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

    // Fetch fresh events using Firecrawl
    const events: EventData[] = [];
    const searchQuery = query || `events ${city || `near ${latitude}, ${longitude}`}`;
    
    try {
      // Search multiple event sources with Firecrawl
      const eventSources = [
        {
          url: `https://www.eventbrite.com/d/${encodeURIComponent(city || 'events')}/events/`,
          name: 'Eventbrite'
        },
        {
          url: `https://www.facebook.com/events/search/?q=${encodeURIComponent(searchQuery)}`,
          name: 'Facebook Events'
        }
      ];

      for (const source of eventSources) {
        try {
          console.log(`Scraping ${source.name}: ${source.url}`);
          
          const firecrawlResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: source.url,
              formats: ['markdown', 'extract'],
              extract: {
                schema: {
                  type: 'object',
                  properties: {
                    events: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          description: { type: 'string' },
                          date: { type: 'string' },
                          time: { type: 'string' },
                          location: { type: 'string' },
                          price: { type: 'string' },
                          organizer: { type: 'string' },
                          category: { type: 'string' },
                          url: { type: 'string' },
                          imageUrl: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              },
              onlyMainContent: true,
              waitFor: 2000
            })
          });

          if (!firecrawlResponse.ok) {
            console.log(`${source.name} scraping failed: ${firecrawlResponse.status}`);
            continue;
          }

          const firecrawlData = await firecrawlResponse.json();
          console.log(`${source.name} response:`, JSON.stringify(firecrawlData, null, 2));

          if (firecrawlData.success && firecrawlData.data?.extract?.events) {
            const sourceEvents = firecrawlData.data.extract.events.map((event: any) => ({
              title: event.title || 'Untitled Event',
              description: event.description || '',
              start_date: parseEventDate(event.date, event.time),
              location_name: event.location || (city || 'Unknown Location'),
              price: event.price || 'Free',
              organizer: event.organizer || source.name,
              category: event.category || 'general',
              website_url: event.url || source.url,
              image_url: event.imageUrl || null,
              source: source.name.toLowerCase(),
              external_id: `${source.name.toLowerCase()}-${encodeURIComponent(event.title || Math.random().toString())}`
            }));

            events.push(...sourceEvents);
            console.log(`Extracted ${sourceEvents.length} events from ${source.name}`);
          }
        } catch (sourceError) {
          console.error(`Error scraping ${source.name}:`, sourceError);
        }
      }

      // If no events found, try alternative search
      if (events.length === 0 && city) {
        console.log('No events found, trying alternative search...');
        
        try {
          const altResponse = await fetch('https://api.firecrawl.dev/v0/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `events in ${city} this week upcoming`,
              limit: 10,
              formats: ['extract'],
              extract: {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    date: { type: 'string' },
                    location: { type: 'string' },
                    url: { type: 'string' }
                  }
                }
              }
            })
          });

          if (altResponse.ok) {
            const altData = await altResponse.json();
            if (altData.success && altData.data) {
              const searchEvents = altData.data.map((result: any, index: number) => ({
                title: result.extract?.title || result.title || 'Event',
                description: result.extract?.description || result.description || '',
                start_date: parseEventDate(result.extract?.date || result.date),
                location_name: result.extract?.location || city,
                price: 'See website',
                organizer: 'Various',
                category: 'general',
                website_url: result.url,
                image_url: null,
                source: 'search',
                external_id: `search-${index}-${Date.now()}`
              }));

              events.push(...searchEvents);
              console.log(`Found ${searchEvents.length} events via search`);
            }
          }
        } catch (searchError) {
          console.error('Alternative search failed:', searchError);
        }
      }

    } catch (firecrawlError) {
      console.error('Firecrawl error:', firecrawlError);
    }

    // Store events in database
    if (events.length > 0) {
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

function parseEventDate(dateStr?: string, timeStr?: string): string {
  if (!dateStr) {
    // Default to next week if no date provided
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString();
  }

  try {
    // Try to parse the date string
    let date = new Date(dateStr);
    
    // If invalid date, try some common formats
    if (isNaN(date.getTime())) {
      // Try extracting date from text
      const dateMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        const [, month, day, year] = dateMatch;
        date = new Date(parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Default to next week
        date = new Date();
        date.setDate(date.getDate() + 7);
      }
    }

    // Add time if provided
    if (timeStr) {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const [, hours, minutes] = timeMatch;
        date.setHours(parseInt(hours), parseInt(minutes));
      }
    }

    return date.toISOString();
  } catch (error) {
    console.error('Error parsing date:', error);
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 7);
    return fallback.toISOString();
  }
}