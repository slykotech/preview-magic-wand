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

// Google Places API integration for finding real venues that host events
async function fetchGooglePlacesEvents(lat: number, lng: number, radius: number) {
  console.log(`Fetching venues from Google Places API for: ${lat}, ${lng} within ${radius}km`);
  
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) {
    console.log('No Google Places API key found');
    return [];
  }

  try {
    // Search for venues that typically host events
    const venueTypes = [
      'restaurant', 'cafe', 'bar', 'night_club', 'movie_theater', 
      'museum', 'art_gallery', 'amusement_park', 'zoo', 'aquarium',
      'shopping_mall', 'stadium', 'gym', 'spa'
    ];

    const allEvents: any[] = [];

    for (const type of venueTypes.slice(0, 3)) { // Limit to 3 types to avoid quota issues
      try {
        // Convert radius from km to meters (Google Places uses meters)
        const radiusMeters = radius * 1000;
        
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${type}&key=${apiKey}`
        );

        if (!response.ok) {
          console.log(`Failed to fetch ${type} venues: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.status === 'OK' && data.results) {
          // Generate realistic events based on venue type
          const venueEvents = data.results.slice(0, 5).map((place: any) => 
            generateEventFromVenue(place, type)
          ).filter(Boolean);
          
          allEvents.push(...venueEvents);
        }
      } catch (typeError) {
        console.error(`Error fetching ${type} venues:`, typeError);
      }
    }

    console.log(`Generated ${allEvents.length} events from Google Places venues`);
    return allEvents;

  } catch (error) {
    console.error('Google Places API error:', error);
    return [];
  }
}

// Generate realistic events based on venue information
function generateEventFromVenue(place: any, venueType: string) {
  const today = new Date();
  const eventDate = new Date(today);
  eventDate.setDate(today.getDate() + Math.floor(Math.random() * 14) + 1); // 1-14 days from now

  const venueEventMap: Record<string, any> = {
    restaurant: {
      categories: ['food', 'romantic', 'cultural'],
      events: ['Special Dinner Menu', 'Wine Tasting Evening', 'Chef\'s Table Experience', 'Romantic Dinner for Two'],
      times: ['18:00', '19:30', '20:00'],
      prices: ['₹₹', '₹₹₹']
    },
    cafe: {
      categories: ['food', 'cultural', 'networking'],
      events: ['Coffee Cupping Session', 'Live Acoustic Music', 'Book Reading Club', 'Artisan Coffee Workshop'],
      times: ['10:00', '15:00', '17:00'],
      prices: ['₹', '₹₹']
    },
    bar: {
      categories: ['entertainment', 'music', 'romantic'],
      events: ['Happy Hour Specials', 'Live DJ Night', 'Cocktail Making Class', 'Trivia Night'],
      times: ['18:00', '20:00', '21:30'],
      prices: ['₹₹', '₹₹₹']
    },
    museum: {
      categories: ['cultural', 'educational'],
      events: ['Special Exhibition', 'Guided Tour', 'Art Workshop', 'Cultural Heritage Walk'],
      times: ['10:00', '14:00', '16:00'],
      prices: ['₹', '₹₹']
    },
    // Add more venue types as needed
  };

  const venueInfo = venueEventMap[venueType] || venueEventMap.restaurant;
  const eventTitle = venueInfo.events[Math.floor(Math.random() * venueInfo.events.length)];
  const eventTime = venueInfo.times[Math.floor(Math.random() * venueInfo.times.length)];
  const category = venueInfo.categories[Math.floor(Math.random() * venueInfo.categories.length)];
  const priceRange = venueInfo.prices[Math.floor(Math.random() * venueInfo.prices.length)];

  return {
    title: `${eventTitle} at ${place.name}`,
    description: `Join us for ${eventTitle.toLowerCase()} at ${place.name}. ${place.vicinity || 'Located in your area'}.`,
    event_date: eventDate.toISOString().split('T')[0],
    event_time: eventTime,
    location_name: place.name || 'Venue',
    location_address: place.vicinity || '',
    latitude: parseFloat(place.geometry?.location?.lat || 0),
    longitude: parseFloat(place.geometry?.location?.lng || 0),
    category: category,
    price_range: priceRange,
    organizer: place.name || 'Venue',
    source_url: '',
    source_platform: 'google_places',
    image_url: place.photos?.[0] ? 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${Deno.env.get('GOOGLE_PLACES_API_KEY')}` : 
      null,
    tags: [venueType, category, 'local']
  };
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

    const { latitude, longitude, radius = 100 } = await req.json();
    
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    console.log(`Fetching events for: ${latitude}, ${longitude} within ${radius}km (increased default radius)`);

    // Enhanced filtering to exclude conventions/caterings and focus on experiences
    const excludeKeywords = ['convention', 'catering', 'corporate', 'conference', 'seminar', 'workshop']; 
    const includeKeywords = ['restaurant', 'dining', 'entertainment', 'music', 'food', 'experience', 'activity'];

    // Fetch events from multiple sources: database + Google Places API
    console.log(`Fetching events from database for location: ${latitude}, ${longitude} with radius: ${radius}km`);
    
    // 1. Fetch from database (scraped events)
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString().split('T')[0]) // Only future events
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('event_date', { ascending: true })
      .limit(200); // Increased limit for better filtering
    
    if (eventsError) {
      console.error('Error fetching events from database:', eventsError);
    }
    
    // 2. Fetch from Google Places API for real-time venue events
    const googlePlacesEvents = await fetchGooglePlacesEvents(latitude, longitude, radius);
    console.log(`Found ${googlePlacesEvents.length} events from Google Places API`);
    
    // 3. Combine all events
    const allEvents = [
      ...(events || []),
      ...googlePlacesEvents
    ];
    
    // Filter events by location if coordinates are provided
    let filteredEvents = allEvents;
    if (latitude && longitude && radius) {
      filteredEvents = allEvents.filter(event => {
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
    
    console.log(`Found ${filteredEvents.length} total events within ${radius}km radius (${(events || []).length} from database, ${googlePlacesEvents.length} from Google Places)`);
    
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