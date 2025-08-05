import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventbriteEvent {
  id: string;
  name: {
    text: string;
  };
  description: {
    text?: string;
  };
  url: string;
  start: {
    local: string;
    timezone: string;
  };
  end: {
    local: string;
    timezone: string;
  };
  venue?: {
    name?: string;
    address?: {
      address_1?: string;
      city?: string;
      region?: string;
      country?: string;
      latitude?: string;
      longitude?: string;
    };
  };
  ticket_availability?: {
    has_available_tickets: boolean;
    minimum_ticket_price?: {
      currency: string;
      value: number;
    };
    maximum_ticket_price?: {
      currency: string;
      value: number;
    };
  };
  category?: {
    name: string;
  };
  subcategory?: {
    name: string;
  };
  logo?: {
    url: string;
  };
  organizer?: {
    name: string;
  };
  is_free: boolean;
}

interface EventbriteResponse {
  events: EventbriteEvent[];
  pagination: {
    page_number: number;
    page_size: number;
    page_count: number;
    object_count: number;
    has_more_items: boolean;
  };
}

const MAJOR_CITIES_COORDS = {
  'IN': [
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 }
  ],
  'US': [
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
    { name: 'Houston', lat: 29.7604, lng: -95.3698 },
    { name: 'Phoenix', lat: 33.4484, lng: -112.0740 },
    { name: 'Philadelphia', lat: 39.9526, lng: -75.1652 },
    { name: 'San Antonio', lat: 29.4241, lng: -98.4936 },
    { name: 'Dallas', lat: 32.7767, lng: -96.7970 }
  ],
  'GB': [
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
    { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
    { name: 'Glasgow', lat: 55.8642, lng: -4.2518 },
    { name: 'Leeds', lat: 53.8008, lng: -1.5491 },
    { name: 'Liverpool', lat: 53.4084, lng: -2.9916 }
  ],
  'AU': [
    { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
    { name: 'Brisbane', lat: -27.4698, lng: 153.0251 },
    { name: 'Perth', lat: -31.9505, lng: 115.8605 },
    { name: 'Adelaide', lat: -34.9285, lng: 138.6007 }
  ],
  'FR': [
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'Lyon', lat: 45.7640, lng: 4.8357 },
    { name: 'Marseille', lat: 43.2965, lng: 5.3698 }
  ],
  'DE': [
    { name: 'Berlin', lat: 52.5200, lng: 13.4050 },
    { name: 'Munich', lat: 48.1351, lng: 11.5820 },
    { name: 'Hamburg', lat: 53.5511, lng: 9.9937 }
  ],
  'ES': [
    { name: 'Madrid', lat: 40.4168, lng: -3.7038 },
    { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
    { name: 'Valencia', lat: 39.4699, lng: -0.3763 }
  ],
  'IT': [
    { name: 'Rome', lat: 41.9028, lng: 12.4964 },
    { name: 'Milan', lat: 45.4642, lng: 9.1900 },
    { name: 'Naples', lat: 40.8518, lng: 14.2681 }
  ],
  'NL': [
    { name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
    { name: 'Rotterdam', lat: 51.9244, lng: 4.4777 }
  ]
};

async function scrapeEventbriteEvents(supabase: any, apiKey: string, country: string, region?: string, city?: string) {
  console.log(`Scraping Eventbrite events for ${country}${region ? `, ${region}` : ''}${city ? `, ${city}` : ''}`);
  
  const cities = city ? [{ name: city, lat: 0, lng: 0 }] : (MAJOR_CITIES_COORDS[country] || []);
  const allEvents = [];
  
  for (const cityInfo of cities) {
    try {
      let page = 1;
      let hasMore = true;
      
      while (hasMore && page <= 3) { // Limit to 3 pages per city
        const params = new URLSearchParams({
          'location.latitude': cityInfo.lat.toString(),
          'location.longitude': cityInfo.lng.toString(),
          'location.within': '25km',
          'start_date.range_start': new Date().toISOString(),
          'start_date.range_end': new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ahead
          'page': page.toString(),
          'expand': 'venue,organizer,ticket_availability,category,subcategory',
          'order_by': 'start_asc'
        });
        
        const response = await fetch(
          `https://www.eventbriteapi.com/v3/events/search/?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
            }
          }
        );
        
        if (!response.ok) {
          console.error(`Eventbrite API error for ${cityInfo.name}: ${response.status}`);
          break;
        }
        
        const data: EventbriteResponse = await response.json();
        
        if (!data.events || data.events.length === 0) {
          hasMore = false;
          break;
        }
        
        for (const event of data.events) {
          const venue = event.venue;
          const ticketInfo = event.ticket_availability;
          
          // Parse date and time
          const startDate = new Date(event.start.local);
          const eventDate = startDate.toISOString().split('T')[0];
          const eventTime = startDate.toTimeString().split(' ')[0];
          
          let priceRange = null;
          if (event.is_free) {
            priceRange = 'Free';
          } else if (ticketInfo?.minimum_ticket_price && ticketInfo?.maximum_ticket_price) {
            priceRange = `${ticketInfo.minimum_ticket_price.currency} ${ticketInfo.minimum_ticket_price.value}-${ticketInfo.maximum_ticket_price.value}`;
          }
          
          const eventData = {
            external_event_id: event.id,
            title: event.name.text,
            description: event.description?.text || null,
            event_date: eventDate,
            event_time: eventTime,
            location_name: venue?.name || cityInfo.name,
            location_address: venue?.address?.address_1 || null,
            city: venue?.address?.city || cityInfo.name,
            region: venue?.address?.region || region || null,
            country: venue?.address?.country || country,
            latitude: venue?.address?.latitude ? parseFloat(venue.address.latitude) : cityInfo.lat,
            longitude: venue?.address?.longitude ? parseFloat(venue.address.longitude) : cityInfo.lng,
            category: event.category?.name?.toLowerCase() || 'entertainment',
            tags: [event.category?.name, event.subcategory?.name].filter(Boolean),
            source_platform: 'eventbrite',
            source_url: event.url,
            ticket_url: event.url,
            image_url: event.logo?.url || null,
            price_range: priceRange,
            organizer: event.organizer?.name || 'Eventbrite',
            venue_details: venue ? {
              name: venue.name,
              address: venue.address?.address_1,
              city: venue.address?.city,
              region: venue.address?.region,
              country: venue.address?.country,
              coordinates: venue.address?.latitude && venue.address?.longitude ? {
                latitude: parseFloat(venue.address.latitude),
                longitude: parseFloat(venue.address.longitude)
              } : null
            } : {}
          };
          
          allEvents.push(eventData);
        }
        
        hasMore = data.pagination.has_more_items;
        page++;
        
        // Rate limiting: Wait between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`Found ${allEvents.length} events from Eventbrite for ${cityInfo.name}`);
      
    } catch (error) {
      console.error(`Error scraping Eventbrite for ${cityInfo.name}:`, error);
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
    
    const apiKey = Deno.env.get('EVENTBRITE_API_KEY');
    if (!apiKey) {
      throw new Error('EVENTBRITE_API_KEY is not configured');
    }
    
    const { country, region, city } = await req.json();
    
    if (!country) {
      return new Response(
        JSON.stringify({ error: 'Country is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Starting Eventbrite scraping for ${country}${region ? `, ${region}` : ''}${city ? `, ${city}` : ''}`);
    
    const events = await scrapeEventbriteEvents(supabase, apiKey, country, region, city);
    
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
    
    console.log(`Inserted ${insertedCount} new events from Eventbrite`);
    
    return new Response(
      JSON.stringify({
        success: true,
        source: 'eventbrite',
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
    console.error('Eventbrite scraping error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});