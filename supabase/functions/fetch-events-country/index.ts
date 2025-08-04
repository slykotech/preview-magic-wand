import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { 
  UnifiedEvent, 
  EVENT_SOURCES, 
  generateLocationBasedEvents 
} from './event-sources.ts';
import { fetchGoogleEvents } from './google-events.ts';
import { 
  fetchFirecrawlBookMyShowEvents, 
  fetchFirecrawlPaytmInsiderEvents, 
  fetchFirecrawlDistrictEvents,
  fetchEventbriteEvents,
  fetchTicketmasterEvents,
  getFirecrawlStatus
} from './scraper-events.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Database connection
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Major cities for country-wide fetching
const MAJOR_CITIES: { [country: string]: Array<{name: string, lat: number, lng: number, state?: string}> } = {
  'India': [
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
    { name: 'Delhi', lat: 28.7041, lng: 77.1025, state: 'Delhi' },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, state: 'Telangana' },
    { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
    { name: 'Jaipur', lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
    { name: 'Surat', lat: 21.1702, lng: 72.8311, state: 'Gujarat' }
  ],
  'United States': [
    { name: 'New York', lat: 40.7128, lng: -74.0060, state: 'New York' },
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, state: 'California' },
    { name: 'Chicago', lat: 41.8781, lng: -87.6298, state: 'Illinois' },
    { name: 'Houston', lat: 29.7604, lng: -95.3698, state: 'Texas' },
    { name: 'Phoenix', lat: 33.4484, lng: -112.0740, state: 'Arizona' },
    { name: 'Philadelphia', lat: 39.9526, lng: -75.1652, state: 'Pennsylvania' },
    { name: 'San Antonio', lat: 29.4241, lng: -98.4936, state: 'Texas' },
    { name: 'San Diego', lat: 32.7157, lng: -117.1611, state: 'California' }
  ]
};

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Processing country-wide fetch-events request`);

  try {
    const { country = 'India', batchSize = 5 } = await req.json();
    
    console.log(`[${requestId}] Fetching events for country: ${country}`);
    
    const cities = MAJOR_CITIES[country] || MAJOR_CITIES['India'];
    const allEvents: UnifiedEvent[] = [];
    let totalEventsStored = 0;

    // Process cities in batches to avoid rate limiting
    for (let i = 0; i < cities.length; i += batchSize) {
      const cityBatch = cities.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}: ${cityBatch.map(c => c.name).join(', ')}`);

      const batchPromises = cityBatch.map(async (city) => {
        try {
          console.log(`Fetching events for ${city.name}, ${city.state || country}`);
          const cityEvents: UnifiedEvent[] = [];

          // Fetch from Google Places
          const googleKey = Deno.env.get('GOOGLE_EVENTS_API_KEY');
          if (googleKey) {
            try {
              const googleEvents = await fetchGoogleEvents(googleKey, city.lat, city.lng, 25, city.name);
              cityEvents.push(...googleEvents);
              console.log(`Google Places: ${googleEvents.length} events from ${city.name}`);
            } catch (error) {
              console.error(`Google Places error for ${city.name}:`, error);
            }
          }

          // Fetch from Firecrawl sources
          if (getFirecrawlStatus().available) {
            try {
              const [bookMyShowEvents, paytmEvents, districtEvents, eventbriteEvents, ticketmasterEvents] = await Promise.allSettled([
                fetchFirecrawlBookMyShowEvents(city.name, city.lat, city.lng),
                fetchFirecrawlPaytmInsiderEvents(city.name, city.lat, city.lng),
                fetchFirecrawlDistrictEvents(city.name, city.lat, city.lng),
                fetchEventbriteEvents(city.name, city.lat, city.lng),
                fetchTicketmasterEvents(city.name, city.lat, city.lng)
              ]);

              [bookMyShowEvents, paytmEvents, districtEvents, eventbriteEvents, ticketmasterEvents].forEach((result, index) => {
                if (result.status === 'fulfilled') {
                  cityEvents.push(...result.value);
                  const sourceNames = ['BookMyShow', 'Paytm Insider', 'District', 'Eventbrite', 'Ticketmaster'];
                  console.log(`${sourceNames[index]}: ${result.value.length} events from ${city.name}`);
                }
              });
            } catch (error) {
              console.error(`Firecrawl sources error for ${city.name}:`, error);
            }
          }

          // Add enhanced location data to events
          const enhancedEvents = cityEvents.map(event => ({
            ...event,
            city: city.name,
            state: city.state || '',
            country: country,
            location: {
              ...event.location,
              city: city.name,
              state: city.state,
              country: country
            }
          }));

          console.log(`Total events for ${city.name}: ${enhancedEvents.length}`);
          return enhancedEvents;

        } catch (error) {
          console.error(`Error processing ${city.name}:`, error);
          return [];
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allEvents.push(...result.value);
        } else {
          console.error(`Batch error for ${cityBatch[index].name}:`, result.reason);
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < cities.length) {
        console.log('Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Remove duplicates
    const uniqueEvents = removeDuplicateEvents(allEvents);
    console.log(`Processing ${uniqueEvents.length} unique events from ${allEvents.length} total events`);

    // Store events in database
    if (uniqueEvents.length > 0) {
      console.log(`Storing ${uniqueEvents.length} events in database`);
      
      try {
        // Prepare events for database storage with enhanced location data
        const eventsToStore = uniqueEvents.map(event => ({
          external_id: `${event.source}-${event.id}`,
          title: event.title,
          description: event.description,
          category: event.category,
          venue: event.venue,
          city: event.city,
          state: event.location?.state || event.city || '',
          country: event.location?.country || country,
          location_lat: event.location?.latitude,
          location_lng: event.location?.longitude,
          location_name: event.location?.city || event.city,
          price: event.price,
          event_date: event.date ? new Date(event.date).toISOString().split('T')[0] : null,
          event_time: event.time,
          source: event.source,
          image_url: event.image,
          booking_url: event.bookingUrl
        }));

        // Store events using upsert to avoid duplicates
        const { error: storeError } = await supabase
          .from('events')
          .upsert(eventsToStore, { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
          });

        if (storeError) {
          console.error('Error storing events:', storeError);
        } else {
          totalEventsStored = eventsToStore.length;
          console.log(`Successfully stored ${totalEventsStored} events`);
        }
      } catch (error) {
        console.error('Error in event storage:', error);
      }
    }

    const executionTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      country: country,
      cities_processed: cities.length,
      total_events_found: allEvents.length,
      unique_events: uniqueEvents.length,
      events_stored: totalEventsStored,
      execution_time_ms: executionTime,
      firecrawl_available: getFirecrawlStatus().available,
      message: `Successfully processed ${cities.length} cities in ${country}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in country-wide fetch-events function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      events_stored: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function removeDuplicateEvents(events: UnifiedEvent[]): UnifiedEvent[] {
  const seen = new Set<string>();
  const filtered: UnifiedEvent[] = [];
  
  for (const event of events) {
    // More sophisticated deduplication
    const normalizedTitle = event.title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const key = `${normalizedTitle}_${event.category}_${event.city}_${event.date}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      filtered.push(event);
    }
  }
  
  console.log(`Removed ${events.length - filtered.length} duplicate events`);
  return filtered;
}