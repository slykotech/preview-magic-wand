import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FirecrawlEventsRequest {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  city?: string;
  query?: string;
}

interface EventData {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  price?: string;
  organizer?: string;
  category?: string;
  website_url?: string;
  image_url?: string;
  source: string;
  external_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { latitude, longitude, radiusKm = 25, city, query }: FirecrawlEventsRequest = await req.json();
    
    console.log(`🔥 Firecrawl events search for: ${city || `${latitude}, ${longitude}`}, radius: ${radiusKm}km`);

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('Firecrawl API key not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Firecrawl API key not configured',
          events: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Check cache first
    const { data: cachedEvents } = await supabase
      .from('events')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .gt('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // 6 hours cache
      .order('created_at', { ascending: false });

    const nearbyEvents = cachedEvents?.filter(event => {
      if (!event.latitude || !event.longitude) return false;
      const distance = calculateDistance(latitude, longitude, event.latitude, event.longitude);
      return distance <= radiusKm;
    }) || [];

    // Filter out sample events to check for real events only
    const realEvents = nearbyEvents.filter(event => event.source !== 'sample');
    const sampleEvents = nearbyEvents.filter(event => event.source === 'sample');
    
    console.log(`📚 Found ${nearbyEvents.length} total cached events (${realEvents.length} real, ${sampleEvents.length} sample)`);

    // Only return cache if we have sufficient REAL events (not sample events)
    if (realEvents.length >= 3) {
      console.log(`✅ Returning ${realEvents.length} cached real events`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          events: realEvents.slice(0, 50),
          source: 'cache',
          count: realEvents.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`🚀 Need fresh data - only ${realEvents.length} real events in cache, fetching from Firecrawl...`);

    // Fetch fresh events using Firecrawl with multiple strategies
    const events: EventData[] = [];
    
    // Strategy 1: Health check with simple API test
    console.log('🔍 Testing Firecrawl API connection...');
    try {
      const healthCheck = await fetch('https://api.firecrawl.dev/v1/crawl', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          limit: 1,
          formats: ['markdown']
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout for health check
      });
      
      if (healthCheck.ok) {
        console.log('✅ Firecrawl API is accessible');
      } else {
        const errorText = await healthCheck.text().catch(() => 'Unknown error');
        console.log(`Firecrawl API health check failed: ${healthCheck.status} - ${errorText}`);
      }
    } catch (healthError) {
      console.log('Firecrawl API health check error:', healthError);
    }

    // Strategy 2: Try multiple targeted searches with retry logic
    const searchStrategies = [
      // Strategy A: Indian Event Platforms - Direct scraping
      {
        name: 'BookMyShow Events',
        url: `https://in.bookmyshow.com/${(city || 'mumbai').toLowerCase().replace(/\s+/g, '-')}/events`,
        method: 'scrape',
        query: `site:bookmyshow.com events ${city} concerts shows movies entertainment`
      },
      {
        name: 'Paytm Insider Events',
        url: `https://insider.in/${(city || 'mumbai').toLowerCase()}`,
        method: 'scrape',
        query: `site:insider.in ${city} events parties workshops experiences`
      },
      {
        name: 'Zomato District Events',
        url: `https://www.zomato.com/${(city || 'mumbai').toLowerCase()}/events`,
        method: 'scrape',
        query: `site:zomato.com ${city} events food festivals dining experiences`
      },
      // Strategy B: International Platforms
      {
        name: 'Eventbrite Search',
        url: 'https://www.eventbrite.com/d/' + (city || 'new-york').toLowerCase().replace(/\s+/g, '-') + '/events/',
        method: 'scrape',
        query: `site:eventbrite.com events ${city} concerts shows workshops`
      },
      {
        name: 'Meetup Events',
        query: `site:meetup.com ${city} events meetups networking community`,
        method: 'search'
      },
      {
        name: 'Facebook Events',
        query: `site:facebook.com/events ${city} local events community gatherings`,
        method: 'search'
      },
      // Strategy C: Local Event Apps Search
      {
        name: 'Local Event Apps',
        query: `${city} events tickets booking allevents townscript explara meraevents`,
        method: 'search'
      },
      // Strategy D: General search
      {
        name: 'General Events Search',
        query: `events ${city} concerts shows festivals entertainment today weekend`,
        method: 'search'
      },
      // Strategy E: Cultural events
      {
        name: 'Cultural Events',
        query: `${city} music art theater cultural events exhibitions performances`,
        method: 'search'
      },
      // Strategy F: Platform-specific searches
      {
        name: 'All Events Search',
        query: `${city} events happening today weekend concerts shows workshops festivals`,
        method: 'search'
      }
    ];

    for (const strategy of searchStrategies) {
      if (events.length >= 10) break; // Stop if we have enough events
      
      console.log(`🎯 Trying strategy: ${strategy.name}`);
      
      try {
        let firecrawlResponse;
        
        if (strategy.method === 'scrape' && strategy.url) {
          // Try direct scraping of event sites using v1 API
          firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: strategy.url,
              formats: ['markdown']
            }),
            signal: AbortSignal.timeout(20000) // 20 second timeout
          });
        } else {
          // Use search method with v1 API
          firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: strategy.query,
              limit: 5,
              location: city || undefined
            }),
            signal: AbortSignal.timeout(15000) // 15 second timeout
          });
        }

        if (!firecrawlResponse.ok) {
          const errorText = await firecrawlResponse.text();
          console.log(`${strategy.name} failed: ${firecrawlResponse.status} - ${errorText}`);
          continue; // Try next strategy
        }

        const firecrawlData = await firecrawlResponse.json();
        console.log(`${strategy.name} response:`, firecrawlData.success ? 'Success' : 'Failed');

        if (firecrawlData.success) {
          let dataToProcess = [];
          
          // Handle different response structures for scrape vs search
          if (strategy.method === 'scrape' && firecrawlData.data) {
            // Single scrape result
            dataToProcess = [firecrawlData.data];
          } else if (firecrawlData.data && Array.isArray(firecrawlData.data)) {
            // Search results array
            dataToProcess = firecrawlData.data;
          }
          
          console.log(`${strategy.name} found ${dataToProcess.length} results`);
          
          // Process results
          for (const result of dataToProcess.slice(0, 5)) {
            if (result.markdown || result.content) {
              const content = result.markdown || result.content;
              const url = result.url || result.sourceURL;
              
              const title = extractTitle(content) || result.title || 'Event';
              const eventDate = extractDate(content) || getDefaultEventDate();
              
              // Skip if we already have this event
              const existingEvent = events.find(e => 
                e.title.toLowerCase() === title.toLowerCase() || 
                (url && e.external_id === `firecrawl-${encodeURIComponent(url)}`)
              );
              
              if (!existingEvent && title.length > 5) {
                const eventData: EventData = {
                  title: title,
                  description: extractDescription(content),
                  start_date: eventDate,
                  end_date: null, // Will be extracted if available
                  location_name: extractLocation(content) || city || 'TBD',
                  latitude: latitude,
                  longitude: longitude,
                  price: extractPrice(content) || 'Contact organizer',
                  organizer: extractOrganizer(content) || 'TBD',
                  category: categorizeEvent(title, content),
                  website_url: url || null,
                  image_url: extractImageUrl(content) || null,
                  source: 'real', // Mark as real data from Firecrawl
                  external_id: url ? `firecrawl-${encodeURIComponent(url)}` : `firecrawl-${Date.now()}-${Math.random()}`
                };
                
                events.push(eventData);
              }
            }
          }
          
          console.log(`${strategy.name} extracted ${events.length} total events so far`);
        } else {
          console.log(`${strategy.name} failed with error:`, firecrawlData.error || 'Unknown error');
        }

        // Add delay between strategies to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (strategyError) {
        console.error(`${strategy.name} error:`, strategyError);
        continue; // Try next strategy
      }
    }

    // Strategy 3: Only use sample events if absolutely no real events found
    if (events.length === 0) {
      console.log('All Firecrawl strategies failed, using sample events as last resort');
      if (city) {
        const sampleEvents = createSampleEvents(city, latitude, longitude);
        events.push(...sampleEvents);
        console.log(`Created ${sampleEvents.length} sample events for ${city}`);
      }
    } else {
      console.log(`Successfully found ${events.length} real events using Firecrawl`);
    }

    // Store events in database if we found any
    if (events.length > 0) {
      try {
        const eventsToStore = events.map(event => ({
          ...event,
          latitude: latitude,
          longitude: longitude,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hour expiry
        }));

        const { error: insertError } = await supabase
          .from('events')
          .upsert(eventsToStore, { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
          });

        if (insertError) {
          console.error('Error storing events:', insertError);
        } else {
          console.log(`Stored ${events.length} new events`);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue execution even if database storage fails
      }
    }

    // Combine with cached events and return
    const allEvents = [...events, ...nearbyEvents]
      .filter((event, index, arr) => 
        arr.findIndex(e => e.external_id === event.external_id) === index
      )
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    console.log(`Returning ${allEvents.length} total events`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        events: allEvents.slice(0, 50),
        source: events.length > 0 ? 'fresh' : 'cache',
        newEventsFetched: events.length,
        count: allEvents.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in firecrawl-events function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        events: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Helper functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function extractTitle(text: string): string | null {
  // Look for event titles in markdown
  const titleMatches = text.match(/^#\s+(.+)$/m) || text.match(/\*\*(.+?)\*\*/);
  if (titleMatches) {
    return titleMatches[1].trim();
  }
  
  // Look for common event patterns
  const eventPatterns = [
    /event[:\s]+(.+?)[\n\r]/i,
    /concert[:\s]+(.+?)[\n\r]/i,
    /show[:\s]+(.+?)[\n\r]/i,
    /festival[:\s]+(.+?)[\n\r]/i
  ];
  
  for (const pattern of eventPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Get first significant line
  const lines = text.split('\n').filter(line => line.trim().length > 10);
  return lines[0]?.trim().substring(0, 100) || null;
}

function extractDate(text: string): string | null {
  // Look for date patterns - including Indian formats
  const datePatterns = [
    // Indian DD/MM/YYYY format
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    // US MM/DD/YYYY format  
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    // ISO format YYYY-MM-DD
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
    // Full month names
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{2,4}/i,
    // Short month names
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{2,4}/i,
    // Day Month format (common in India)
    /\d{1,2}(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /\d{1,2}(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    // Relative dates
    /(today|tomorrow|this\s+weekend|next\s+week|this\s+week)/i,
    // Day of week patterns
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let dateString = match[0];
        
        // Handle relative dates
        if (dateString.toLowerCase().includes('today')) {
          return new Date().toISOString();
        }
        if (dateString.toLowerCase().includes('tomorrow')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow.toISOString();
        }
        if (dateString.toLowerCase().includes('this weekend')) {
          const saturday = new Date();
          saturday.setDate(saturday.getDate() + (6 - saturday.getDay()));
          return saturday.toISOString();
        }
        if (dateString.toLowerCase().includes('next week')) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          return nextWeek.toISOString();
        }
        
        // Try to parse the date
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          // Ensure future date
          if (date.getTime() < Date.now()) {
            date.setFullYear(date.getFullYear() + 1);
          }
          return date.toISOString();
        }
        
        // Try DD/MM/YYYY format (Indian style)
        const ddmmyyyy = dateString.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (ddmmyyyy) {
          const day = parseInt(ddmmyyyy[1]);
          const month = parseInt(ddmmyyyy[2]) - 1; // JS months are 0-indexed
          const year = parseInt(ddmmyyyy[3]);
          const parsedDate = new Date(year < 100 ? 2000 + year : year, month, day);
          
          if (!isNaN(parsedDate.getTime()) && day <= 31 && month < 12) {
            // Ensure future date
            if (parsedDate.getTime() < Date.now()) {
              parsedDate.setFullYear(parsedDate.getFullYear() + 1);
            }
            return parsedDate.toISOString();
          }
        }
        
      } catch (e) {
        // Continue to next pattern
      }
    }
  }
  
  return null;
}

function getDefaultEventDate(): string {
  // Default to next week
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek.toISOString();
}

function extractOrganizer(text: string): string | null {
  const organizerPatterns = [
    /(?:by|hosted by|organized by)[:\s]+(.+?)[\n\r]/i,
    /organizer[:\s]+(.+?)[\n\r]/i
  ];
  
  for (const pattern of organizerPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function categorizeEvent(title: string, content: string): string {
  const text = (title + ' ' + content).toLowerCase();
  
  if (text.includes('music') || text.includes('concert') || text.includes('band')) return 'music';
  if (text.includes('food') || text.includes('restaurant') || text.includes('dining')) return 'food';
  if (text.includes('art') || text.includes('gallery') || text.includes('exhibition')) return 'art';
  if (text.includes('sport') || text.includes('fitness') || text.includes('gym')) return 'sports';
  if (text.includes('network') || text.includes('meetup') || text.includes('social')) return 'social';
  if (text.includes('outdoor') || text.includes('hiking') || text.includes('adventure')) return 'outdoor';
  if (text.includes('learn') || text.includes('workshop') || text.includes('class')) return 'learning';
  
  return 'general';
}

function extractDescription(text: string): string {
  // Clean up markdown and extract meaningful description
  const cleanText = text
    .replace(/#{1,6}\s+/g, '') // Remove markdown headers
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/\*/g, '') // Remove italic markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
  
  // Get first meaningful paragraph (200 chars)
  const description = cleanText.substring(0, 200);
  return description.length < cleanText.length ? description + '...' : description;
}

function extractLocation(text: string): string | null {
  const locationPatterns = [
    // Explicit venue/location keywords
    /(?:at|location|venue|address)[:\s]+(.+?)[\n\r]/i,
    /(?:held at|taking place at|happening at)[:\s]+(.+?)[\n\r]/i,
    
    // Indian address patterns
    /(\d+[^,\n]*(?:sector|block|phase)[^,\n]*)/i,
    /([^,\n]*(?:marg|nagar|colony|vihar|enclave|plaza|mall|center|centre)[^,\n]*)/i,
    /([^,\n]*(?:mumbai|delhi|bangalore|bengaluru|pune|hyderabad|chennai|kolkata|ahmedabad|gurgaon|noida)[^,\n]*)/i,
    
    // International address patterns  
    /(\d+\s+[^,\n]+(?:street|st|avenue|ave|boulevard|blvd|road|rd|lane|ln|drive|dr)[^,\n]*)/i,
    /(downtown|midtown|uptown|central|south|north|east|west)\s+([^,\n]+)/i,
    
    // Venue types
    /([^,\n]*(?:auditorium|theater|theatre|arena|stadium|hall|center|centre|club|hotel|resort|garden|park|ground)[^,\n]*)/i,
    /([^,\n]*(?:pvr|inox|phoenix|forum|select city|dlf|ambience|palladium)[^,\n]*)/i,
    
    // General location patterns
    /([A-Z][^,\n]*(?:building|tower|complex|square|junction|circle|cross)[^,\n]*)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const location = match[1] ? match[1].trim() : match[0].trim();
      // Clean up the location string
      return location
        .replace(/^(at|in|near|on)\s+/i, '') // Remove location prepositions
        .replace(/[^\w\s,-]/g, '') // Remove special characters except commas and hyphens
        .trim()
        .substring(0, 100); // Limit length
    }
  }
  
  return null;
}

function extractPrice(text: string): string | null {
  const pricePatterns = [
    // Indian Rupee patterns
    /(?:price|cost|fee|admission|ticket)[:\s]*₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/,
    /(?:rs\.?|inr)[:\s]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    /(\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:rupees?|inr))/i,
    // USD patterns
    /(?:price|cost|fee|admission)[:\s]*\$?(\d+(?:\.\d{2})?)/i,
    /\$(\d+(?:\.\d{2})?)/,
    /(\d+(?:\.\d{2})?\s*(?:dollars?|usd))/i,
    // Free patterns
    /(free|no charge|no cost|complimentary|free entry|free admission)/i,
    // Range patterns
    /₹\s*(\d+(?:,\d{3})*)\s*-\s*₹?\s*(\d+(?:,\d{3})*)/i,
    /\$(\d+)\s*-\s*\$?(\d+)/i
  ];
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].toLowerCase().includes('free') || match[0].toLowerCase().includes('no charge') || match[0].toLowerCase().includes('complimentary')) {
        return 'Free';
      }
      
      // Handle range patterns
      if (match[2]) {
        if (match[0].includes('₹')) {
          return `₹${match[1]} - ₹${match[2]}`;
        } else {
          return `$${match[1]} - $${match[2]}`;
        }
      }
      
      // Handle single price
      if (match[0].includes('₹') || match[0].toLowerCase().includes('rs') || match[0].toLowerCase().includes('inr') || match[0].toLowerCase().includes('rupee')) {
        return `₹${match[1]}`;
      } else if (match[0].includes('$') || match[0].toLowerCase().includes('dollar') || match[0].toLowerCase().includes('usd')) {
        return `$${match[1]}`;
      } else {
        // Default to rupees for Indian platforms
        return `₹${match[1]}`;
      }
    }
  }
  
  return null;
}

function extractImageUrl(text: string): string | null {
  // Look for image URLs in markdown or HTML
  const imagePatterns = [
    /!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|gif|webp))/i,
    /<img[^>]+src=["\']([^"\']+)["\'][^>]*>/i,
    /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/i
  ];
  
  for (const pattern of imagePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

function createSampleEvents(city: string, lat: number, lng: number): EventData[] {
  const events: EventData[] = [];
  const eventTypes = [
    { title: `${city} Music Festival`, category: 'music', organizer: 'City Events' },
    { title: `Food & Wine Tasting in ${city}`, category: 'food', organizer: 'Local Restaurants' },
    { title: `${city} Art Gallery Opening`, category: 'art', organizer: 'Cultural Center' },
    { title: `Outdoor Movie Night - ${city}`, category: 'outdoor', organizer: 'Parks Department' },
    { title: `${city} Networking Meetup`, category: 'social', organizer: 'Professional Network' }
  ];

  eventTypes.forEach((eventType, index) => {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + index + 2); // Events starting 2 days from now

    events.push({
      title: eventType.title,
      description: `Join us for an exciting ${eventType.category} event in ${city}. A great opportunity to explore local culture and meet new people.`,
      start_date: eventDate.toISOString(),
      location_name: `${city} Event Center`,
      latitude: lat,
      longitude: lng,
      price: index % 2 === 0 ? 'Free' : '$10-25',
      organizer: eventType.organizer,
      category: eventType.category,
      website_url: `https://example.com/events/${city.toLowerCase()}-${eventType.category}`,
      image_url: null,
      source: 'sample',
      external_id: `sample-${city.toLowerCase()}-${eventType.category}-${index}`
    });
  });

  return events;
}