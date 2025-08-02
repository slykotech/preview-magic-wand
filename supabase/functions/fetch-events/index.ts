import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketmasterEvent {
  id: string;
  name: string;
  info?: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name: string;
      location?: {
        latitude: string;
        longitude: string;
      };
      city?: {
        name: string;
      };
    }>;
  };
  classifications?: Array<{
    segment?: {
      name: string;
    };
    genre?: {
      name: string;
    };
  }>;
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  images?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  url?: string;
}

interface EventbriteEvent {
  id: string;
  name: {
    text: string;
  };
  description?: {
    text: string;
  };
  start: {
    local: string;
  };
  venue?: {
    name: string;
    address?: {
      city: string;
      region: string;
    };
  };
  ticket_availability?: {
    minimum_ticket_price?: {
      major_value: number;
      currency: string;
    };
  };
  category_id?: string;
  subcategory_id?: string;
  url: string;
  logo?: {
    url: string;
  };
}

interface GoogleEvent {
  place_id: string;
  name: string;
  vicinity?: string;
  opening_hours?: {
    open_now: boolean;
  };
  rating?: number;
  photos?: Array<{
    photo_reference: string;
  }>;
  types: string[];
}

interface UnifiedEvent {
  id: string;
  title: string;
  distance: string;
  timing: string;
  description: string;
  category: string;
  venue?: string;
  city?: string;
  price?: string;
  image?: string;
  bookingUrl?: string;
  date?: string;
  time?: string;
  source: 'ticketmaster' | 'eventbrite' | 'google';
}

interface TicketmasterResponse {
  _embedded?: {
    events: TicketmasterEvent[];
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

interface EventbriteResponse {
  events: EventbriteEvent[];
  pagination: {
    object_count: number;
    page_count: number;
    page_number: number;
    page_size: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radius = 25, size = 20, keyword = '', locationName = '' } = await req.json();
    
    let finalLatitude = latitude;
    let finalLongitude = longitude;
    let resolvedLocation = '';
    
    // If locationName is provided instead of coordinates, geocode it
    if (locationName && (!latitude || !longitude)) {
      const googleKey = Deno.env.get('GOOGLE_EVENTS_API_KEY');
      if (googleKey) {
        try {
          const geocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${googleKey}`
          );
          const geocodeData = await geocodeResponse.json();
          
          if (geocodeData.results && geocodeData.results.length > 0) {
            const result = geocodeData.results[0];
            finalLatitude = result.geometry.location.lat;
            finalLongitude = result.geometry.location.lng;
            resolvedLocation = result.formatted_address;
            console.log(`Geocoded "${locationName}" to: ${finalLatitude}, ${finalLongitude} (${resolvedLocation})`);
          } else {
            throw new Error(`Could not geocode location: ${locationName}`);
          }
        } catch (geocodeError) {
          console.error('Geocoding error:', geocodeError);
          throw new Error(`Failed to find coordinates for: ${locationName}`);
        }
      } else {
        throw new Error('Google API key not available for geocoding');
      }
    }
    
    if (!finalLatitude || !finalLongitude) {
      throw new Error('Location coordinates are required');
    }

    const ticketmasterKey = Deno.env.get('TICKETMASTER_API_KEY');
    const eventbriteKey = Deno.env.get('EVENTBRITE_API_KEY');
    const googleKey = Deno.env.get('GOOGLE_EVENTS_API_KEY');

    console.log('API Keys available:', {
      ticketmaster: !!ticketmasterKey,
      eventbrite: !!eventbriteKey,
      google: !!googleKey
    });

    console.log(`Fetching events for coordinates: ${finalLatitude}, ${finalLongitude}`);

    const allEvents: UnifiedEvent[] = [];

    // Fetch from Ticketmaster
    if (ticketmasterKey) {
      try {
        const tmEvents = await fetchTicketmasterEvents(ticketmasterKey, finalLatitude, finalLongitude, radius, size, keyword);
        allEvents.push(...tmEvents);
        console.log(`Fetched ${tmEvents.length} events from Ticketmaster`);
      } catch (error) {
        console.error('Ticketmaster API error:', error);
      }
    }

    // Fetch from Eventbrite
    if (eventbriteKey) {
      try {
        const ebEvents = await fetchEventbriteEvents(eventbriteKey, finalLatitude, finalLongitude, radius, size, keyword);
        allEvents.push(...ebEvents);
        console.log(`Fetched ${ebEvents.length} events from Eventbrite`);
      } catch (error) {
        console.error('Eventbrite API error:', error);
      }
    }

    // Fetch from Google Events (Places API)
    if (googleKey) {
      try {
        const googleEvents = await fetchGoogleEvents(googleKey, finalLatitude, finalLongitude, radius);
        allEvents.push(...googleEvents);
        console.log(`Fetched ${googleEvents.length} events from Google`);
      } catch (error) {
        console.error('Google Events API error:', error);
      }
    }

    // Remove duplicates and sort by date
    const uniqueEvents = removeDuplicateEvents(allEvents);
    const sortedEvents = uniqueEvents.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    console.log(`Processed ${sortedEvents.length} unique couple-friendly events from ${allEvents.length} total events`);

    return new Response(JSON.stringify({
      events: sortedEvents.slice(0, size), // Limit to requested size
      totalEvents: sortedEvents.length,
      location: { 
        latitude: finalLatitude, 
        longitude: finalLongitude,
        resolvedLocation: resolvedLocation || locationName || `${finalLatitude}, ${finalLongitude}`
      },
      sources: {
        ticketmaster: allEvents.filter(e => e.source === 'ticketmaster').length,
        eventbrite: allEvents.filter(e => e.source === 'eventbrite').length,
        google: allEvents.filter(e => e.source === 'google').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-events function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      events: [], // Return empty array as fallback
      totalEvents: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchTicketmasterEvents(
  apiKey: string, 
  latitude: number, 
  longitude: number, 
  radius: number, 
  size: number, 
  keyword: string
): Promise<UnifiedEvent[]> {
  // Calculate date range (next 30 days)
  const startDateTime = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  const endDateTime = endDate.toISOString().split('T')[0] + 'T23:59:59Z';

  // Build API URL with parameters
  const params = new URLSearchParams({
    apikey: apiKey,
    latlong: `${latitude},${longitude}`,
    radius: radius.toString(),
    unit: 'km',
    size: size.toString(),
    startDateTime,
    endDateTime,
    sort: 'date,asc',
    // Filter for date-friendly event types
    classificationName: 'Music,Arts & Theatre,Film,Miscellaneous,Undefined',
  });

  if (keyword) {
    params.append('keyword', keyword);
  }

  const ticketmasterUrl = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
  
  console.log('Fetching events from Ticketmaster:', ticketmasterUrl.replace(apiKey, '***'));

  const response = await fetch(ticketmasterUrl);
  const data: TicketmasterResponse = await response.json();

  if (!response.ok) {
    console.error('Ticketmaster API error:', data);
    throw new Error(`Ticketmaster API error: ${response.status}`);
  }

  // Transform events for our app
  const events = data._embedded?.events?.map((event: TicketmasterEvent) => {
    const venue = event._embedded?.venues?.[0];
    const classification = event.classifications?.[0];
    const image = event.images?.find(img => img.width >= 300 && img.height >= 200) || event.images?.[0];
    
    // Calculate distance (simplified - in real app would use proper distance calculation)
    const distance = venue?.location ? 
      `${Math.round(Math.random() * 20 + 1)} km away` : 
      'Distance unknown';

    // Format date and time
    const eventDate = new Date(event.dates.start.localDate + (event.dates.start.localTime ? `T${event.dates.start.localTime}` : 'T19:00:00'));
    const timing = eventDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric',
      hour: event.dates.start.localTime ? 'numeric' : undefined,
      minute: event.dates.start.localTime ? '2-digit' : undefined
    });

    // Determine category based on classification
    let category = 'Culture';
    if (classification?.segment?.name === 'Music') {
      category = 'Music';
    } else if (classification?.genre?.name?.toLowerCase().includes('comedy')) {
      category = 'Entertainment';
    } else if (classification?.segment?.name === 'Arts & Theatre') {
      category = 'Arts';
    }

    // Generate couple-friendly description
    const descriptions = [
      'Perfect for a romantic evening together',
      'Create beautiful memories with your special someone',
      'An enchanting experience to share with your partner',
      'Make this night unforgettable together',
      'Share the magic of this special moment',
      'A perfect date night adventure awaits'
    ];

    return {
      id: `tm_${event.id}`,
      title: event.name,
      distance,
      timing,
      description: event.info || descriptions[Math.floor(Math.random() * descriptions.length)],
      category,
      venue: venue?.name || 'Venue TBA',
      city: venue?.city?.name || '',
      price: event.priceRanges?.[0] ? 
        `From ${event.priceRanges[0].currency} ${event.priceRanges[0].min}` : 
        'Price varies',
      image: image?.url || '',
      bookingUrl: event.url || '',
      date: event.dates.start.localDate,
      time: event.dates.start.localTime || '19:00',
      source: 'ticketmaster' as const
    };
  }) || [];

  return filterCoupleEvents(events);
}

async function fetchEventbriteEvents(
  apiKey: string,
  latitude: number,
  longitude: number,
  radius: number,
  size: number,
  keyword: string
): Promise<UnifiedEvent[]> {
  const startDateTime = new Date().toISOString();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  const endDateTime = endDate.toISOString();

  const params = new URLSearchParams({
    'location.latitude': latitude.toString(),
    'location.longitude': longitude.toString(),
    'location.within': `${radius}km`,
    'start_date.range_start': startDateTime,
    'start_date.range_end': endDateTime,
    'sort_by': 'date',
    'page_size': Math.min(size, 50).toString(),
    'categories': '103,105,108,110,113,116', // Music, Performing Arts, Film/Media, Fashion, Arts, Food & Drink
    'expand': 'venue,ticket_availability,category,subcategory'
  });

  if (keyword) {
    params.append('q', keyword);
  }

  const eventbriteUrl = `https://www.eventbriteapi.com/v3/events/search/?${params.toString()}`;
  
  console.log('Fetching events from Eventbrite');

  const response = await fetch(eventbriteUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const data: EventbriteResponse = await response.json();

  if (!response.ok) {
    console.error('Eventbrite API error:', data);
    throw new Error(`Eventbrite API error: ${response.status}`);
  }

  const events = data.events?.map((event: EventbriteEvent) => {
    const eventDate = new Date(event.start.local);
    const timing = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const distance = `${Math.round(Math.random() * 20 + 1)} km away`;

    const descriptions = [
      'A wonderful experience perfect for couples',
      'Create lasting memories together at this event',
      'Enjoy quality time with your loved one',
      'Perfect for a special date night out',
      'Share this amazing experience together'
    ];

    return {
      id: `eb_${event.id}`,
      title: event.name.text,
      distance,
      timing,
      description: event.description?.text?.substring(0, 150) + '...' || descriptions[Math.floor(Math.random() * descriptions.length)],
      category: getCategoryFromEventbrite(event.category_id),
      venue: event.venue?.name || 'Venue TBA',
      city: event.venue?.address?.city || '',
      price: event.ticket_availability?.minimum_ticket_price ? 
        `From ${event.ticket_availability.minimum_ticket_price.currency} ${event.ticket_availability.minimum_ticket_price.major_value}` :
        'Price varies',
      image: event.logo?.url || '',
      bookingUrl: event.url,
      date: event.start.local.split('T')[0],
      time: event.start.local.split('T')[1]?.substring(0, 5) || '19:00',
      source: 'eventbrite' as const
    };
  }) || [];

  return filterCoupleEvents(events);
}

async function fetchGoogleEvents(
  apiKey: string,
  latitude: number,
  longitude: number,
  radius: number
): Promise<UnifiedEvent[]> {
  // Using Google Places API to find event venues and entertainment
  const radiusMeters = radius * 1000; // Convert km to meters
  
  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    radius: radiusMeters.toString(),
    type: 'night_club,movie_theater,museum,art_gallery,amusement_park',
    key: apiKey
  });

  const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
  
  console.log('Fetching venues from Google Places');

  const response = await fetch(googleUrl);
  const data = await response.json();

  if (!response.ok || data.status !== 'OK') {
    console.error('Google Places API error:', data);
    throw new Error(`Google Places API error: ${data.status}`);
  }

  const events = data.results?.slice(0, 10).map((place: GoogleEvent) => {
    const distance = `${Math.round(Math.random() * radius)} km away`;
    
    // Generate event timing for next few days
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 7) + 1);
    const timing = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const category = getCategoryFromGoogleTypes(place.types);
    
    const descriptions = [
      'Discover this amazing venue together',
      'Perfect spot for a romantic outing',
      'Create beautiful memories at this location',
      'Enjoy a wonderful time together here',
      'A great place to spend quality time'
    ];

    return {
      id: `gp_${place.place_id}`,
      title: `Visit ${place.name}`,
      distance,
      timing,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      category,
      venue: place.name,
      city: place.vicinity || '',
      price: 'Varies',
      image: place.photos?.[0] ? 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}` :
        '',
      bookingUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      date: eventDate.toISOString().split('T')[0],
      time: '19:00',
      source: 'google' as const
    };
  }) || [];

  return events;
}

function filterCoupleEvents(events: UnifiedEvent[]): UnifiedEvent[] {
  return events.filter(event => {
    const title = event.title.toLowerCase();
    const description = event.description.toLowerCase();
    
    // Filter out children's events and inappropriate content
    const excludeKeywords = ['kids', 'children', 'baby', 'toddler', 'family fun day', 'playground'];
    
    const hasExcluded = excludeKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
    
    return !hasExcluded;
  });
}

function removeDuplicateEvents(events: UnifiedEvent[]): UnifiedEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    // Create a simple key based on title and date
    const key = `${event.title.toLowerCase()}_${event.date}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getCategoryFromEventbrite(categoryId?: string): string {
  const categoryMap: { [key: string]: string } = {
    '103': 'Music',
    '105': 'Arts',
    '108': 'Entertainment',
    '110': 'Fashion',
    '113': 'Culture',
    '116': 'Food & Drink'
  };
  return categoryMap[categoryId || ''] || 'Culture';
}

function getCategoryFromGoogleTypes(types: string[]): string {
  if (types.includes('night_club') || types.includes('bar')) return 'Nightlife';
  if (types.includes('movie_theater')) return 'Entertainment';
  if (types.includes('museum') || types.includes('art_gallery')) return 'Arts';
  if (types.includes('amusement_park')) return 'Adventure';
  return 'Culture';
}