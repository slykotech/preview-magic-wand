import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketmasterEvent {
  id: string;
  name: string;
  description?: string;
  url: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name: string;
      address?: {
        line1?: string;
      };
      city?: {
        name: string;
      };
      state?: {
        name: string;
      };
      country?: {
        name: string;
        countryCode: string;
      };
      location?: {
        latitude: string;
        longitude: string;
      };
    }>;
  };
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  classifications?: Array<{
    segment?: {
      name: string;
    };
    genre?: {
      name: string;
    };
  }>;
  images?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
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

const MAJOR_CITIES = {
  'US': [
    { name: 'New York', code: 'NYC', stateCode: 'NY' },
    { name: 'Los Angeles', code: 'LA', stateCode: 'CA' },
    { name: 'Chicago', code: 'CHI', stateCode: 'IL' },
    { name: 'Houston', code: 'HOU', stateCode: 'TX' },
    { name: 'Phoenix', code: 'PHX', stateCode: 'AZ' },
    { name: 'Philadelphia', code: 'PHL', stateCode: 'PA' },
    { name: 'San Antonio', code: 'SAT', stateCode: 'TX' },
    { name: 'Dallas', code: 'DAL', stateCode: 'TX' }
  ],
  'CA': [
    { name: 'Toronto', code: 'TOR' },
    { name: 'Vancouver', code: 'VAN' },
    { name: 'Montreal', code: 'MTL' },
    { name: 'Calgary', code: 'CAL' },
    { name: 'Ottawa', code: 'OTT' }
  ],
  'GB': [
    { name: 'London', code: 'LON' },
    { name: 'Birmingham', code: 'BIR' },
    { name: 'Manchester', code: 'MAN' },
    { name: 'Glasgow', code: 'GLA' },
    { name: 'Leeds', code: 'LEE' }
  ],
  'AU': [
    { name: 'Sydney', code: 'SYD' },
    { name: 'Melbourne', code: 'MEL' },
    { name: 'Brisbane', code: 'BRI' },
    { name: 'Perth', code: 'PER' },
    { name: 'Adelaide', code: 'ADE' }
  ]
};

async function scrapeTicketmasterEvents(supabase: any, apiKey: string, country: string, region?: string, city?: string) {
  console.log(`Scraping Ticketmaster events for ${country}${region ? `, ${region}` : ''}${city ? `, ${city}` : ''}`);
  
  const cities = city ? [{ name: city }] : (MAJOR_CITIES[country] || []);
  const allEvents = [];
  
  for (const cityInfo of cities) {
    try {
      let page = 0;
      let hasMore = true;
      
      while (hasMore && page < 5) { // Limit to 5 pages per city
        const params = new URLSearchParams({
          apikey: apiKey,
          countryCode: country,
          city: cityInfo.name,
          page: page.toString(),
          size: '200',
          sort: 'date,asc',
          startDateTime: new Date().toISOString().split('T')[0] + 'T00:00:00Z'
        });
        
        if (cityInfo.stateCode) {
          params.append('stateCode', cityInfo.stateCode);
        }
        
        const response = await fetch(
          `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        
        if (!response.ok) {
          console.error(`Ticketmaster API error for ${cityInfo.name}: ${response.status}`);
          break;
        }
        
        const data: TicketmasterResponse = await response.json();
        
        if (!data._embedded?.events || data._embedded.events.length === 0) {
          hasMore = false;
          break;
        }
        
        for (const event of data._embedded.events) {
          const venue = event._embedded?.venues?.[0];
          const priceRange = event.priceRanges?.[0];
          const classification = event.classifications?.[0];
          const image = event.images?.find(img => img.width >= 400);
          
          const eventData = {
            external_event_id: event.id,
            title: event.name,
            description: event.description || null,
            event_date: event.dates.start.localDate,
            event_time: event.dates.start.localTime || null,
            location_name: venue?.name || 'TBD',
            location_address: venue?.address?.line1 || null,
            city: venue?.city?.name || cityInfo.name,
            region: venue?.state?.name || region || null,
            country: venue?.country?.countryCode || country,
            latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
            longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
            category: classification?.segment?.name?.toLowerCase() || 'entertainment',
            tags: classification ? [classification.segment?.name, classification.genre?.name].filter(Boolean) : [],
            source_platform: 'ticketmaster',
            source_url: event.url,
            ticket_url: event.url,
            image_url: image?.url || null,
            price_range: priceRange ? `${priceRange.currency} ${priceRange.min}-${priceRange.max}` : null,
            organizer: 'Ticketmaster',
            venue_details: venue ? {
              name: venue.name,
              address: venue.address?.line1,
              city: venue.city?.name,
              state: venue.state?.name,
              country: venue.country?.name,
              coordinates: venue.location ? {
                latitude: parseFloat(venue.location.latitude),
                longitude: parseFloat(venue.location.longitude)
              } : null
            } : {}
          };
          
          allEvents.push(eventData);
        }
        
        hasMore = page < data.page.totalPages - 1;
        page++;
        
        // Rate limiting: Wait between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log(`Found ${allEvents.length} events from Ticketmaster for ${cityInfo.name}`);
      
    } catch (error) {
      console.error(`Error scraping Ticketmaster for ${cityInfo.name}:`, error);
    }
  }
  
  return allEvents;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      throw new Error('TICKETMASTER_API_KEY is not configured');
    }
    
    const { country, region, city } = await req.json();
    
    if (!country) {
      return new Response(
        JSON.stringify({ error: 'Country is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Starting Ticketmaster scraping for ${country}${region ? `, ${region}` : ''}${city ? `, ${city}` : ''}`);
    
    const events = await scrapeTicketmasterEvents(supabase, apiKey, country, region, city);
    
    // Insert events into database
    let insertedCount = 0;
    for (const event of events) {
      try {
        // Check for duplicates using the database function
        const { data: duplicateId } = await supabase.rpc('find_duplicate_event', {
          p_title: event.title,
          p_event_date: event.event_date,
          p_location_name: event.location_name,
          p_latitude: event.latitude,
          p_longitude: event.longitude,
          p_organizer: event.organizer
        });
        
        if (!duplicateId) {
          const { error: insertError } = await supabase
            .from('events')
            .insert(event);
          
          if (!insertError) {
            insertedCount++;
          } else {
            console.error('Error inserting event:', insertError);
          }
        }
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }
    
    console.log(`Inserted ${insertedCount} new events from Ticketmaster`);
    
    return new Response(
      JSON.stringify({
        success: true,
        source: 'ticketmaster',
        totalFound: events.length,
        newEventsInserted: insertedCount,
        country,
        region,
        city
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Ticketmaster scraping error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});