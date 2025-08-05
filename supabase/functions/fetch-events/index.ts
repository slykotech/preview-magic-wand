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
        const eventbriteEvents = await fetchEventbriteEvents(latitude, longitude, radiusKm);
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

async function fetchEventbriteEvents(lat: number, lng: number, radiusKm: number): Promise<EventData[]> {
  const apiKey = Deno.env.get('EVENTBRITE_API_KEY');
  if (!apiKey) {
    console.log('Eventbrite API key not configured');
    return [];
  }

  // Updated Eventbrite API endpoint with correct parameters
  const url = `https://www.eventbriteapi.com/v3/events/search/?location.latitude=${lat}&location.longitude=${lng}&location.within=${radiusKm}km&start_date.range_start=${new Date().toISOString()}&expand=venue,organizer,category&sort_by=date&page_size=50&status=live`;
  
  console.log(`Fetching from Eventbrite: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Eventbrite API error ${response.status}: ${errorText}`);
      throw new Error(`Eventbrite API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Eventbrite response: ${JSON.stringify(data)}`);
    
    if (!data.events || data.events.length === 0) {
      console.log('No events found in Eventbrite response');
      return [];
    }
    
    return data.events?.map((event: any) => ({
      title: event.name?.text || 'Untitled Event',
      description: event.description?.text || event.summary,
      start_date: event.start?.utc,
      end_date: event.end?.utc,
      location_name: event.venue?.name || event.venue?.address?.localized_address_display,
      latitude: event.venue?.latitude ? parseFloat(event.venue.latitude) : null,
      longitude: event.venue?.longitude ? parseFloat(event.venue.longitude) : null,
      price: event.is_free ? 'Free' : (event.ticket_availability?.minimum_ticket_price?.display || 'Paid'),
      organizer: event.organizer?.name,
      category: event.category?.name,
      website_url: event.url,
      image_url: event.logo?.url,
      source: 'eventbrite',
      external_id: event.id.toString()
    })).filter(event => event.latitude && event.longitude) || [];
  } catch (error) {
    console.error('Eventbrite fetch error:', error);
    throw error;
  }
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
  // This would use the existing PuppeteerBrowserService for web scraping
  // For now, return empty array - implement this when we have specific local sources
  console.log('Web scraping not yet implemented');
  return [];
}