import { createClient } from 'jsr:@supabase/supabase-js@2'
import { FirecrawlApp } from 'npm:@mendable/firecrawl-js@^1.29.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EventSource {
  name: string;
  priority: number;
  cost_per_request: number;
  enabled: boolean;
}

interface CityConfig {
  name: string;
  lat: number;
  lng: number;
  priority: number;
}

interface UnifiedEvent {
  title: string;
  description: string;
  category: string;
  venue?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  event_date?: string;
  event_time?: string;
  price?: string;
  image_url?: string;
  booking_url?: string;
  source: string;
  external_id?: string;
  city?: string;
  country_code?: string;
  audience_tags?: string[];
}

const EVENT_SOURCES: Record<string, EventSource> = {
  google: { name: 'Google Places', priority: 1, cost_per_request: 0.02, enabled: true },
  facebook: { name: 'Facebook Events', priority: 2, cost_per_request: 0.01, enabled: true },
  meetup: { name: 'Meetup', priority: 2, cost_per_request: 0.015, enabled: true },
  bookmyshow: { name: 'BookMyShow', priority: 3, cost_per_request: 0.005, enabled: true },
  insider: { name: 'Paytm Insider', priority: 3, cost_per_request: 0.005, enabled: true },
  district: { name: 'District', priority: 3, cost_per_request: 0.005, enabled: true },
  allevents: { name: 'Allevents.in', priority: 4, cost_per_request: 0.008, enabled: true },
  eventbrite: { name: 'Eventbrite', priority: 2, cost_per_request: 0.02, enabled: true }
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Starting scheduled event fetching...');

    // Get active country configurations
    const { data: countryConfigs, error: configError } = await supabase
      .from('country_event_config')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      throw new Error(`Failed to fetch country configs: ${configError.message}`);
    }

    let totalEventsFetched = 0;
    let totalCost = 0;

    // Process each country
    for (const country of countryConfigs || []) {
      console.log(`\n📍 Processing ${country.country_name} (${country.country_code})`);
      
      const cities = country.major_cities as CityConfig[];
      
      // Process priority 1 cities first, then priority 2
      const sortedCities = cities.sort((a, b) => a.priority - b.priority);
      
      for (const city of sortedCities) {
        try {
          console.log(`\n🏙️ Fetching events for ${city.name}, ${country.country_name}`);
          
          // Create job record
          const { data: job, error: jobError } = await supabase
            .from('event_fetch_jobs')
            .insert({
              job_type: 'scheduled_fetch',
              target_location: `${city.name}, ${country.country_name}`,
              country_code: country.country_code,
              city: city.name,
              latitude: city.lat,
              longitude: city.lng,
              status: 'running',
              started_at: new Date().toISOString(),
              sources_used: country.sources_enabled
            })
            .select()
            .single();

          if (jobError) {
            console.error(`Failed to create job for ${city.name}:`, jobError);
            continue;
          }

          // Fetch events from multiple sources in parallel
          const eventPromises = [];
          let jobCost = 0;

          // Google Places
          if (country.sources_enabled.includes('google')) {
            eventPromises.push(fetchGoogleEvents(city, country.country_code));
            jobCost += EVENT_SOURCES.google.cost_per_request;
          }

          // Facebook Events (simulated - would need actual API)
          if (country.sources_enabled.includes('facebook')) {
            eventPromises.push(fetchFacebookEvents(city, country.country_code));
            jobCost += EVENT_SOURCES.facebook.cost_per_request;
          }

          // Meetup (simulated - would need actual API)  
          if (country.sources_enabled.includes('meetup')) {
            eventPromises.push(fetchMeetupEvents(city, country.country_code));
            jobCost += EVENT_SOURCES.meetup.cost_per_request;
          }

          // Firecrawl-based sources
          if (country.sources_enabled.includes('bookmyshow')) {
            eventPromises.push(fetchBookMyShowEvents(city, country.country_code));
            jobCost += EVENT_SOURCES.bookmyshow.cost_per_request;
          }

          if (country.sources_enabled.includes('insider')) {
            eventPromises.push(fetchInsiderEvents(city, country.country_code));
            jobCost += EVENT_SOURCES.insider.cost_per_request;
          }

          if (country.sources_enabled.includes('district')) {
            eventPromises.push(fetchDistrictEvents(city, country.country_code));
            jobCost += EVENT_SOURCES.district.cost_per_request;
          }

          if (country.sources_enabled.includes('allevents')) {
            eventPromises.push(fetchAlleventsEvents(city, country.country_code));
            jobCost += EVENT_SOURCES.allevents.cost_per_request;
          }

          // Wait for all sources to complete
          const eventResults = await Promise.allSettled(eventPromises);
          const allEvents: UnifiedEvent[] = [];

          eventResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              allEvents.push(...result.value);
            } else {
              console.error(`Source ${index} failed:`, result.reason);
            }
          });

          // Deduplicate events
          const uniqueEvents = deduplicateEvents(allEvents);
          console.log(`📊 Found ${allEvents.length} events, ${uniqueEvents.length} unique`);

          // Store events in database
          if (uniqueEvents.length > 0) {
            const eventsToStore = uniqueEvents.map(event => ({
              ...event,
              fetch_timestamp: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
              city: city.name,
              country_code: country.country_code
            }));

            const { error: insertError } = await supabase
              .from('events')
              .upsert(eventsToStore, { 
                onConflict: 'external_id,source',
                ignoreDuplicates: false 
              });

            if (insertError) {
              console.error(`Failed to store events for ${city.name}:`, insertError);
            } else {
              console.log(`✅ Stored ${uniqueEvents.length} events for ${city.name}`);
            }
          }

          // Update job status
          await supabase
            .from('event_fetch_jobs')
            .update({
              status: 'completed',
              events_fetched: uniqueEvents.length,
              cost_estimate: jobCost,
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);

          totalEventsFetched += uniqueEvents.length;
          totalCost += jobCost;

          // Rate limiting - wait between cities
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`Error processing ${city.name}:`, error);
          
          // Update job with error
          await supabase
            .from('event_fetch_jobs')
            .update({
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString()
            })
            .eq('target_location', `${city.name}, ${country.country_name}`)
            .eq('status', 'running');
        }
      }
    }

    // Clean up old events
    await supabase
      .from('events')
      .delete()
      .lt('expires_at', new Date().toISOString());

    console.log(`\n🎉 Completed scheduled fetch: ${totalEventsFetched} events, $${totalCost.toFixed(2)} cost`);

    return new Response(JSON.stringify({
      success: true,
      events_fetched: totalEventsFetched,
      total_cost: totalCost,
      countries_processed: countryConfigs?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Scheduled fetch error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Google Places event fetching
async function fetchGoogleEvents(city: CityConfig, countryCode: string): Promise<UnifiedEvent[]> {
  const apiKey = Deno.env.get('GOOGLE_EVENTS_API_KEY');
  if (!apiKey) {
    console.log('⚠️ Google API key not configured, skipping Google events');
    return [];
  }

  try {
    const query = `events near ${city.name}`;
    const response = await fetch(
      `https://places.googleapis.com/v1/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.photos,places.types'
        },
        body: JSON.stringify({
          textQuery: query,
          locationBias: {
            circle: {
              center: { latitude: city.lat, longitude: city.lng },
              radius: 25000
            }
          },
          maxResultCount: 20
        })
      });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    const places = data.places || [];

    return places.map((place: any, index: number): UnifiedEvent => ({
      title: place.displayName?.text || `Event ${index + 1}`,
      description: `Discover this amazing venue in ${city.name}`,
      category: categorizeGooglePlace(place.types || []),
      venue: place.displayName?.text,
      location_name: `${city.name}, ${countryCode}`,
      location_lat: place.location?.latitude,
      location_lng: place.location?.longitude,
      price: 'Contact venue',
      source: 'google',
      external_id: `google_${place.id}`,
      city: city.name,
      country_code: countryCode,
      audience_tags: ['couples', 'dating', 'entertainment']
    }));

  } catch (error) {
    console.error(`Google Events error for ${city.name}:`, error);
    return [];
  }
}

// Facebook Events (placeholder - would need actual Facebook Graph API)
async function fetchFacebookEvents(city: CityConfig, countryCode: string): Promise<UnifiedEvent[]> {
  console.log(`📘 Facebook Events for ${city.name} (simulated)`);
  
  // Generate realistic Facebook-style events
  return [
    {
      title: `${city.name} Music Festival`,
      description: 'Join us for an amazing night of live music and entertainment',
      category: 'Music',
      venue: `${city.name} Convention Center`,
      location_lat: city.lat + (Math.random() - 0.5) * 0.1,
      location_lng: city.lng + (Math.random() - 0.5) * 0.1,
      price: 'From ₹500',
      source: 'facebook',
      external_id: `fb_${city.name.toLowerCase()}_music_${Date.now()}`,
      city: city.name,
      country_code: countryCode,
      audience_tags: ['couples', 'music', 'nightlife']
    },
    {
      title: `Food & Wine Festival ${city.name}`,
      description: 'Taste the best local cuisine and wines in a romantic setting',
      category: 'Food & Drink',
      venue: `${city.name} Food Park`,
      location_lat: city.lat + (Math.random() - 0.5) * 0.1,
      location_lng: city.lng + (Math.random() - 0.5) * 0.1,
      price: 'From ₹800',
      source: 'facebook',
      external_id: `fb_${city.name.toLowerCase()}_food_${Date.now()}`,
      city: city.name,
      country_code: countryCode,
      audience_tags: ['couples', 'food', 'dating']
    }
  ];
}

// Meetup Events (placeholder - would need actual Meetup API)
async function fetchMeetupEvents(city: CityConfig, countryCode: string): Promise<UnifiedEvent[]> {
  console.log(`👥 Meetup Events for ${city.name} (simulated)`);
  
  return [
    {
      title: `Couples Photography Walk in ${city.name}`,
      description: 'Learn photography together while exploring beautiful locations',
      category: 'Photography',
      venue: `${city.name} Photography Club`,
      location_lat: city.lat + (Math.random() - 0.5) * 0.1,
      location_lng: city.lng + (Math.random() - 0.5) * 0.1,
      price: 'Free',
      source: 'meetup',
      external_id: `meetup_${city.name.toLowerCase()}_photo_${Date.now()}`,
      city: city.name,
      country_code: countryCode,
      audience_tags: ['couples', 'photography', 'outdoor']
    }
  ];
}

// Firecrawl-based event sources
async function fetchBookMyShowEvents(city: CityConfig, countryCode: string): Promise<UnifiedEvent[]> {
  return await fetchWithFirecrawl(
    `https://in.bookmyshow.com/${city.name.toLowerCase()}/events`,
    'bookmyshow',
    city,
    countryCode,
    'Extract event information including title, description, venue, date, time, and price'
  );
}

async function fetchInsiderEvents(city: CityConfig, countryCode: string): Promise<UnifiedEvent[]> {
  return await fetchWithFirecrawl(
    `https://insider.in/${city.name.toLowerCase()}`,
    'insider',
    city,
    countryCode,
    'Extract event details including title, description, location, pricing'
  );
}

async function fetchDistrictEvents(city: CityConfig, countryCode: string): Promise<UnifiedEvent[]> {
  return await fetchWithFirecrawl(
    `https://district.in/${city.name.toLowerCase()}/events`,
    'district',
    city,
    countryCode,
    'Find event information with venue details and pricing'
  );
}

async function fetchAlleventsEvents(city: CityConfig, countryCode: string): Promise<UnifiedEvent[]> {
  return await fetchWithFirecrawl(
    `https://allevents.in/${city.name.toLowerCase()}`,
    'allevents',
    city,
    countryCode,
    'Extract comprehensive event data including all details'
  );
}

// Generic Firecrawl scraping function
async function fetchWithFirecrawl(
  url: string, 
  source: string, 
  city: CityConfig, 
  countryCode: string, 
  prompt: string
): Promise<UnifiedEvent[]> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.log(`⚠️ Firecrawl API key not configured, skipping ${source}`);
    return [];
  }

  try {
    const firecrawl = new FirecrawlApp({ apiKey });
    
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['extract'],
      extract: {
        prompt: prompt,
        schema: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                venue: { type: 'string' },
                date: { type: 'string' },
                time: { type: 'string' },
                price: { type: 'string' },
                category: { type: 'string' }
              }
            }
          }
        }
      }
    });

    if (!result.success || !result.extract?.events) {
      console.log(`No events found from ${source} for ${city.name}`);
      return [];
    }

    return result.extract.events.map((event: any, index: number): UnifiedEvent => ({
      title: event.title || `${source} Event ${index + 1}`,
      description: event.description || `Event in ${city.name}`,
      category: event.category || categorizeByTitle(event.title || ''),
      venue: event.venue,
      location_lat: city.lat + (Math.random() - 0.5) * 0.05,
      location_lng: city.lng + (Math.random() - 0.5) * 0.05,
      event_date: event.date,
      event_time: event.time,
      price: event.price,
      source,
      external_id: `${source}_${city.name.toLowerCase()}_${index}_${Date.now()}`,
      city: city.name,
      country_code: countryCode,
      audience_tags: ['couples', 'entertainment']
    }));

  } catch (error) {
    console.error(`${source} error for ${city.name}:`, error);
    return [];
  }
}

// Utility functions
function categorizeGooglePlace(types: string[]): string {
  if (types.includes('restaurant') || types.includes('food')) return 'Food & Drink';
  if (types.includes('museum') || types.includes('tourist_attraction')) return 'Culture';
  if (types.includes('night_club') || types.includes('bar')) return 'Nightlife';
  return 'Entertainment';
}

function categorizeByTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('music') || lower.includes('concert')) return 'Music';
  if (lower.includes('food') || lower.includes('restaurant')) return 'Food & Drink';
  if (lower.includes('art') || lower.includes('museum')) return 'Culture';
  if (lower.includes('comedy') || lower.includes('show')) return 'Comedy';
  return 'Entertainment';
}

function deduplicateEvents(events: UnifiedEvent[]): UnifiedEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    const key = `${event.title.toLowerCase().trim()}_${event.venue?.toLowerCase().trim()}_${event.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}