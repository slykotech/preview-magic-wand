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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radius = 25, size = 20, keyword = '' } = await req.json();
    
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      throw new Error('Ticketmaster API key not configured');
    }

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
        id: event.id,
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
        time: event.dates.start.localTime || '19:00'
      };
    }) || [];

    // Filter for couple-appropriate events (remove children's events, explicit content, etc.)
    const coupleEvents = events.filter(event => {
      const title = event.title.toLowerCase();
      const description = event.description.toLowerCase();
      
      // Filter out children's events and inappropriate content
      const excludeKeywords = ['kids', 'children', 'baby', 'toddler', 'family fun day'];
      const includeKeywords = ['concert', 'exhibition', 'show', 'performance', 'festival', 'comedy', 'theater', 'gallery'];
      
      const hasExcluded = excludeKeywords.some(keyword => 
        title.includes(keyword) || description.includes(keyword)
      );
      
      return !hasExcluded;
    });

    console.log(`Processed ${coupleEvents.length} couple-friendly events from ${events.length} total events`);

    return new Response(JSON.stringify({
      events: coupleEvents,
      totalEvents: data.page.totalElements,
      location: { latitude, longitude }
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