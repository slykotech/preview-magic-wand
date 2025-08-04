import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const eventbriteApiKey = Deno.env.get('EVENTBRITE_API_KEY');
const ticketmasterApiKey = Deno.env.get('TICKETMASTER_API_KEY');
const googleApiKey = Deno.env.get('GOOGLE_EVENTS_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventSource {
  name: string;
  baseUrl: string;
  fetchFunction: (city: string, country: string) => Promise<any[]>;
}

// Event sources configuration
const eventSources: EventSource[] = [
  {
    name: 'eventbrite',
    baseUrl: 'https://www.eventbriteapi.com',
    fetchFunction: fetchEventbriteEvents
  },
  {
    name: 'ticketmaster',
    baseUrl: 'https://app.ticketmaster.com',
    fetchFunction: fetchTicketmasterEvents
  },
  {
    name: 'google',
    baseUrl: 'https://maps.googleapis.com',
    fetchFunction: fetchGoogleEvents
  }
];

async function fetchEventbriteEvents(city: string, country: string): Promise<any[]> {
  if (!eventbriteApiKey) {
    console.log('Eventbrite API key not configured');
    return [];
  }
  
  try {
    console.log(`Fetching Eventbrite events for ${city}, ${country}`);
    
    // Get coordinates for the city first
    const coordinates = await getCoordinatesFromGoogle(`${city}, ${country}`);
    if (!coordinates) {
      console.log(`Could not get coordinates for ${city}, ${country}`);
      return [];
    }
    
    const searchUrl = `https://www.eventbriteapi.com/v3/events/search/`;
    const params = new URLSearchParams({
      'location.latitude': coordinates.lat.toString(),
      'location.longitude': coordinates.lng.toString(),
      'location.within': '25km',
      'start_date.range_start': new Date().toISOString(),
      'start_date.range_end': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      'sort_by': 'date',
      'expand': 'venue,category,ticket_availability',
      'page_size': '50'
    });
    
    const response = await fetch(`${searchUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${eventbriteApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Eventbrite API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    const events = data.events || [];
    
    console.log(`Found ${events.length} Eventbrite events for ${city}`);
    
    return events.map((event: any) => ({
      title: event.name?.text || '',
      description: event.description?.text || '',
      date: event.start?.local || '',
      time: event.start?.local ? new Date(event.start.local).toLocaleTimeString() : '',
      venue: event.venue?.name || '',
      venue_address: event.venue?.address ? `${event.venue.address.address_1}, ${event.venue.address.city}` : '',
      price: event.ticket_availability?.minimum_ticket_price ? `$${(event.ticket_availability.minimum_ticket_price.major_value / 100).toFixed(2)}` : 'Free',
      category: event.category?.name || 'other',
      booking_url: event.url || '',
      image_url: event.logo?.url || '',
      latitude: event.venue?.latitude ? parseFloat(event.venue.latitude) : coordinates.lat,
      longitude: event.venue?.longitude ? parseFloat(event.venue.longitude) : coordinates.lng
    }));
  } catch (error) {
    console.error('Eventbrite fetch error:', error);
    return [];
  }
}

async function fetchTicketmasterEvents(city: string, country: string): Promise<any[]> {
  if (!ticketmasterApiKey) {
    console.log('Ticketmaster API key not configured');
    return [];
  }
  
  try {
    console.log(`Fetching Ticketmaster events for ${city}, ${country}`);
    
    const baseUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';
    const params = new URLSearchParams({
      'apikey': ticketmasterApiKey,
      'city': city,
      'countryCode': getCountryCode(country),
      'size': '50',
      'sort': 'date,asc',
      'startDateTime': new Date().toISOString(),
      'endDateTime': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    const response = await fetch(`${baseUrl}?${params}`);
    
    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    const events = data._embedded?.events || [];
    
    console.log(`Found ${events.length} Ticketmaster events for ${city}`);
    
    return events.map((event: any) => ({
      title: event.name || '',
      description: event.info || event.pleaseNote || '',
      date: event.dates?.start?.localDate || '',
      time: event.dates?.start?.localTime || '',
      venue: event._embedded?.venues?.[0]?.name || '',
      venue_address: event._embedded?.venues?.[0]?.address ? 
        `${event._embedded.venues[0].address.line1}, ${event._embedded.venues[0].city?.name}` : '',
      price: event.priceRanges?.[0] ? 
        `$${event.priceRanges[0].min} - $${event.priceRanges[0].max}` : 'Check website',
      category: event.classifications?.[0]?.segment?.name || 'other',
      booking_url: event.url || '',
      image_url: event.images?.[0]?.url || '',
      latitude: event._embedded?.venues?.[0]?.location?.latitude ? 
        parseFloat(event._embedded.venues[0].location.latitude) : null,
      longitude: event._embedded?.venues?.[0]?.location?.longitude ? 
        parseFloat(event._embedded.venues[0].location.longitude) : null
    }));
  } catch (error) {
    console.error('Ticketmaster fetch error:', error);
    return [];
  }
}

async function fetchGoogleEvents(city: string, country: string): Promise<any[]> {
  // DISABLED: Google Places API was creating mock events and event management companies
  console.log(`Google Events API disabled to prevent mock data creation for ${city}, ${country}`);
  return [];
}

function getCountryCode(country: string): string {
  const countryMap: { [key: string]: string } = {
    'United States': 'US',
    'Canada': 'CA',
    'United Kingdom': 'GB',
    'Australia': 'AU',
    'India': 'IN',
    'Germany': 'DE',
    'France': 'FR',
    'Spain': 'ES',
    'Italy': 'IT',
    'Netherlands': 'NL',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'Japan': 'JP',
    'South Korea': 'KR',
    'Singapore': 'SG'
  };
  
  return countryMap[country] || 'US';
}

function isValidEvent(event: any): boolean {
  // Validate that event has required fields and is in the future
  if (!event.title || !event.date) return false;
  
  const eventDate = new Date(event.date);
  const now = new Date();
  
  // Event must be in the future
  if (eventDate <= now) return false;
  
  // Event must be within next 3 months
  const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (eventDate > threeMonthsFromNow) return false;
  
  // Strict filtering - reject event management companies and generic places
  const invalidTerms = [
    'event management', 'event company', 'event studio', 'event ustaad', 
    'event sculptors', 'epicreation events', 'eventsyug', 'tani events',
    'tradition n trendz', 'onstaage', 'on the move', 'onstage experiences',
    'corporate event', 'event planner', 'event designer', 'event organizer',
    'management company', 'pvt ltd', 'llp', 'private limited', 'entertainment company',
    'occasionz events', 'entertainment pvt', 'events and design'
  ];
  
  const titleLower = event.title.toLowerCase();
  const descLower = (event.description || '').toLowerCase();
  
  // Check if title or description contains invalid terms
  for (const term of invalidTerms) {
    if (titleLower.includes(term) || descLower.includes(term)) {
      console.log(`Rejecting event management company: ${event.title}`);
      return false;
    }
  }
  
  // Filter out generic/template events
  const genericTitles = ['visit', 'tour', 'explore', 'discover', 'experience', 'highly rated attraction'];
  if (genericTitles.some(generic => titleLower.includes(generic))) {
    console.log(`Rejecting generic event: ${event.title}`);
    return false;
  }
  
  return true;
}

async function getCoordinatesFromGoogle(address: string): Promise<{lat: number, lng: number} | null> {
  if (!googleApiKey) return null;
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`
    );
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
  } catch (error) {
    console.error('Google Geocoding error:', error);
  }
  
  return null;
}

function categorizeEvent(title: string, description: string = '', category: string = ''): string {
  const text = `${title} ${description} ${category}`.toLowerCase();
  
  if (text.includes('music') || text.includes('concert') || text.includes('band') || text.includes('dj')) {
    return 'music';
  }
  if (text.includes('food') || text.includes('restaurant') || text.includes('dining') || text.includes('culinary')) {
    return 'food';
  }
  if (text.includes('art') || text.includes('gallery') || text.includes('museum') || text.includes('exhibition')) {
    return 'art';
  }
  if (text.includes('comedy') || text.includes('stand-up') || text.includes('humor')) {
    return 'comedy';
  }
  if (text.includes('dance') || text.includes('dancing') || text.includes('ballroom')) {
    return 'dance';
  }
  if (text.includes('theater') || text.includes('theatre') || text.includes('play') || text.includes('drama')) {
    return 'theater';
  }
  if (text.includes('outdoors') || text.includes('hiking') || text.includes('adventure') || text.includes('nature')) {
    return 'outdoor';
  }
  if (text.includes('romance') || text.includes('couples') || text.includes('date') || text.includes('valentine')) {
    return 'romantic';
  }
  if (text.includes('sports') || text.includes('game') || text.includes('match') || text.includes('tournament')) {
    return 'sports';
  }
  if (text.includes('workshop') || text.includes('class') || text.includes('learn') || text.includes('education')) {
    return 'educational';
  }
  
  return 'other';
}

function parseEventDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  try {
    // Try various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try parsing common formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
      /(\d{4})-(\d{2})-(\d{2})/,        // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{4})/     // DD-MM-YYYY
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const [, first, second, year] = match;
        const date = new Date(parseInt(year), parseInt(second) - 1, parseInt(first));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
  } catch (error) {
    console.error('Date parsing error:', error);
  }
  
  return null;
}

async function fetchEventsForCountry(countryConfig: any): Promise<number> {
  console.log(`Fetching events for ${countryConfig.country_name}`);
  
  let totalEventsFetched = 0;
  
  for (const city of countryConfig.major_cities) {
    console.log(`Fetching events for ${city}, ${countryConfig.country_name}`);
    
    for (const source of eventSources) {
      try {
        const events = await source.fetchFunction(city, countryConfig.country_name);
        
        for (const event of events) {
          // Validate event before processing
          if (!isValidEvent(event)) {
            console.log(`Skipping invalid event: ${event.title || 'No title'}`);
            continue;
          }
          
          // Parse and validate date
          const eventDate = parseEventDate(event.date);
          if (!eventDate) {
            console.log(`Skipping event with invalid date: ${event.title}`);
            continue;
          }
          
          // Use coordinates from API if available, otherwise geocode
          let coordinates = null;
          if (event.latitude && event.longitude) {
            coordinates = { lat: event.latitude, lng: event.longitude };
          } else if (event.venue_address) {
            coordinates = await getCoordinatesFromGoogle(event.venue_address);
          } else {
            coordinates = await getCoordinatesFromGoogle(`${event.venue || city}, ${countryConfig.country_name}`);
          }
          
          // Categorize the event
          const category = categorizeEvent(event.title, event.description, event.category);
          
          // Create unique external ID
          const externalId = `${source.name}-${event.title.replace(/[^a-zA-Z0-9]/g, '')}-${eventDate}-${city}`.toLowerCase();
          
          // Insert event into database
          const { error } = await supabase
            .from('events')
            .upsert({
              external_id: externalId,
              title: event.title,
              description: event.description || '',
              category: category,
              venue: event.venue || '',
              location_name: event.venue_address || `${city}, ${countryConfig.country_name}`,
              location_lat: coordinates?.lat,
              location_lng: coordinates?.lng,
              event_date: eventDate,
              event_time: event.time || '',
              price: event.price || 'Free',
              image_url: event.image_url || null,
              booking_url: event.booking_url || '',
              source: source.name,
              city: city,
              country: countryConfig.country_name,
              country_code: countryConfig.country_code,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            }, {
              onConflict: 'external_id',
              ignoreDuplicates: false
            });
          
          if (!error) {
            totalEventsFetched++;
            console.log(`✓ Added event: ${event.title} in ${city}`);
          } else {
            console.error('Database insert error:', error);
          }
        }
        
        // Small delay between sources to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error fetching from ${source.name} for ${city}:`, error);
      }
    }
    
    // Delay between cities
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return totalEventsFetched;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled event fetcher...');
    
    // Get active country configurations
    const { data: countryConfigs, error: configError } = await supabase
      .from('country_event_config')
      .select('*')
      .eq('is_active', true)
      .order('country_name');
    
    if (configError) {
      throw new Error(`Failed to fetch country configs: ${configError.message}`);
    }
    
    if (!countryConfigs || countryConfigs.length === 0) {
      console.log('No active country configurations found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active countries to process',
        eventsFetched: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let totalEvents = 0;
    
    // Process each country
    for (const countryConfig of countryConfigs) {
      try {
        const eventsForCountry = await fetchEventsForCountry(countryConfig);
        totalEvents += eventsForCountry;
        console.log(`Fetched ${eventsForCountry} events for ${countryConfig.country_name}`);
      } catch (error) {
        console.error(`Error processing ${countryConfig.country_name}:`, error);
      }
    }
    
    // Log the job completion
    await supabase
      .from('event_fetch_jobs')
      .insert({
        job_type: 'scheduled',
        target_location: 'global',
        status: 'completed',
        events_fetched: totalEvents,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        sources_used: eventSources.map(s => s.name)
      });
    
    console.log(`Event fetching completed. Total events fetched: ${totalEvents}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully fetched ${totalEvents} events`,
      eventsFetched: totalEvents,
      countriesProcessed: countryConfigs.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in scheduled event fetcher:', error);
    
    // Log the failed job
    await supabase
      .from('event_fetch_jobs')
      .insert({
        job_type: 'scheduled',
        target_location: 'global',
        status: 'failed',
        error_message: error.message,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});