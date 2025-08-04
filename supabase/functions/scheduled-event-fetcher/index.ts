import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
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
    baseUrl: 'https://www.eventbrite.com',
    fetchFunction: fetchEventbriteEvents
  },
  {
    name: 'ticketmaster',
    baseUrl: 'https://www.ticketmaster.com',
    fetchFunction: fetchTicketmasterEvents
  },
  {
    name: 'bookmyshow',
    baseUrl: 'https://in.bookmyshow.com',
    fetchFunction: fetchBookMyShowEvents
  },
  {
    name: 'meetup',
    baseUrl: 'https://www.meetup.com',
    fetchFunction: fetchMeetupEvents
  }
];

async function fetchEventbriteEvents(city: string, country: string): Promise<any[]> {
  if (!firecrawlApiKey) return [];
  
  try {
    const searchUrl = `https://www.eventbrite.com/d/${city.toLowerCase()}-${country.toLowerCase()}--events/`;
    const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['extract'],
        extract: {
          schema: {
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  date: { type: 'string' },
                  time: { type: 'string' },
                  venue: { type: 'string' },
                  price: { type: 'string' },
                  category: { type: 'string' },
                  booking_url: { type: 'string' }
                }
              }
            }
          }
        }
      }),
    });

    if (!response.ok) return [];
    
    const data = await response.json();
    return data.data?.extract?.events || [];
  } catch (error) {
    console.error('Eventbrite fetch error:', error);
    return [];
  }
}

async function fetchTicketmasterEvents(city: string, country: string): Promise<any[]> {
  // Placeholder for Ticketmaster API integration
  // Would require official Ticketmaster API integration
  return [];
}

async function fetchBookMyShowEvents(city: string, country: string): Promise<any[]> {
  if (!firecrawlApiKey) return [];
  
  try {
    const searchUrl = `https://in.bookmyshow.com/${city.toLowerCase()}/events`;
    const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['extract'],
        extract: {
          schema: {
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  date: { type: 'string' },
                  time: { type: 'string' },
                  venue: { type: 'string' },
                  price: { type: 'string' },
                  category: { type: 'string' },
                  booking_url: { type: 'string' }
                }
              }
            }
          }
        }
      }),
    });

    if (!response.ok) return [];
    
    const data = await response.json();
    return data.data?.extract?.events || [];
  } catch (error) {
    console.error('BookMyShow fetch error:', error);
    return [];
  }
}

async function fetchMeetupEvents(city: string, country: string): Promise<any[]> {
  if (!firecrawlApiKey) return [];
  
  try {
    const searchUrl = `https://www.meetup.com/find/?location=${city}, ${country}&source=EVENTS`;
    const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['extract'],
        extract: {
          schema: {
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  date: { type: 'string' },
                  time: { type: 'string' },
                  venue: { type: 'string' },
                  category: { type: 'string' },
                  booking_url: { type: 'string' }
                }
              }
            }
          }
        }
      }),
    });

    if (!response.ok) return [];
    
    const data = await response.json();
    return data.data?.extract?.events || [];
  } catch (error) {
    console.error('Meetup fetch error:', error);
    return [];
  }
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
          if (!event.title) continue;
          
          // Get coordinates for the venue
          const coordinates = await getCoordinatesFromGoogle(`${event.venue || city}, ${countryConfig.country_name}`);
          
          // Parse and validate date
          const eventDate = parseEventDate(event.date);
          if (!eventDate) continue;
          
          // Categorize the event
          const category = categorizeEvent(event.title, event.description, event.category);
          
          // Insert event into database
          const { error } = await supabase
            .from('events')
            .upsert({
              external_id: `${source.name}-${event.title}-${eventDate}-${city}`,
              title: event.title,
              description: event.description || '',
              category: category,
              venue: event.venue || '',
              location_name: `${city}, ${countryConfig.country_name}`,
              location_lat: coordinates?.lat,
              location_lng: coordinates?.lng,
              event_date: eventDate,
              event_time: event.time || '',
              price: event.price || 'Free',
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