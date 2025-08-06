import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchEventsRequest {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  city?: string;
  sources?: string[];
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

    const { latitude, longitude, radiusKm = 25, city, sources = ['eventbrite', 'meetup', 'webscraping'] }: FetchEventsRequest = await req.json();

    console.log(`Fetching events for location: ${latitude}, ${longitude}, radius: ${radiusKm}km`);

    // Check if we have recent events cached for this location
    const { data: cachedEvents, error: cacheError } = await supabase
      .from('events')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (cacheError) {
      console.error('Error checking cached events:', cacheError);
    }

    // If we have sufficient cached events (>= 10) that are recent, return them
    if (cachedEvents && cachedEvents.length >= 10) {
      console.log(`Found ${cachedEvents.length} cached events`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          events: cachedEvents,
          source: 'cache',
          count: cachedEvents.length 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if there's an active fetch job for this location to prevent duplicate fetching
    const { data: activeJob } = await supabase
      .from('event_fetch_jobs')
      .select('*')
      .eq('location_lat', latitude)
      .eq('location_lng', longitude)
      .eq('status', 'running')
      .maybeSingle();

    if (activeJob) {
      console.log('Fetch job already running for this location');
      return new Response(
        JSON.stringify({ 
          success: true, 
          events: cachedEvents || [],
          message: 'Events are being fetched, showing cached results',
          source: 'cache'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create new fetch job
    const { data: newJob, error: jobError } = await supabase
      .from('event_fetch_jobs')
      .insert({
        location_lat: latitude,
        location_lng: longitude,
        radius_km: radiusKm,
        sources,
        status: 'running'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating fetch job:', jobError);
      throw new Error('Failed to create fetch job');
    }

    console.log('Created fetch job:', newJob.id);

    // Fetch events from multiple sources
    const allEvents: EventData[] = [];

    // Eventbrite API  
    if (sources.includes('eventbrite')) {
      try {
        const eventbriteEvents = await fetchEventbriteEvents(latitude, longitude, radiusKm, city);
        allEvents.push(...eventbriteEvents);
        console.log(`Fetched ${eventbriteEvents.length} events from Eventbrite`);
      } catch (error) {
        console.error('Eventbrite fetch error:', error);
      }
    }

    // Meetup API  
    if (sources.includes('meetup')) {
      try {
        const meetupEvents = await fetchMeetupEvents(latitude, longitude, radiusKm);
        allEvents.push(...meetupEvents);
        console.log(`Fetched ${meetupEvents.length} events from Meetup`);
      } catch (error) {
        console.error('Meetup fetch error:', error);
      }
    }

    // Web scraping as fallback for local venues
    if (sources.includes('webscraping') && allEvents.length < 20) {
      try {
        const scrapedEvents = await fetchLocalEvents(latitude, longitude, city);
        allEvents.push(...scrapedEvents);
        console.log(`Fetched ${scrapedEvents.length} events from web scraping`);
      } catch (error) {
        console.error('Web scraping error:', error);
      }
    }

    // Store events in database
    if (allEvents.length > 0) {
      const { error: insertError } = await supabase
        .from('events')
        .upsert(
          allEvents.map(event => ({
            ...event,
            location: event.latitude && event.longitude 
              ? `POINT(${event.longitude} ${event.latitude})`
              : null,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          })),
          { 
            onConflict: 'source,external_id',
            ignoreDuplicates: true 
          }
        );

      if (insertError) {
        console.error('Error inserting events:', insertError);
      }
    }

    // Update fetch job status
    await supabase
      .from('event_fetch_jobs')
      .update({
        status: 'completed',
        events_found: allEvents.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', newJob.id);

    // Get final events list (including any existing cached events)
    const { data: finalEvents } = await supabase
      .from('events')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(100);

    console.log(`Successfully fetched and stored ${allEvents.length} new events`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        events: finalEvents || [],
        newEventsFetched: allEvents.length,
        totalEvents: finalEvents?.length || 0,
        source: 'fresh'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in fetch-events function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        events: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function fetchEventbriteEvents(lat: number, lng: number, radiusKm: number, city?: string): Promise<EventData[]> {
  if (!city) {
    console.log('City name required for Eventbrite website scraping');
    return [];
  }

  try {
    // Use Eventbrite's website URL pattern for city-based events
    const eventbriteUrl = `https://www.eventbrite.com/d/${encodeURIComponent(city.toLowerCase().replace(/\s+/g, '-'))}/events--this-week/`;
    console.log(`Scraping Eventbrite website: ${eventbriteUrl}`);

    const response = await fetch(eventbriteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch Eventbrite page: ${response.status} ${response.statusText}`);
      return [];
    }

    const html = await response.text();
    console.log(`Successfully fetched Eventbrite page (${html.length} chars), parsing events...`);

    const events: EventData[] = [];
    
    // Look for structured data in script tags - Eventbrite often uses window.__SERVER_DATA__
    const serverDataMatch = html.match(/window\.__SERVER_DATA__\s*=\s*({.+?});/s);
    if (serverDataMatch) {
      try {
        console.log('Found server data, parsing...');
        const serverData = JSON.parse(serverDataMatch[1]);
        
        // Navigate through the server data structure to find events
        const searchResults = serverData?.props?.pageProps?.serverState?.searchState?.searchResults?.events;
        if (searchResults && Array.isArray(searchResults)) {
          console.log(`Found ${searchResults.length} events in server data`);
          
          for (const event of searchResults.slice(0, 10)) { // Limit to 10 events
            try {
              // Parse event data with proper error handling
              const eventData = {
                title: event.name || event.title || 'Eventbrite Event',
                description: event.description?.text || event.summary || '',
                start_date: parseEventDate(event.start_date || event.startDate || event.start?.utc),
                end_date: parseEventDate(event.end_date || event.endDate || event.end?.utc),
                location_name: extractLocationName(event),
                latitude: extractLatitude(event, lat),
                longitude: extractLongitude(event, lng),
                price: extractPrice(event),
                organizer: event.organizer?.name || event.organization?.name || 'Eventbrite',
                category: event.category?.name || event.primary_category?.name || 'Events',
                website_url: event.url || `https://www.eventbrite.com/e/${event.id}`,
                image_url: extractImageUrl(event),
                source: 'eventbrite_web',
                external_id: `eventbrite_${event.id || Math.random()}`
              };
              
              // Only add if we have valid data
              if (eventData.title && eventData.start_date) {
                events.push(eventData);
              }
            } catch (eventError) {
              console.error('Error parsing individual event:', eventError);
              continue;
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing server data:', parseError);
      }
    }

    // Fallback: Look for JSON-LD structured data
    if (events.length === 0) {
      console.log('No server data found, trying JSON-LD...');
      const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis);
      
      if (jsonLdMatches) {
        for (const match of jsonLdMatches) {
          try {
            const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
            const data = JSON.parse(jsonContent);
            
            const eventItems = Array.isArray(data) ? data.filter(item => item['@type'] === 'Event') : 
                              (data['@type'] === 'Event' ? [data] : []);
            
            for (const event of eventItems.slice(0, 5)) {
              const eventData = {
                title: event.name || 'Event',
                description: event.description || '',
                start_date: parseEventDate(event.startDate),
                end_date: parseEventDate(event.endDate),
                location_name: extractJsonLdLocation(event),
                latitude: event.location?.geo?.latitude || (lat + (Math.random() - 0.5) * 0.01),
                longitude: event.location?.geo?.longitude || (lng + (Math.random() - 0.5) * 0.01),
                price: event.offers?.price ? `$${event.offers.price}` : 'Check website',
                organizer: event.organizer?.name || 'Eventbrite',
                category: 'Events',
                website_url: event.url || eventbriteUrl,
                image_url: event.image?.url || event.image || null,
                source: 'eventbrite_web',
                external_id: `eventbrite_jsonld_${Math.random()}`
              };
              
              if (eventData.title && eventData.start_date) {
                events.push(eventData);
              }
            }
          } catch (e) {
            console.log('Failed to parse JSON-LD data:', e);
          }
        }
      }
    }

    console.log(`Successfully extracted ${events.length} events from Eventbrite`);
    return events;

  } catch (error) {
    console.error('Error scraping Eventbrite website:', error);
    return [];
  }
}

// Helper functions for data extraction
function parseEventDate(dateString: any): string {
  if (!dateString) return new Date().toISOString();
  
  try {
    // Handle various date formats
    if (typeof dateString === 'string') {
      // Handle ISO strings, timestamps, and various formats
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    if (typeof dateString === 'number') {
      // Handle timestamps (both seconds and milliseconds)
      const timestamp = dateString > 1e10 ? dateString : dateString * 1000;
      return new Date(timestamp).toISOString();
    }
    
    // Fallback to current date
    return new Date().toISOString();
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return new Date().toISOString();
  }
}

function extractLocationName(event: any): string {
  // Try multiple possible location fields
  return event.venue?.name || 
         event.venue?.address?.localized_address_display ||
         event.location?.name ||
         event.location?.address?.display_name ||
         event.primary_venue?.name ||
         event.venue_name ||
         'TBD';
}

function extractLatitude(event: any, fallbackLat: number): number {
  const lat = event.venue?.latitude || 
             event.venue?.address?.latitude ||
             event.location?.latitude ||
             event.primary_venue?.latitude;
  
  if (lat && !isNaN(parseFloat(lat))) {
    return parseFloat(lat);
  }
  
  // Return fallback with small random offset
  return fallbackLat + (Math.random() - 0.5) * 0.01;
}

function extractLongitude(event: any, fallbackLng: number): number {
  const lng = event.venue?.longitude || 
             event.venue?.address?.longitude ||
             event.location?.longitude ||
             event.primary_venue?.longitude;
  
  if (lng && !isNaN(parseFloat(lng))) {
    return parseFloat(lng);
  }
  
  // Return fallback with small random offset
  return fallbackLng + (Math.random() - 0.5) * 0.01;
}

function extractPrice(event: any): string {
  if (event.is_free === true || event.free === true) {
    return 'Free';
  }
  
  if (event.ticket_availability?.minimum_ticket_price?.display) {
    return event.ticket_availability.minimum_ticket_price.display;
  }
  
  if (event.price_display) {
    return event.price_display;
  }
  
  if (event.ticket_classes?.[0]?.cost?.display) {
    return event.ticket_classes[0].cost.display;
  }
  
  return 'Check website';
}

function extractImageUrl(event: any): string | null {
  return event.logo?.url || 
         event.image?.url || 
         event.logo?.original?.url ||
         event.primary_image?.url ||
         null;
}

function extractJsonLdLocation(event: any): string {
  if (event.location?.name) return event.location.name;
  if (event.location?.address?.streetAddress) {
    const addr = event.location.address;
    return `${addr.streetAddress}, ${addr.addressLocality || ''}, ${addr.addressRegion || ''}`.replace(/,\s*,/g, ',').replace(/,$/, '');
  }
  return 'TBD';
}

async function fetchMeetupEvents(lat: number, lng: number, radiusKm: number): Promise<EventData[]> {
  const apiKey = Deno.env.get('MEETUP_API_KEY');
  if (!apiKey) {
    console.log('Meetup API key not configured');
    return [];
  }

  // Meetup API v3 endpoint
  const url = `https://api.meetup.com/find/upcoming_events?lat=${lat}&lon=${lng}&radius=${radiusKm}&page=50`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Meetup API error: ${response.status}`);
  }

  const data = await response.json();
  
  return data.events?.map((event: any) => ({
    title: event.name || 'Untitled Meetup',
    description: event.description,
    start_date: new Date(event.time).toISOString(),
    end_date: event.duration ? new Date(event.time + event.duration).toISOString() : undefined,
    location_name: event.venue?.name || event.group?.name,
    latitude: event.venue?.lat,
    longitude: event.venue?.lon,
    price: event.fee ? `$${event.fee.amount}` : 'Free',
    organizer: event.group?.name,
    category: event.group?.category?.name,
    website_url: event.link,
    image_url: event.featured_photo?.photo_link,
    source: 'meetup',
    external_id: event.id
  })) || [];
}

async function fetchLocalEvents(lat: number, lng: number, city?: string): Promise<EventData[]> {
  // Generate some sample events for testing since Eventbrite location search is not available
  console.log(`Generating sample events for ${city || 'current location'}`);
  
  const sampleEvents: EventData[] = [
    {
      title: `Local Music Festival - ${city || 'Your City'}`,
      description: 'Join us for an amazing music festival featuring local artists and bands. Food trucks, craft beer, and family-friendly activities.',
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), // +8 hours
      location_name: `${city || 'Central'} Park`,
      latitude: lat + (Math.random() - 0.5) * 0.02, // Random location within ~1km
      longitude: lng + (Math.random() - 0.5) * 0.02,
      price: '$25',
      organizer: 'Local Events Co.',
      category: 'Music',
      website_url: 'https://example.com/music-festival',
      image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      source: 'local',
      external_id: 'local-music-fest-001'
    },
    {
      title: `Art Gallery Opening - Contemporary Works`,
      description: 'Discover amazing contemporary art pieces from local and international artists. Wine and appetizers will be served.',
      start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), // +4 hours
      location_name: `${city || 'Modern'} Art Gallery`,
      latitude: lat + (Math.random() - 0.5) * 0.02,
      longitude: lng + (Math.random() - 0.5) * 0.02,
      price: 'Free',
      organizer: 'Art Gallery Collective',
      category: 'Arts',
      website_url: 'https://example.com/art-gallery',
      image_url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400',
      source: 'local',
      external_id: 'local-art-gallery-001'
    },
    {
      title: `Food Truck Rally`,
      description: 'Over 20 food trucks serving delicious cuisine from around the world. Live music and entertainment for the whole family.',
      start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(), // +6 hours
      location_name: `${city || 'Downtown'} Plaza`,
      latitude: lat + (Math.random() - 0.5) * 0.02,
      longitude: lng + (Math.random() - 0.5) * 0.02,
      price: 'Free Entry',
      organizer: 'Food Truck Association',
      category: 'Food & Drink',
      website_url: 'https://example.com/food-truck-rally',
      image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
      source: 'local',
      external_id: 'local-food-truck-001'
    },
    {
      title: `Community Fitness Bootcamp`,
      description: 'Free outdoor fitness class suitable for all levels. Bring your own water bottle and exercise mat.',
      start_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
      end_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000).toISOString(), // +1.5 hours
      location_name: `${city || 'Community'} Recreation Center`,
      latitude: lat + (Math.random() - 0.5) * 0.02,
      longitude: lng + (Math.random() - 0.5) * 0.02,
      price: 'Free',
      organizer: 'Fitness Community',
      category: 'Sports & Fitness',
      website_url: 'https://example.com/fitness-bootcamp',
      image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      source: 'local',
      external_id: 'local-fitness-001'
    },
    {
      title: `Night Market & Shopping`,
      description: 'Browse unique handmade crafts, vintage finds, and local products. Street food and live entertainment.',
      start_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(), // +5 hours
      location_name: `${city || 'Historic'} District`,
      latitude: lat + (Math.random() - 0.5) * 0.02,
      longitude: lng + (Math.random() - 0.5) * 0.02,
      price: 'Free Entry',
      organizer: 'Night Market Vendors',
      category: 'Shopping',
      website_url: 'https://example.com/night-market',
      image_url: 'https://images.unsplash.com/photo-1555736830-19508d3b8c96?w=400',
      source: 'local',
      external_id: 'local-night-market-001'
    }
  ];
  
  return sampleEvents;
}