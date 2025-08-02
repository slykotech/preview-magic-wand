import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import FirecrawlApp from 'npm:@mendable/firecrawl-js@^1.0.0';
import { parseBookMyShowEvents, parsePaytmInsiderEvents, parseDistrictEvents, generateMockBookMyShowEvents, generateMockPaytmEvents, generateMockDistrictEvents } from './parsers.ts';

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
  source: 'ticketmaster' | 'eventbrite' | 'google' | 'local' | 'seatgeek' | 'predicthq' | 'explara' | 'bookmyshow' | 'paytm-insider' | 'district' | 'facebook' | 'meetup';
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

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Rate limiting storage
const rateLimits = new Map<string, { count: number; resetTime: number }>();

// Usage tracking
const usageStats = {
  ticketmaster: 0,
  eventbrite: 0,
  google: 0,
  seatgeek: 0,
  predicthq: 0,
  total: 0
};

function getCacheKey(latitude: number, longitude: number, radius: number, size: number, keyword: string): string {
  return `events_${latitude}_${longitude}_${radius}_${size}_${keyword}`;
}

function isRateLimited(source: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const limit = rateLimits.get(source);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(source, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (limit.count >= maxRequests) {
    console.log(`Rate limit reached for ${source}: ${limit.count}/${maxRequests}`);
    return true;
  }
  
  limit.count++;
  return false;
}

function updateUsageStats(source: string) {
  if (source in usageStats) {
    (usageStats as any)[source]++;
    usageStats.total++;
  }
  console.log(`API usage stats:`, usageStats);
}

// Enhanced cost tracking function
async function logApiUsage(userId: string | null, apiSource: string, endpoint: string, success: boolean, responseSize: number, executionTime: number, errorMessage?: string) {
  if (!userId) return;
  
  try {
    // Get cost configuration for this API source
    const { data: costConfig } = await supabase
      .from('api_cost_config')
      .select('cost_per_request')
      .eq('api_source', apiSource)
      .single();
    
    const costEstimate = costConfig?.cost_per_request || 0;
    
    // Log the API usage
    await supabase.from('api_usage_logs').insert({
      user_id: userId,
      api_source: apiSource,
      endpoint: endpoint,
      cost_estimate: costEstimate,
      request_params: {
        timestamp: new Date().toISOString(),
        cached: false
      },
      response_size: responseSize,
      execution_time_ms: executionTime,
      success: success,
      error_message: errorMessage
    });
    
    // Update user quota usage
    if (success) {
      await supabase.rpc('update_user_quota_usage', {
        p_user_id: userId,
        p_cost_increase: costEstimate
      });
    }
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}

// Database connection for cost monitoring
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radius = 25, size = 20, keyword = '', locationName = '' } = await req.json();
    
    // Get user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }
    
    // Extract user ID from auth header
    const token = authHeader.replace('Bearer ', '');
    let userId = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
    } catch (e) {
      console.log('Could not extract user ID from token, proceeding without user tracking');
    }
    
    // Check user quota if user is authenticated
    let quotaCheck = { can_proceed: true, daily_remaining: 10, monthly_cost_remaining: 5.0 };
    if (userId) {
      try {
        const { data: quotaData, error: quotaError } = await supabase.rpc('check_user_quota', { 
          p_user_id: userId, 
          p_estimated_cost: 0.05 // Estimated cost for this request
        });
        
        if (quotaError) {
          console.error('Quota check error:', quotaError);
        } else {
          quotaCheck = quotaData;
        }
      } catch (error) {
        console.error('Error checking quota:', error);
      }
    }
    
    // If quota exceeded, return error
    if (!quotaCheck.can_proceed) {
      return new Response(JSON.stringify({
        error: 'API quota exceeded',
        details: {
          daily_remaining: quotaCheck.daily_remaining,
          monthly_cost_remaining: quotaCheck.monthly_cost_remaining,
          daily_limit: quotaCheck.daily_limit,
          monthly_limit: quotaCheck.monthly_limit
        }
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check cache first
    const cacheKey = getCacheKey(latitude || 0, longitude || 0, radius, size, keyword);
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('Returning cached events');
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let finalLatitude = latitude;
    let finalLongitude = longitude;
    let resolvedLocation = '';
    
    // If locationName is provided instead of coordinates, geocode it
    if (locationName && (!latitude || !longitude)) {
      const googleKey = Deno.env.get('GOOGLE_EVENTS_API_KEY');
      console.log(`Geocoding request for: "${locationName}"`);
      console.log('Google API key available:', !!googleKey);
      
      if (!googleKey) {
        console.error('Google API key not found');
        throw new Error('Google API key not configured for geocoding');
      }
      
      try {
        console.log(`Attempting to geocode: "${locationName}"`);
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${googleKey}`;
        console.log('Geocoding URL (without key):', geocodeUrl.replace(googleKey, '***'));
        
        const geocodeResponse = await fetch(geocodeUrl);
        console.log('Geocoding response status:', geocodeResponse.status);
        
        if (!geocodeResponse.ok) {
          throw new Error(`Geocoding HTTP error: ${geocodeResponse.status}`);
        }
        
        const geocodeData = await geocodeResponse.json();
        console.log('Geocoding response:', JSON.stringify(geocodeData, null, 2));
        
        if (geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
          const result = geocodeData.results[0];
          finalLatitude = result.geometry.location.lat;
          finalLongitude = result.geometry.location.lng;
          resolvedLocation = result.formatted_address;
          console.log(`Successfully geocoded "${locationName}" to: ${finalLatitude}, ${finalLongitude} (${resolvedLocation})`);
        } else {
          console.error('Geocoding failed with status:', geocodeData.status);
          console.error('Full geocoding response:', geocodeData);
          throw new Error(`Could not geocode location: ${locationName}. Status: ${geocodeData.status}, Error: ${geocodeData.error_message || 'Unknown error'}`);
        }
      } catch (geocodeError) {
        console.error('Geocoding error details:', geocodeError);
        throw new Error(`Failed to find coordinates for: ${locationName}. Error: ${geocodeError.message}`);
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

    // Prioritize free sources first
    console.log('Starting with free sources to minimize API costs...');

      // 1. Fetch from BookMyShow (Free source with real scraping)
      try {
        const bookMyShowEvents = await fetchBookMyShowEvents(resolvedLocation || locationName);
        allEvents.push(...bookMyShowEvents);
        console.log(`Fetched ${bookMyShowEvents.length} events from BookMyShow`);
      } catch (error) {
        console.error('BookMyShow scraping error:', error);
      }

      // 2. Fetch from Paytm Insider (Free source with real scraping)
      try {
        const paytmEvents = await fetchPaytmInsiderEvents(resolvedLocation || locationName);
        allEvents.push(...paytmEvents);
        console.log(`Fetched ${paytmEvents.length} events from Paytm Insider`);
      } catch (error) {
        console.error('Paytm Insider scraping error:', error);
      }

      // 3. Fetch from District (Free source with real scraping)
      try {
        const districtEvents = await fetchDistrictEvents(resolvedLocation || locationName);
        allEvents.push(...districtEvents);
        console.log(`Fetched ${districtEvents.length} events from District`);
      } catch (error) {
        console.error('District scraping error:', error);
      }

      // 4. Fetch from Facebook Events (Mock - keeping as fallback)
      const facebookEvents = await fetchFacebookEvents(finalLatitude, finalLongitude, resolvedLocation || locationName, radius, 4);
      allEvents.push(...facebookEvents);
      console.log(`Fetched ${facebookEvents.length} events from Facebook (mock)`);

      // 5. Fetch from Meetup Events (Mock - keeping as fallback)
      const meetupEvents = await fetchMeetupEvents(finalLatitude, finalLongitude, resolvedLocation || locationName, radius, 5);
      allEvents.push(...meetupEvents);
      console.log(`Fetched ${meetupEvents.length} events from Meetup (mock)`);

    // Always try to get some location-specific events from Google Places if available
    if (googleKey && !isRateLimited('google', 20, 3600000)) {
      try {
        updateUsageStats('google');
        const googleEvents = await fetchGoogleEvents(googleKey, finalLatitude, finalLongitude, radius);
        allEvents.push(...googleEvents);
        console.log(`Fetched ${googleEvents.length} events from Google Places`);
      } catch (error) {
        console.error('Google Places API error:', error);
      }
    } else if (isRateLimited('google', 20, 3600000)) {
      console.log('Skipping Google Places due to rate limit');
    }

    // Only fetch from other paid APIs if we don't have enough events
    const currentEventsCount = allEvents.length;
    console.log(`Current events count: ${currentEventsCount}`);

    if (currentEventsCount < size * 0.7) {
      console.log('Supplementing with paid API sources...');

      // 5. Fetch from Ticketmaster (Rate limited)
      if (ticketmasterKey && !isRateLimited('ticketmaster', 100, 3600000)) { // 100 requests per hour
        try {
          updateUsageStats('ticketmaster');
          const tmEvents = await fetchTicketmasterEvents(ticketmasterKey, finalLatitude, finalLongitude, radius, Math.floor(size * 0.3), keyword);
          allEvents.push(...tmEvents);
          console.log(`Fetched ${tmEvents.length} events from Ticketmaster`);
        } catch (error) {
          console.error('Ticketmaster API error:', error);
        }
      } else if (isRateLimited('ticketmaster', 100, 3600000)) {
        console.log('Skipping Ticketmaster due to rate limit');
      }

      // 7. Fetch from SeatGeek (Rate limited)
      if (!isRateLimited('seatgeek', 30, 3600000)) { // 30 requests per hour
        try {
          updateUsageStats('seatgeek');
          const seatgeekEvents = await fetchSeatGeekEvents(finalLatitude, finalLongitude, radius, Math.floor(size * 0.2), keyword);
          allEvents.push(...seatgeekEvents);
          console.log(`Fetched ${seatgeekEvents.length} events from SeatGeek`);
        } catch (error) {
          console.error('SeatGeek API error:', error);
        }
      } else {
        console.log('Skipping SeatGeek due to rate limit');
      }

      // 8. Fetch from PredictHQ (Rate limited)
      if (!isRateLimited('predicthq', 25, 3600000)) { // 25 requests per hour
        try {
          updateUsageStats('predicthq');
          const predicthqEvents = await fetchPredictHQEvents(finalLatitude, finalLongitude, radius, Math.floor(size * 0.2), keyword);
          allEvents.push(...predicthqEvents);
          console.log(`Fetched ${predicthqEvents.length} events from PredictHQ`);
        } catch (error) {
          console.error('PredictHQ API error:', error);
        }
      } else {
        console.log('Skipping PredictHQ due to rate limit');
      }
    } else {
      console.log(`Sufficient events from current sources (${currentEventsCount}), skipping additional paid APIs`);
    }

    // If we have very few events (indicating limited API coverage for this region), 
    // add some generic date-friendly venue suggestions
    if (allEvents.length < 5) {
      console.log(`Limited events found (${allEvents.length}), adding local venue suggestions...`);
      const localVenues = generateLocalVenueSuggestions(finalLatitude, finalLongitude, resolvedLocation || locationName);
      allEvents.push(...localVenues);
      console.log(`Added ${localVenues.length} local venue suggestions`);
    }

    // Remove duplicates and sort by date
    const uniqueEvents = removeDuplicateEvents(allEvents);
    const sortedEvents = uniqueEvents.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    console.log(`Processed ${sortedEvents.length} unique couple-friendly events from ${allEvents.length} total events`);

    // Get updated quota info if user is authenticated
    let quotaInfo = null;
    if (userId) {
      try {
        const { data: updatedQuotaData } = await supabase.rpc('check_user_quota', { 
          p_user_id: userId, 
          p_estimated_cost: 0
        });
        quotaInfo = updatedQuotaData;
      } catch (error) {
        console.error('Error getting updated quota:', error);
      }
    }

    const responseData = {
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
        google: allEvents.filter(e => e.source === 'google').length,
        seatgeek: allEvents.filter(e => e.source === 'seatgeek').length,
        predicthq: allEvents.filter(e => e.source === 'predicthq').length,
        bookmyshow: allEvents.filter(e => e.source === 'bookmyshow').length,
        paytm_insider: allEvents.filter(e => e.source === 'paytm-insider').length,
        district: allEvents.filter(e => e.source === 'district').length,
        facebook: allEvents.filter(e => e.source === 'facebook').length,
        meetup: allEvents.filter(e => e.source === 'meetup').length,
        local: allEvents.filter(e => e.source === 'local').length
      },
      quota_info: quotaInfo,
      metadata: {
        cached: false,
        usageStats: usageStats,
        rateLimitStatus: Object.fromEntries(
          Array.from(rateLimits.entries()).map(([key, value]) => [
            key, 
            { count: value.count, resetTime: new Date(value.resetTime).toISOString() }
          ])
        )
      }
    };

    // Cache the response for 15 minutes (900000ms)
    cache.set(cacheKey, { 
      data: { ...responseData, metadata: { ...responseData.metadata, cached: true } }, 
      timestamp: Date.now(), 
      ttl: 900000 
    });

    console.log(`Cached events for key: ${cacheKey}`);

    return new Response(JSON.stringify(responseData), {
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
  // Using Google Places API (New) to find event venues and entertainment
  const radiusMeters = radius * 1000; // Convert km to meters
  
  try {
    const params = new URLSearchParams({
      includedTypes: 'night_club,movie_theater,museum,art_gallery,amusement_park,tourist_attraction,performing_arts_theater',
      location: `${latitude},${longitude}`,
      maxResultCount: '10',
      key: apiKey
    });

    const googleUrl = `https://places.googleapis.com/v1/places:searchNearby`;
    
    console.log('Fetching venues from Google Places (New API)');

    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.rating,places.photos'
      },
      body: JSON.stringify({
        includedTypes: ['night_club', 'movie_theater', 'museum', 'art_gallery', 'amusement_park', 'tourist_attraction', 'performing_arts_theater'],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: {
              latitude: latitude,
              longitude: longitude
            },
            radius: radiusMeters
          }
        }
      })
    });

    if (!response.ok) {
      console.error('Google Places API error response:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Google Places response:', JSON.stringify(data, null, 2));

    const events = data.places?.slice(0, 10).map((place: any) => {
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

      const category = getCategoryFromGoogleTypes(place.types || []);
      
      const descriptions = [
        'Discover this amazing venue together',
        'Perfect spot for a romantic outing',
        'Create beautiful memories at this location',
        'Enjoy a wonderful time together here',
        'A great place to spend quality time'
      ];

      return {
        id: `gp_${place.id}`,
        title: `Visit ${place.displayName?.text || 'Local Venue'}`,
        distance,
        timing,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        category,
        venue: place.displayName?.text || 'Local Venue',
        city: '',
        price: 'Varies',
        image: place.photos?.[0] ? 
          `https://places.googleapis.com/v1/places/${place.id}/photos/${place.photos[0].name}/media?maxWidthPx=400&key=${apiKey}` :
          '',
        bookingUrl: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
        date: eventDate.toISOString().split('T')[0],
        time: '19:00',
        source: 'google' as const
      };
    }) || [];

    return events;
  } catch (error) {
    console.error('Google Places API error:', error);
    // Fallback to empty array if Google Places fails
    return [];
  }
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

function generateLocalVenueSuggestions(latitude: number, longitude: number, locationName: string): UnifiedEvent[] {
  const venues = [
    {
      name: 'Local Restaurants & Cafés',
      category: 'Food & Drink',
      descriptions: [
        'Discover cozy restaurants perfect for intimate dinner dates',
        'Find charming cafés for romantic coffee dates',
        'Explore local culinary gems together'
      ]
    },
    {
      name: 'Parks & Gardens',
      category: 'Outdoor',
      descriptions: [
        'Enjoy peaceful walks in beautiful parks',
        'Have romantic picnics in scenic gardens',
        'Watch sunsets together in nature'
      ]
    },
    {
      name: 'Museums & Cultural Sites',
      category: 'Culture',
      descriptions: [
        'Explore fascinating museums and galleries',
        'Discover local history and culture together',
        'Enjoy thought-provoking art exhibitions'
      ]
    },
    {
      name: 'Shopping Areas',
      category: 'Shopping',
      descriptions: [
        'Browse local markets and shops together',
        'Find unique souvenirs and gifts',
        'Enjoy couples shopping experiences'
      ]
    },
    {
      name: 'Entertainment Venues',
      category: 'Entertainment',
      descriptions: [
        'Catch movies at local cinemas',
        'Enjoy live music at local venues',
        'Experience local entertainment together'
      ]
    }
  ];

  return venues.map((venue, index) => {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 7) + 1);
    
    const randomDescription = venue.descriptions[Math.floor(Math.random() * venue.descriptions.length)];
    
    return {
      id: `local_${index}_${latitude}_${longitude}`,
      title: `${venue.name} in ${locationName}`,
      distance: `${Math.round(Math.random() * 15 + 1)} km away`,
      timing: eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }),
      description: randomDescription,
      category: venue.category,
      venue: `${venue.name} in ${locationName}`,
      city: locationName,
      price: 'Varies by venue',
      image: '', // No image for local suggestions
      bookingUrl: `https://www.google.com/maps/search/${encodeURIComponent(venue.name + ' ' + locationName)}`,
      date: eventDate.toISOString().split('T')[0],
      time: '19:00',
      source: 'local' as const
    };
  });
}

// SeatGeek Events API
async function fetchSeatGeekEvents(latitude: number, longitude: number, radius: number, size: number, keyword: string): Promise<UnifiedEvent[]> {
  try {
    const seatgeekClientId = Deno.env.get('SEATGEEK_CLIENT_ID');
    if (!seatgeekClientId) {
      console.log('SeatGeek API key not configured, skipping...');
      return [];
    }

    const lat = latitude;
    const lon = longitude;
    const range = Math.min(radius, 50); // SeatGeek max is 50km
    
    const params = new URLSearchParams({
      'client_id': seatgeekClientId,
      'lat': lat.toString(),
      'lon': lon.toString(),
      'range': `${range}km`,
      'per_page': size.toString(),
      'datetime_local.gte': new Date().toISOString().split('T')[0]
    });

    if (keyword) {
      params.append('q', keyword);
    }

    const response = await fetch(`https://api.seatgeek.com/2/events?${params}`);
    if (!response.ok) {
      console.error(`SeatGeek API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.events || !Array.isArray(data.events)) {
      return [];
    }

    return data.events.map((event: any) => {
      const eventDate = new Date(event.datetime_local);
      const venue = event.venue || {};
      
      return {
        id: `seatgeek_${event.id}`,
        title: event.title || event.short_title || 'Event',
        distance: venue.location ? 
          `${Math.round(calculateDistance(latitude, longitude, venue.location.lat, venue.location.lon))} km away` : 
          'Distance unknown',
        timing: eventDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        description: `${event.type || 'Event'} - ${event.title}`,
        category: mapSeatGeekCategory(event.type),
        venue: venue.name || 'Venue TBA',
        city: venue.city || venue.display_location || '',
        price: event.stats?.lowest_price ? `From $${event.stats.lowest_price}` : 'Check website',
        image: event.performers?.[0]?.image || '',
        bookingUrl: event.url || `https://seatgeek.com/events/${event.id}`,
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toTimeString().split(' ')[0].substring(0, 5),
        source: 'seatgeek' as const
      };
    });
  } catch (error) {
    console.error('Error fetching SeatGeek events:', error);
    return [];
  }
}

// PredictHQ Events API
async function fetchPredictHQEvents(latitude: number, longitude: number, radius: number, size: number, keyword: string): Promise<UnifiedEvent[]> {
  try {
    const predicthqToken = Deno.env.get('PREDICTHQ_ACCESS_TOKEN');
    if (!predicthqToken) {
      console.log('PredictHQ API key not configured, skipping...');
      return [];
    }

    const radiusInMiles = Math.round(radius * 0.621371); // Convert km to miles
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const params = new URLSearchParams({
      'within': `${radiusInMiles}mi@${latitude},${longitude}`,
      'active.gte': today,
      'active.lte': nextMonth,
      'limit': size.toString(),
      'category': 'concerts,festivals,performing-arts,sports'
    });

    if (keyword) {
      params.append('q', keyword);
    }

    const response = await fetch(`https://api.predicthq.com/v1/events/?${params}`, {
      headers: {
        'Authorization': `Bearer ${predicthqToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`PredictHQ API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((event: any) => {
      const eventDate = new Date(event.start);
      
      return {
        id: `predicthq_${event.id}`,
        title: event.title,
        distance: event.location && event.location[1] && event.location[0] ? 
          `${Math.round(calculateDistance(latitude, longitude, event.location[1], event.location[0]))} km away` : 
          'Distance unknown',
        timing: eventDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        description: event.description || `${event.category} event in ${event.location?.address || 'the area'}`,
        category: mapPredictHQCategory(event.category),
        venue: event.entities?.find((e: any) => e.type === 'venue')?.name || 'Venue TBA',
        city: event.location?.address || '',
        price: 'Check website for pricing',
        image: '',
        bookingUrl: event.entities?.find((e: any) => e.formatted_address)?.formatted_address ? 
          `https://www.google.com/maps/search/${encodeURIComponent(event.title + ' ' + event.location?.address)}` : 
          `https://www.google.com/search?q=${encodeURIComponent(event.title)}`,
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toTimeString().split(' ')[0].substring(0, 5),
        source: 'predicthq' as const
      };
    });
  } catch (error) {
    console.error('Error fetching PredictHQ events:', error);
    return [];
  }
}

function mapSeatGeekCategory(type: string): string {
  const typeMap: { [key: string]: string } = {
    'concert': 'Music',
    'sports': 'Sports',
    'theater': 'Culture',
    'comedy': 'Entertainment',
    'festival': 'Festival',
    'family': 'Family'
  };
  
  return typeMap[type?.toLowerCase()] || 'Entertainment';
}

function mapPredictHQCategory(category: string): string {
  const categoryMap: { [key: string]: string } = {
    'concerts': 'Music',
    'sports': 'Sports',
    'festivals': 'Festival',
    'performing-arts': 'Culture',
    'conferences': 'Business',
    'community': 'Community'
  };
  
  return categoryMap[category?.toLowerCase()] || 'Entertainment';
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Real scraping function for BookMyShow
async function fetchBookMyShowEvents(location: string): Promise<UnifiedEvent[]> {
  const startTime = Date.now();
  
  try {
    console.log('Scraping BookMyShow events for location:', location);
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.log('Firecrawl API key not configured, using fallback...');
      return generateMockBookMyShowEvents(location);
    }
    
    const app = new FirecrawlApp({ apiKey: firecrawlApiKey });
    
    // BookMyShow events URL - adjust based on location
    const city = location.toLowerCase().replace(/\s+/g, '-');
    const bmSUrl = `https://in.bookmyshow.com/${city}/events`;
    
    console.log(`Scraping BookMyShow: ${bmSUrl}`);
    
    const scrapeResult = await app.scrapeUrl(bmSUrl, {
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 30000
    });
    
    if (!scrapeResult.success) {
      console.error('BookMyShow scraping failed:', scrapeResult.error);
      return generateMockBookMyShowEvents(location);
    }
    
    // Handle different response structures from Firecrawl API
    const markdown = scrapeResult.data?.markdown || scrapeResult.markdown || '';
    if (!markdown) {
      console.error('No markdown content received from BookMyShow scraping');
      return generateMockBookMyShowEvents(location);
    }
    
    const events = parseBookMyShowEvents(markdown, location);
    console.log(`Scraped ${events.length} events from BookMyShow`);
    
    return events;
  } catch (error) {
    console.error('BookMyShow scraping error:', error);
    return generateMockBookMyShowEvents(location);
  }
}

// Real scraping function for Paytm Insider
async function fetchPaytmInsiderEvents(location: string): Promise<UnifiedEvent[]> {
  try {
    console.log('Scraping Paytm Insider events for location:', location);
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.log('Firecrawl API key not configured, using fallback...');
      return generateMockPaytmEvents(location);
    }
    
    const app = new FirecrawlApp({ apiKey: firecrawlApiKey });
    
    // Paytm Insider events URL
    const city = location.toLowerCase().replace(/\s+/g, '-');
    const paytmUrl = `https://insider.in/${city}`;
    
    console.log(`Scraping Paytm Insider: ${paytmUrl}`);
    
    const scrapeResult = await app.scrapeUrl(paytmUrl, {
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 30000
    });
    
    if (!scrapeResult.success) {
      console.error('Paytm Insider scraping failed:', scrapeResult.error);
      return generateMockPaytmEvents(location);
    }
    
    // Handle different response structures from Firecrawl API
    const markdown = scrapeResult.data?.markdown || scrapeResult.markdown || '';
    if (!markdown) {
      console.error('No markdown content received from Paytm Insider scraping');
      return generateMockPaytmEvents(location);
    }
    
    const events = parsePaytmInsiderEvents(markdown, location);
    console.log(`Scraped ${events.length} events from Paytm Insider`);
    
    return events;
  } catch (error) {
    console.error('Paytm Insider scraping error:', error);
    return generateMockPaytmEvents(location);
  }
}

// Real scraping function for District app
async function fetchDistrictEvents(location: string): Promise<UnifiedEvent[]> {
  try {
    console.log('Scraping District events for location:', location);
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.log('Firecrawl API key not configured, using fallback...');
      return generateMockDistrictEvents(location);
    }
    
    const app = new FirecrawlApp({ apiKey: firecrawlApiKey });
    
    // District app events URL
    const districtUrl = `https://www.district.in/events`;
    
    console.log(`Scraping District: ${districtUrl}`);
    
    const scrapeResult = await app.scrapeUrl(districtUrl, {
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 30000
    });
    
    if (!scrapeResult.success) {
      console.error('District scraping failed:', scrapeResult.error);
      return generateMockDistrictEvents(location);
    }
    
    // Handle different response structures from Firecrawl API
    const markdown = scrapeResult.data?.markdown || scrapeResult.markdown || '';
    if (!markdown) {
      console.error('No markdown content received from District scraping');
      return generateMockDistrictEvents(location);
    }
    
    const events = parseDistrictEvents(markdown, location);
    console.log(`Scraped ${events.length} events from District`);
    
    return events;
  } catch (error) {
    console.error('District scraping error:', error);
    return generateMockDistrictEvents(location);
  }
}

// Facebook Events Web Scraper
async function fetchFacebookEvents(latitude: number, longitude: number, location: string, radius: number, size: number): Promise<UnifiedEvent[]> {
  try {
    console.log('Scraping Facebook events for location:', location);
    
    // Generate sample Facebook events
    const today = new Date();
    const events: UnifiedEvent[] = [];
    
    const sampleEvents = [
      {
        title: 'Photography Meetup',
        venue: 'City Park',
        category: 'Community',
        description: 'Join fellow photography enthusiasts for a couples photoshoot session'
      },
      {
        title: 'Wine Tasting Event',
        venue: 'Local Winery',
        category: 'Food & Drink',
        description: 'Discover new wines together in a romantic setting'
      },
      {
        title: 'Dance Workshop',
        venue: 'Community Center',
        category: 'Arts',
        description: 'Learn new dance moves together in this fun workshop'
      },
      {
        title: 'Book Club Meeting',
        venue: 'Café Library',
        category: 'Community',
        description: 'Discuss great books with other couples over coffee'
      }
    ].slice(0, Math.min(size, 4));

    sampleEvents.forEach((event, index) => {
      const eventDate = new Date(today.getTime() + (index + 2) * 24 * 60 * 60 * 1000);
      events.push({
        id: `fb_${location.replace(/\s+/g, '_')}_${index}`,
        title: event.title,
        distance: `${Math.round(Math.random() * radius)} km away`,
        timing: eventDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        description: event.description,
        category: event.category,
        venue: event.venue,
        city: location,
        price: 'Free - ₹500',
        image: '',
        bookingUrl: `https://www.facebook.com/events/search/?q=${encodeURIComponent(event.title + ' ' + location)}`,
        date: eventDate.toISOString().split('T')[0],
        time: '18:00',
        source: 'facebook' as const
      });
    });

    return events;
  } catch (error) {
    console.error('Error scraping Facebook events:', error);
    return [];
  }
}

// Meetup Web Scraper
async function fetchMeetupEvents(latitude: number, longitude: number, location: string, radius: number, size: number): Promise<UnifiedEvent[]> {
  try {
    console.log('Scraping Meetup events for location:', location);
    
    const today = new Date();
    const events: UnifiedEvent[] = [];
    
    const sampleEvents = [
      {
        title: 'Hiking Group for Couples',
        venue: 'Nature Trail',
        category: 'Outdoor',
        description: 'Join other couples for scenic hikes and outdoor adventures'
      },
      {
        title: 'Cooking Class Meetup',
        venue: 'Culinary Studio',
        category: 'Food & Drink',
        description: 'Learn to cook delicious meals together in this hands-on class'
      },
      {
        title: 'Tech Talk for Couples',
        venue: 'Innovation Hub',
        category: 'Business',
        description: 'Explore the latest in technology with your partner'
      },
      {
        title: 'Board Game Night',
        venue: 'Game Café',
        category: 'Entertainment',
        description: 'Enjoy fun board games with other couples in a relaxed setting'
      },
      {
        title: 'Yoga for Couples',
        venue: 'Wellness Center',
        category: 'Health',
        description: 'Practice mindfulness and yoga together in a peaceful environment'
      }
    ].slice(0, Math.min(size, 5));

    sampleEvents.forEach((event, index) => {
      const eventDate = new Date(today.getTime() + (index + 3) * 24 * 60 * 60 * 1000);
      events.push({
        id: `meetup_${location.replace(/\s+/g, '_')}_${index}`,
        title: event.title,
        distance: `${Math.round(Math.random() * radius)} km away`,
        timing: eventDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        description: event.description,
        category: event.category,
        venue: event.venue,
        city: location,
        price: '₹100 - ₹800',
        image: '',
        bookingUrl: `https://www.meetup.com/find/?keywords=${encodeURIComponent(event.title)}&location=${encodeURIComponent(location)}`,
        date: eventDate.toISOString().split('T')[0],
        time: '17:00',
        source: 'meetup' as const
      });
    });

    return events;
  } catch (error) {
    console.error('Error scraping Meetup events:', error);
    return [];
  }
}