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

    const { latitude, longitude, radiusKm = 25, city, sources = ['eventbrite', 'meetup'] }: FetchEventsRequest = await req.json();

    console.log(`Fetching events for location: ${latitude}, ${longitude}, radius: ${radiusKm}km, city: ${city}`);

    // Check if we have recent events cached for this specific location
    const { data: allCachedEvents, error: cacheError } = await supabase
      .from('events')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Events from last 24 hours
      .order('created_at', { ascending: false });

    if (cacheError) {
      console.error('Error checking cached events:', cacheError);
    }

    // Filter cached events by location proximity
    const nearbyEvents = allCachedEvents?.filter(event => {
      if (!event.latitude || !event.longitude) return false;
      const distance = calculateDistance(latitude, longitude, event.latitude, event.longitude);
      return distance <= radiusKm;
    }) || [];

    console.log(`Found ${nearbyEvents.length} cached events within ${radiusKm}km of requested location`);

    // If we have sufficient recent events for this location, return them
    // But lower the threshold to 5 events to be more responsive
    if (nearbyEvents.length >= 5) {
      console.log(`Returning ${nearbyEvents.length} cached events for location`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          events: nearbyEvents.slice(0, 50),
          source: 'cache',
          count: nearbyEvents.length 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Insufficient cached events (${nearbyEvents.length}), fetching fresh events for location`);

    // Only check for active jobs if we already have some events (to prevent duplicate refresh)
    // Skip job check when no events exist to allow immediate fetching
    if (nearbyEvents.length > 0) {
      const { data: activeJob } = await supabase
        .from('event_fetch_jobs')
        .select('*')
        .eq('location_lat', latitude)
        .eq('location_lng', longitude)
        .eq('status', 'running')
        .maybeSingle();

      if (activeJob) {
        console.log('Fetch job already running for this location, returning existing events');
        return new Response(
          JSON.stringify({ 
            success: true, 
            events: nearbyEvents,
            message: 'Events are being refreshed, showing current results',
            source: 'cache'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
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

    // Only use sample events if NO real events were found from any source
    if (sources.includes('webscraping') && allEvents.length === 0) {
      try {
        console.log('No real events found, falling back to sample events');
        const scrapedEvents = await fetchLocalEvents(latitude, longitude, city);
        allEvents.push(...scrapedEvents);
        console.log(`Generated ${scrapedEvents.length} sample events as fallback`);
      } catch (error) {
        console.error('Sample events generation error:', error);
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

    // Get final events list filtered by location proximity
    const { data: allFinalEvents } = await supabase
      .from('events')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(200);

    // Filter by location proximity and prioritize recent events
    const finalEvents = allFinalEvents?.filter(event => {
      if (!event.latitude || !event.longitude) return false;
      const distance = calculateDistance(latitude, longitude, event.latitude, event.longitude);
      return distance <= radiusKm + 10; // Allow slightly larger radius for final results
    }).slice(0, 50) || [];

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

// Calculate distance between two coordinates using Haversine formula
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
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
    const seenIds = new Set<string>(); // Track unique events to avoid duplicates
    
    // Strategy 1: Look for the most common Eventbrite data pattern - __NEXT_DATA__
    const nextDataRegex = /window\.__NEXT_DATA__\s*=\s*({.+?});/s;
    const nextDataMatch = html.match(nextDataRegex);
    
    if (nextDataMatch) {
      try {
        console.log('Found __NEXT_DATA__, parsing...');
        const nextData = JSON.parse(nextDataMatch[1]);
        
        // Common paths where events are stored in Eventbrite's Next.js data
        const eventPaths = [
          nextData?.props?.pageProps?.searchResults?.events,
          nextData?.props?.pageProps?.initialSearchState?.results?.events,
          nextData?.props?.pageProps?.data?.events,
          nextData?.props?.pageProps?.events,
          nextData?.query?.events
        ];
        
        for (const eventList of eventPaths) {
          if (Array.isArray(eventList) && eventList.length > 0) {
            console.log(`Found ${eventList.length} events in Next.js data`);
            
            for (const event of eventList.slice(0, 20)) {
              try {
                const eventId = event.id || event.objectId || `eb_${Math.random()}`;
                if (seenIds.has(eventId)) continue;
                seenIds.add(eventId);
                
                const venue = event.venue || event.primary_venue || {};
                const eventData: EventData = {
                  title: event.name || event.title || 'Event',
                  description: event.description?.text || event.description || event.summary || '',
                  start_date: parseEventDate(event.start_date || event.startDate || event.start?.utc || event.start?.local),
                  end_date: parseEventDate(event.end_date || event.endDate || event.end?.utc || event.end?.local),
                  location_name: venue.name || venue.display_name || venue.address?.localized_address_display || 'TBD',
                  latitude: parseFloat(venue.latitude || venue.lat || lat.toString()),
                  longitude: parseFloat(venue.longitude || venue.lng || lng.toString()),
                  price: extractPrice(event),
                  organizer: event.organizer?.name || 'Eventbrite',
                  category: event.category?.name || event.primary_category?.name || 'Events',
                  website_url: event.url || `https://www.eventbrite.com/e/${eventId}`,
                  image_url: extractImageUrl(event),
                  source: 'eventbrite',
                  external_id: `eventbrite_${eventId}`
                };
                
                if (eventData.title && eventData.start_date) {
                  events.push(eventData);
                  console.log(`Added event: ${eventData.title} at ${eventData.location_name}`);
                }
              } catch (e) {
                console.log('Error parsing individual event:', e);
              }
            }
            break; // Found events, no need to check other paths
          }
        }
      } catch (e) {
        console.log('Error parsing __NEXT_DATA__:', e);
      }
    }
    
    // Strategy 2: Look for event cards in HTML structure
    if (events.length === 0) {
      console.log('No Next.js data found, trying HTML parsing...');
      
      // Look for common Eventbrite event card patterns
      const eventCardRegex = /<article[^>]*data-testid="event-card"[^>]*>.*?<\/article>/gis;
      const cardMatches = html.match(eventCardRegex);
      
      if (cardMatches) {
        console.log(`Found ${cardMatches.length} event cards in HTML`);
        
        for (const cardHtml of cardMatches.slice(0, 15)) {
          try {
            // Extract event details from card HTML
            const titleMatch = cardHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
            const linkMatch = cardHtml.match(/href="([^"]*\/e\/[^"]*)"/) || cardHtml.match(/href="([^"]*event[^"]*)"/) ;
            const timeMatch = cardHtml.match(/time[^>]*datetime="([^"]*)"/) || cardHtml.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
            const venueMatch = cardHtml.match(/venue[^>]*>([^<]+)</i) || cardHtml.match(/location[^>]*>([^<]+)</i);
            
            if (titleMatch && titleMatch[1]) {
              const eventId = linkMatch?.[1]?.split('/').pop() || `card_${Math.random()}`;
              if (seenIds.has(eventId)) continue;
              seenIds.add(eventId);
              
              const eventData: EventData = {
                title: titleMatch[1].trim(),
                description: '',
                start_date: parseEventDate(timeMatch?.[1] || new Date().toISOString()),
                end_date: undefined,
                location_name: venueMatch?.[1]?.trim() || 'Venue TBD',
                latitude: lat + (Math.random() - 0.5) * 0.02,
                longitude: lng + (Math.random() - 0.5) * 0.02,
                price: 'Check website',
                organizer: 'Eventbrite',
                category: 'Events',
                website_url: linkMatch?.[1] ? `https://www.eventbrite.com${linkMatch[1]}` : eventbriteUrl,
                image_url: null,
                source: 'eventbrite',
                external_id: `eventbrite_${eventId}`
              };
              
              if (eventData.title && eventData.start_date) {
                events.push(eventData);
                console.log(`Extracted from HTML: ${eventData.title}`);
              }
            }
          } catch (e) {
            console.log('Error parsing event card:', e);
          }
        }
      }
    }

    // Strategy 3: Look for __SERVER_DATA__ (fallback)
    if (events.length === 0) {
      console.log('No HTML cards found, trying __SERVER_DATA__...');
      const serverDataMatch = html.match(/window\.__SERVER_DATA__\s*=\s*({.+?});/s);
      if (serverDataMatch) {
        try {
          const serverData = JSON.parse(serverDataMatch[1]);
          const searchResults = serverData?.props?.pageProps?.serverState?.searchState?.searchResults?.events;
          
          if (searchResults && Array.isArray(searchResults)) {
            console.log(`Found ${searchResults.length} events in server data`);
            
            for (const event of searchResults.slice(0, 15)) {
              const eventId = event.id || `server_${Math.random()}`;
              if (seenIds.has(eventId)) continue;
              seenIds.add(eventId);
              
              const venue = event.venue || event.primary_venue;
              const eventData: EventData = {
                title: event.name || 'Eventbrite Event',
                description: event.description?.text || '',
                start_date: parseEventDate(event.start_date || event.start?.utc),
                end_date: parseEventDate(event.end_date || event.end?.utc),
                location_name: venue?.name || venue?.display_name || 'Venue TBD',
                latitude: parseFloat(venue?.latitude || lat.toString()),
                longitude: parseFloat(venue?.longitude || lng.toString()),
                price: extractPrice(event),
                organizer: event.organizer?.name || 'Eventbrite',
                category: event.category?.name || 'Events',
                website_url: event.url || `https://www.eventbrite.com/e/${eventId}`,
                image_url: extractImageUrl(event),
                source: 'eventbrite',
                external_id: `eventbrite_${eventId}`
              };
              
              if (eventData.title && eventData.start_date) {
                events.push(eventData);
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing server data:', parseError);
        }
      }
    }

    // Final fallback: JSON-LD structured data
    if (events.length === 0) {
      console.log('No structured data found, trying JSON-LD...');
      const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis);
      
      if (jsonLdMatches) {
        for (const match of jsonLdMatches) {
          try {
            const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
            const data = JSON.parse(jsonContent);
            
            const eventItems = Array.isArray(data) ? data.filter(item => item['@type'] === 'Event') : 
                              (data['@type'] === 'Event' ? [data] : []);
            
            for (const event of eventItems.slice(0, 10)) {
              const eventId = `jsonld_${Math.random()}`;
              if (seenIds.has(eventId)) continue;
              seenIds.add(eventId);
              
              const eventData: EventData = {
                title: event.name || 'Event',
                description: event.description || '',
                start_date: parseEventDate(event.startDate),
                end_date: parseEventDate(event.endDate),
                location_name: extractJsonLdLocation(event),
                latitude: event.location?.geo?.latitude || lat,
                longitude: event.location?.geo?.longitude || lng,
                price: event.offers?.price ? `$${event.offers.price}` : 'Check website',
                organizer: event.organizer?.name || 'Eventbrite',
                category: 'Events',
                website_url: event.url || eventbriteUrl,
                image_url: event.image?.url || event.image || null,
                source: 'eventbrite',
                external_id: eventId
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

    console.log(`Successfully extracted ${events.length} unique events from Eventbrite`);
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