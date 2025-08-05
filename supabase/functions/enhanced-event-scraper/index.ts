import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapedEvent {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location_name: string;
  location_address: string;
  latitude: number;
  longitude: number;
  category: string;
  price_range: string;
  organizer: string;
  source_url: string;
  source_platform: string;
  image_url: string | null;
  tags: string[];
  external_event_id?: string;
}

// Enhanced duplicate detection
function generateEventHash(title: string, date: string, location: string, organizer?: string): string {
  const normalized = [
    title.toLowerCase().trim().replace(/[^\w\s]/g, ''),
    date,
    location.toLowerCase().trim().replace(/[^\w\s]/g, ''),
    (organizer || '').toLowerCase().trim().replace(/[^\w\s]/g, '')
  ].join('|');
  
  return btoa(normalized).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

// Enhanced Eventbrite scraping with better error handling
async function scrapeEventbrite(lat: number, lng: number, radius: number = 50): Promise<ScrapedEvent[]> {
  console.log(`Scraping Eventbrite for ${lat}, ${lng} within ${radius}km`);
  
  const apiKey = Deno.env.get('EVENTBRITE_API_KEY');
  if (!apiKey) {
    console.log('Eventbrite API key not configured');
    return [];
  }

  try {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?location.latitude=${lat}&location.longitude=${lng}&location.within=${radius}km&start_date.range_start=${today.toISOString()}&start_date.range_end=${nextMonth.toISOString()}&expand=venue,organizer&sort_by=date&page_size=50`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Eventbrite API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const events = data.events || [];
    
    console.log(`Found ${events.length} events from Eventbrite`);
    
    return events.map((event: any) => ({
      title: event.name?.text || 'Untitled Event',
      description: event.description?.text || event.summary || '',
      event_date: new Date(event.start.utc).toISOString().split('T')[0],
      event_time: new Date(event.start.utc).toTimeString().split(' ')[0],
      location_name: event.venue?.name || 'TBD',
      location_address: event.venue?.address?.localized_address_display || '',
      latitude: parseFloat(event.venue?.latitude || lat),
      longitude: parseFloat(event.venue?.longitude || lng),
      category: event.category?.name?.toLowerCase() || 'entertainment',
      price_range: event.ticket_availability?.minimum_ticket_price?.display || 'Free',
      organizer: event.organizer?.name || '',
      source_url: event.url || '',
      source_platform: 'eventbrite',
      image_url: event.logo?.url || null,
      tags: event.tags?.map((tag: any) => tag.display_name) || [],
      external_event_id: event.id
    }));
  } catch (error) {
    console.error('Eventbrite scraping error:', error);
    return [];
  }
}

// Enhanced Ticketmaster scraping
async function scrapeTicketmaster(lat: number, lng: number, radius: number = 50): Promise<ScrapedEvent[]> {
  console.log(`Scraping Ticketmaster for ${lat}, ${lng} within ${radius}km`);
  
  const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
  if (!apiKey) {
    console.log('Ticketmaster API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?latlong=${lat},${lng}&radius=${radius}&unit=km&size=50&sort=date,asc&apikey=${apiKey}`
    );

    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const events = data._embedded?.events || [];
    
    console.log(`Found ${events.length} events from Ticketmaster`);
    
    return events.map((event: any) => {
      const venue = event._embedded?.venues?.[0] || {};
      
      return {
        title: event.name || 'Untitled Event',
        description: event.info || event.pleaseNote || '',
        event_date: event.dates?.start?.localDate || new Date().toISOString().split('T')[0],
        event_time: event.dates?.start?.localTime || '19:00:00',
        location_name: venue.name || 'TBD',
        location_address: venue.address ? `${venue.address.line1 || ''}, ${venue.city?.name || ''}, ${venue.state?.name || ''}`.trim() : '',
        latitude: parseFloat(venue.location?.latitude || lat),
        longitude: parseFloat(venue.location?.longitude || lng),
        category: event.classifications?.[0]?.segment?.name?.toLowerCase() || 'entertainment',
        price_range: event.priceRanges?.[0] ? `$${event.priceRanges[0].min} - $${event.priceRanges[0].max}` : 'Varies',
        organizer: event.promoter?.name || '',
        source_url: event.url || '',
        source_platform: 'ticketmaster',
        image_url: event.images?.[0]?.url || null,
        tags: event.classifications?.map((c: any) => c.genre?.name).filter(Boolean) || [],
        external_event_id: event.id
      };
    });
  } catch (error) {
    console.error('Ticketmaster scraping error:', error);
    return [];
  }
}

// Mock event generator for testing and filling gaps
function generateMockEvents(lat: number, lng: number, count: number = 10): ScrapedEvent[] {
  const categories = ['entertainment', 'music', 'food', 'sports', 'cultural', 'romantic'];
  const venues = ['City Center', 'Downtown Plaza', 'Community Hall', 'Park Pavilion', 'Arts Center'];
  const events = [];
  
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 30));
    
    const category = categories[Math.floor(Math.random() * categories.length)];
    const venue = venues[Math.floor(Math.random() * venues.length)];
    
    events.push({
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Event at ${venue}`,
      description: `Join us for an amazing ${category} experience at ${venue}. Perfect for couples looking for fun activities!`,
      event_date: date.toISOString().split('T')[0],
      event_time: '19:00:00',
      location_name: venue,
      location_address: `123 Main St, City Center`,
      latitude: lat + (Math.random() - 0.5) * 0.1,
      longitude: lng + (Math.random() - 0.5) * 0.1,
      category,
      price_range: Math.random() > 0.3 ? `$${Math.floor(Math.random() * 50 + 10)}` : 'Free',
      organizer: 'Local Events',
      source_url: '',
      source_platform: 'mock',
      image_url: null,
      tags: [category, 'couples', 'date'],
      external_event_id: `mock_${Date.now()}_${i}`
    });
  }
  
  return events;
}

// Store events in database with duplicate detection
async function storeEvents(supabase: any, events: ScrapedEvent[]) {
  console.log(`Storing ${events.length} events in database`);
  
  let stored = 0;
  let duplicates = 0;
  
  for (const event of events) {
    try {
      // Generate unique hash for duplicate detection
      const uniqueHash = generateEventHash(
        event.title,
        event.event_date,
        event.location_name,
        event.organizer
      );
      
      // Check if event already exists
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('unique_hash', uniqueHash)
        .single();
      
      if (existing) {
        duplicates++;
        continue;
      }
      
      // Insert new event
      const { error } = await supabase
        .from('events')
        .insert({
          ...event,
          unique_hash: uniqueHash,
          expires_at: new Date(new Date(event.event_date).getTime() + 24 * 60 * 60 * 1000).toISOString()
        });
      
      if (error) {
        console.error('Error inserting event:', error);
      } else {
        stored++;
      }
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }
  
  console.log(`Stored ${stored} new events, skipped ${duplicates} duplicates`);
  return { stored, duplicates };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { latitude, longitude, radius = 100, includeMock = false } = await req.json();
    
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    console.log(`Starting enhanced event scraping for ${latitude}, ${longitude} within ${radius}km`);
    
    const allEvents: ScrapedEvent[] = [];
    
    // Scrape from multiple sources
    const [eventbriteEvents, ticketmasterEvents] = await Promise.all([
      scrapeEventbrite(latitude, longitude, radius),
      scrapeTicketmaster(latitude, longitude, radius)
    ]);
    
    allEvents.push(...eventbriteEvents, ...ticketmasterEvents);
    
    // Add mock events if requested or if we have very few real events
    if (includeMock || allEvents.length < 5) {
      console.log('Adding mock events to fill gaps');
      const mockEvents = generateMockEvents(latitude, longitude, 10);
      allEvents.push(...mockEvents);
    }
    
    console.log(`Total events collected: ${allEvents.length}`);
    
    // Store events in database
    const results = await storeEvents(supabase, allEvents);
    
    return new Response(JSON.stringify({
      success: true,
      location: { latitude, longitude, radius },
      totalCollected: allEvents.length,
      ...results,
      sources: {
        eventbrite: eventbriteEvents.length,
        ticketmaster: ticketmasterEvents.length,
        mock: allEvents.length - eventbriteEvents.length - ticketmasterEvents.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Enhanced scraper error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});