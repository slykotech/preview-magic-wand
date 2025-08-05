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

// Mock data generation removed - using real events only

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

    // Fetch events directly from the database instead of external APIs
    // Events are now populated by the master scraper every 4 hours
    console.log(`Fetching events from database for location: ${latitude}, ${longitude} with radius: ${radius}km`);
    
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString().split('T')[0]) // Only future events
      .order('event_date', { ascending: true })
      .limit(100);
    
    if (eventsError) {
      console.error('Error fetching events from database:', eventsError);
      throw new Error('Failed to fetch events from database');
    }
    
    // Filter events by location if coordinates are provided
    let filteredEvents = events || [];
    if (latitude && longitude && radius) {
      filteredEvents = (events || []).filter(event => {
        if (!event.latitude || !event.longitude) return true; // Include events without coordinates
        
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in kilometers
        const dLat = (event.latitude - latitude) * Math.PI / 180;
        const dLng = (event.longitude - longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(latitude * Math.PI / 180) * Math.cos(event.latitude * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance <= radius;
      });
    }
    
    console.log(`Found ${filteredEvents.length} events in database within ${radius}km radius`);
    
    return new Response(JSON.stringify({ 
      events: filteredEvents,
      source: 'database',
      totalFound: filteredEvents.length
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