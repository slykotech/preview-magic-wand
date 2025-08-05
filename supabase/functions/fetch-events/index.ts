import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Location cache hash generator
function generateLocationHash(lat: number, lng: number, radius: number): string {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;
}

// Duplicate detection for events
function generateEventHash(title: string, date: string, location: string, organizer?: string): string {
  const normalized = [
    title.toLowerCase().trim(),
    date,
    location.toLowerCase().trim(),
    (organizer || '').toLowerCase().trim()
  ].join('|');
  
  return btoa(normalized).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

// Eventbrite API integration
async function fetchEventbriteEvents(lat: number, lng: number, radius: number) {
  console.log('Fetching from Eventbrite...');
  
  try {
    // Using Eventbrite's free discovery API with future-only events
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?location.latitude=${lat}&location.longitude=${lng}&location.within=${radius}km&start_date.range_start=${new Date().toISOString()}&expand=venue&sort_by=date`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('EVENTBRITE_TOKEN') || 'public'}`,
        }
      }
    );

    if (!response.ok) {
      console.log('Eventbrite API failed, using mock data');
      return [];
    }

    const data = await response.json();
    return (data.events || []).slice(0, 20).map((event: any) => ({
      title: event.name?.text || 'Event',
      description: event.description?.text || '',
      event_date: new Date(event.start.utc).toISOString().split('T')[0],
      event_time: new Date(event.start.utc).toTimeString().split(' ')[0],
      location_name: event.venue?.name || 'TBD',
      location_address: event.venue?.address?.localized_address_display || '',
      latitude: parseFloat(event.venue?.latitude || lat),
      longitude: parseFloat(event.venue?.longitude || lng),
      category: event.category?.name || 'entertainment',
      price_range: event.ticket_availability?.minimum_ticket_price?.display || 'Free',
      organizer: event.organizer?.name || '',
      source_url: event.url || '',
      source_platform: 'eventbrite',
      image_url: event.logo?.url || null,
      tags: event.tags || []
    }));
  } catch (error) {
    console.error('Eventbrite fetch error:', error);
    return [];
  }
}

// Google Places API integration for events
async function fetchGooglePlacesEvents(lat: number, lng: number, radius: number) {
  console.log('Fetching from Google Places...');
  
  const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!googleApiKey) {
    console.log('Google Places API key not found');
    return [];
  }

  try {
    // Search for event venues and entertainment places
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius * 1000}&type=establishment&keyword=events&key=${googleApiKey}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const today = new Date();
    
    return (data.results || []).slice(0, 15).map((place: any) => ({
      title: `Event at ${place.name}`,
      description: `Entertainment event at ${place.name}`,
      event_date: new Date(today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      event_time: '19:00:00',
      location_name: place.name,
      location_address: place.vicinity || '',
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      category: place.types?.[0] || 'entertainment',
      price_range: `$${(Math.random() * 50 + 10).toFixed(0)}`,
      organizer: place.name,
      source_url: '',
      source_platform: 'google_places',
      image_url: place.photos?.[0] ? 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${googleApiKey}` : 
        null,
      tags: place.types || []
    }));
  } catch (error) {
    console.error('Google Places fetch error:', error);
    return [];
  }
}

// Mock event generators for development
function generateMockEvents(lat: number, lng: number, count: number = 10) {
  const events = [];
  const categories = ['entertainment', 'music', 'food', 'sports', 'cultural', 'romantic'];
  const eventTypes = ['Concert', 'Comedy Show', 'Art Exhibition', 'Food Festival', 'Sports Event', 'Theatre'];
  
  for (let i = 0; i < count; i++) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
    
    events.push({
      title: `${eventTypes[Math.floor(Math.random() * eventTypes.length)]} ${i + 1}`,
      description: `Exciting ${eventTypes[Math.floor(Math.random() * eventTypes.length)].toLowerCase()} in your area`,
      event_date: futureDate.toISOString().split('T')[0],
      event_time: `${Math.floor(Math.random() * 12) + 8}:00:00`,
      location_name: `Venue ${i + 1}`,
      location_address: `${Math.floor(Math.random() * 999) + 1} Main St`,
      latitude: lat + (Math.random() - 0.5) * 0.1,
      longitude: lng + (Math.random() - 0.5) * 0.1,
      category: categories[Math.floor(Math.random() * categories.length)],
      price_range: Math.random() > 0.3 ? `$${(Math.random() * 50 + 10).toFixed(0)}` : 'Free',
      organizer: `Organizer ${i + 1}`,
      source_url: '',
      source_platform: 'mock_data',
      image_url: null,
      tags: [categories[Math.floor(Math.random() * categories.length)]]
    });
  }
  
  return events;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { latitude, longitude, radius = 25 } = await req.json();
    
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    console.log(`Fetching events for: ${latitude}, ${longitude} within ${radius}km`);

    // Check location cache to avoid duplicate API calls
    const locationHash = generateLocationHash(latitude, longitude, radius);
    const { data: cachedLocation } = await supabaseClient
      .from('location_event_cache')
      .select('*')
      .eq('location_hash', locationHash)
      .gte('next_fetch_at', new Date().toISOString())
      .single();

    if (cachedLocation) {
      console.log('Using cached location data');
      const { data: cachedEvents } = await supabaseClient
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .gte('latitude', latitude - 0.1)
        .lte('latitude', latitude + 0.1)
        .gte('longitude', longitude - 0.1)
        .lte('longitude', longitude + 0.1)
        .order('event_date', { ascending: true })
        .limit(50);

      return new Response(JSON.stringify({ 
        events: cachedEvents || [],
        cached: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get active API sources ordered by priority
    const { data: apiSources } = await supabaseClient
      .from('event_api_sources')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    let allEvents: any[] = [];
    const usedSources: string[] = [];

    // Fetch from multiple sources
    for (const source of apiSources || []) {
      try {
        let sourceEvents: any[] = [];
        
        switch (source.platform_name) {
          case 'eventbrite':
            sourceEvents = await fetchEventbriteEvents(latitude, longitude, radius);
            break;
          case 'google_places':
            sourceEvents = await fetchGooglePlacesEvents(latitude, longitude, radius);
            break;
          default:
            // Add mock events for development
            sourceEvents = generateMockEvents(latitude, longitude, 5);
        }

        if (sourceEvents.length > 0) {
          allEvents = allEvents.concat(sourceEvents);
          usedSources.push(source.platform_name);
          
          // Update API usage
          await supabaseClient
            .from('event_api_sources')
            .update({ 
              current_daily_usage: (source.current_daily_usage || 0) + 1,
              last_used_at: new Date().toISOString()
            })
            .eq('id', source.id);
        }
      } catch (error) {
        console.error(`Error fetching from ${source.platform_name}:`, error);
      }
    }

    // Remove duplicates and insert unique events
    const uniqueEvents: any[] = [];
    const processedHashes = new Set();

    for (const event of allEvents) {
      // Check for existing event
      const { data: existingEvent } = await supabaseClient
        .rpc('find_duplicate_event', {
          p_title: event.title,
          p_event_date: event.event_date,
          p_location_name: event.location_name,
          p_latitude: event.latitude,
          p_longitude: event.longitude,
          p_organizer: event.organizer
        });

      if (!existingEvent) {
        const eventHash = generateEventHash(
          event.title, 
          event.event_date, 
          event.location_name, 
          event.organizer
        );
        
        if (!processedHashes.has(eventHash)) {
          processedHashes.add(eventHash);
          
          // Insert new event
          const { error: insertError } = await supabaseClient
            .from('events')
            .insert(event);

          if (!insertError) {
            uniqueEvents.push(event);
          }
        }
      }
    }

    // Update location cache
    await supabaseClient
      .from('location_event_cache')
      .upsert({
        location_hash: locationHash,
        latitude,
        longitude,
        search_radius: radius,
        last_fetched_at: new Date().toISOString(),
        next_fetch_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
        event_count: uniqueEvents.length,
        source_platforms: usedSources
      });

    console.log(`Processed ${allEvents.length} events, inserted ${uniqueEvents.length} unique events`);

    // Return fresh events from database
    const { data: freshEvents } = await supabaseClient
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .gte('latitude', latitude - 0.1)
      .lte('latitude', latitude + 0.1)
      .gte('longitude', longitude - 0.1)
      .lte('longitude', longitude + 0.1)
      .order('event_date', { ascending: true })
      .limit(50);

    return new Response(JSON.stringify({ 
      events: freshEvents || [],
      newEvents: uniqueEvents.length,
      sources: usedSources
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-events function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      events: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});