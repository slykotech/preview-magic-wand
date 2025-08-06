import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TargetCity {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  eventbriteUrl?: string;
  meetupSearchTerm?: string;
}

interface ScrapedEvent {
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
  city_name: string;
}

// Major cities to target for event scraping
const TARGET_CITIES: TargetCity[] = [
  // United States
  { name: "New York", country: "US", latitude: 40.7128, longitude: -74.0060, timezone: "America/New_York" },
  { name: "Los Angeles", country: "US", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { name: "Chicago", country: "US", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago" },
  { name: "Houston", country: "US", latitude: 29.7604, longitude: -95.3698, timezone: "America/Chicago" },
  { name: "Miami", country: "US", latitude: 25.7617, longitude: -80.1918, timezone: "America/New_York" },
  { name: "San Francisco", country: "US", latitude: 37.7749, longitude: -122.4194, timezone: "America/Los_Angeles" },
  { name: "Boston", country: "US", latitude: 42.3601, longitude: -71.0589, timezone: "America/New_York" },
  { name: "Seattle", country: "US", latitude: 47.6062, longitude: -122.3321, timezone: "America/Los_Angeles" },
  
  // United Kingdom
  { name: "London", country: "UK", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London" },
  { name: "Manchester", country: "UK", latitude: 53.4808, longitude: -2.2426, timezone: "Europe/London" },
  { name: "Birmingham", country: "UK", latitude: 52.4862, longitude: -1.8904, timezone: "Europe/London" },
  { name: "Edinburgh", country: "UK", latitude: 55.9533, longitude: -3.1883, timezone: "Europe/London" },
  { name: "Glasgow", country: "UK", latitude: 55.8642, longitude: -4.2518, timezone: "Europe/London" },
  { name: "Bristol", country: "UK", latitude: 51.4545, longitude: -2.5879, timezone: "Europe/London" },
  
  // India
  { name: "Mumbai", country: "India", latitude: 19.0760, longitude: 72.8777, timezone: "Asia/Kolkata" },
  { name: "Delhi", country: "India", latitude: 28.7041, longitude: 77.1025, timezone: "Asia/Kolkata" },
  { name: "Bangalore", country: "India", latitude: 12.9716, longitude: 77.5946, timezone: "Asia/Kolkata" },
  { name: "Hyderabad", country: "India", latitude: 17.3850, longitude: 78.4867, timezone: "Asia/Kolkata" },
  { name: "Chennai", country: "India", latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata" },
  { name: "Kolkata", country: "India", latitude: 22.5726, longitude: 88.3639, timezone: "Asia/Kolkata" },
  { name: "Pune", country: "India", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata" },
  
  // Canada
  { name: "Toronto", country: "Canada", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto" },
  { name: "Vancouver", country: "Canada", latitude: 49.2827, longitude: -123.1207, timezone: "America/Vancouver" },
  { name: "Montreal", country: "Canada", latitude: 45.5017, longitude: -73.5673, timezone: "America/Toronto" },
  { name: "Calgary", country: "Canada", latitude: 51.0447, longitude: -114.0719, timezone: "America/Edmonton" },
  { name: "Ottawa", country: "Canada", latitude: 45.4215, longitude: -75.6972, timezone: "America/Toronto" },
  { name: "Edmonton", country: "Canada", latitude: 53.5461, longitude: -113.4938, timezone: "America/Edmonton" },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { cities, forceRefresh = false } = await req.json();
    
    console.log(`🌍 Starting targeted city event scraping for ${cities?.length || 'all'} cities`);

    const citiesToScrape = cities || TARGET_CITIES.map(c => c.name);
    const targetCities = TARGET_CITIES.filter(city => citiesToScrape.includes(city.name));

    let allScrapedEvents: ScrapedEvent[] = [];
    let successfulCities = 0;
    let failedCities = 0;

    for (const city of targetCities) {
      try {
        console.log(`🏙️ Scraping events for ${city.name}, ${city.country}`);
        
        // Check for existing recent events unless force refresh
        if (!forceRefresh) {
          const { data: existingEvents } = await supabase
            .from('events')
            .select('id')
            .eq('city_name', city.name)
            .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // 6 hours ago
            .limit(5);

          if (existingEvents && existingEvents.length >= 5) {
            console.log(`⏭️ Skipping ${city.name} - found ${existingEvents.length} recent events`);
            continue;
          }
        }

        const cityEvents = await scrapeEventsForCity(city);
        allScrapedEvents.push(...cityEvents);
        successfulCities++;
        
        console.log(`✅ Found ${cityEvents.length} events for ${city.name}`);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Failed to scrape ${city.name}:`, error);
        failedCities++;
      }
    }

    // Store events in database
    if (allScrapedEvents.length > 0) {
      const { data, error } = await supabase
        .from('events')
        .insert(allScrapedEvents)
        .select();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log(`💾 Stored ${data?.length || 0} events in database`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalEvents: allScrapedEvents.length,
        citiesProcessed: successfulCities,
        citiesFailed: failedCities,
        events: allScrapedEvents.slice(0, 10), // Return first 10 for preview
        summary: `Scraped ${allScrapedEvents.length} events from ${successfulCities} cities`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Scraping error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function scrapeEventsForCity(city: TargetCity): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];
  
  try {
    // Scrape from Eventbrite
    const eventbriteEvents = await scrapeEventbrite(city);
    events.push(...eventbriteEvents);
  } catch (error) {
    console.log(`Eventbrite failed for ${city.name}:`, error.message);
  }

  try {
    // Scrape from Meetup (if available)
    const meetupEvents = await scrapeMeetup(city);
    events.push(...meetupEvents);
  } catch (error) {
    console.log(`Meetup failed for ${city.name}:`, error.message);
  }

  try {
    // Scrape from local event sources based on country
    const localEvents = await scrapeLocalSources(city);
    events.push(...localEvents);
  } catch (error) {
    console.log(`Local sources failed for ${city.name}:`, error.message);
  }

  return events.slice(0, 15); // Limit to 15 events per city
}

async function scrapeEventbrite(city: TargetCity): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];
  const searchUrl = `https://www.eventbrite.com/d/${city.name.toLowerCase().replace(/\s+/g, '-')}--${city.country.toLowerCase()}/events/`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Extract events from JSON-LD structured data
    const jsonLdMatches = html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs);
    
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          const data = JSON.parse(jsonContent);
          
          if (data['@type'] === 'Event' || (Array.isArray(data) && data.some(item => item['@type'] === 'Event'))) {
            const eventArray = Array.isArray(data) ? data : [data];
            
            for (const event of eventArray) {
              if (event['@type'] === 'Event') {
                events.push({
                  title: event.name || 'Eventbrite Event',
                  description: event.description?.substring(0, 500),
                  start_date: event.startDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  end_date: event.endDate,
                  location_name: event.location?.name || `${city.name}, ${city.country}`,
                  latitude: city.latitude,
                  longitude: city.longitude,
                  price: event.offers?.price || 'Check website',
                  organizer: event.organizer?.name || 'Eventbrite',
                  category: inferCategory(event.name || ''),
                  website_url: event.url || searchUrl,
                  image_url: event.image?.url,
                  source: 'eventbrite',
                  external_id: `eventbrite_${city.name}_${events.length}`,
                  city_name: city.name
                });
              }
            }
          }
        } catch (parseError) {
          // Continue with next JSON-LD block
        }
      }
    }

    // Fallback: Extract from HTML structure
    if (events.length === 0) {
      const eventMatches = html.match(/data-event-id="([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)</g);
      
      if (eventMatches) {
        for (let i = 0; i < Math.min(eventMatches.length, 10); i++) {
          const match = eventMatches[i];
          const titleMatch = match.match(/<h3[^>]*>([^<]+)/);
          const idMatch = match.match(/data-event-id="([^"]+)"/);
          
          if (titleMatch && idMatch) {
            events.push({
              title: titleMatch[1].trim(),
              description: `Event in ${city.name}`,
              start_date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
              location_name: `${city.name}, ${city.country}`,
              latitude: city.latitude,
              longitude: city.longitude,
              price: 'Check website',
              organizer: 'Eventbrite',
              category: inferCategory(titleMatch[1]),
              website_url: `https://www.eventbrite.com/e/${idMatch[1]}`,
              source: 'eventbrite',
              external_id: `eventbrite_${idMatch[1]}`,
              city_name: city.name
            });
          }
        }
      }
    }

  } catch (error) {
    console.log(`Eventbrite scraping failed for ${city.name}:`, error.message);
  }

  return events;
}

async function scrapeMeetup(city: TargetCity): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];
  
  try {
    // Meetup GraphQL endpoint (public events)
    const query = {
      query: `
        query {
          rankedEvents(
            filter: {
              lat: ${city.latitude}
              lon: ${city.longitude}
              radius: 25
              source: EVENTS
            }
            first: 10
          ) {
            edges {
              node {
                id
                title
                description
                dateTime
                endTime
                venue {
                  name
                  lat
                  lng
                }
                group {
                  name
                }
                eventUrl
                images {
                  baseUrl
                }
              }
            }
          }
        }
      `
    };

    const response = await fetch('https://www.meetup.com/gql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(query)
    });

    if (response.ok) {
      const data = await response.json();
      const meetupEvents = data?.data?.rankedEvents?.edges || [];

      for (const edge of meetupEvents) {
        const event = edge.node;
        events.push({
          title: event.title || 'Meetup Event',
          description: event.description?.substring(0, 500),
          start_date: event.dateTime || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          end_date: event.endTime,
          location_name: event.venue?.name || `${city.name}, ${city.country}`,
          latitude: event.venue?.lat || city.latitude,
          longitude: event.venue?.lng || city.longitude,
          price: 'Free',
          organizer: event.group?.name || 'Meetup',
          category: inferCategory(event.title || ''),
          website_url: event.eventUrl,
          image_url: event.images?.[0]?.baseUrl,
          source: 'meetup',
          external_id: `meetup_${event.id}`,
          city_name: city.name
        });
      }
    }
  } catch (error) {
    console.log(`Meetup API failed for ${city.name}:`, error.message);
  }

  return events;
}

async function scrapeLocalSources(city: TargetCity): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];

  // Country-specific event sources
  const localSources = getLocalSourcesForCountry(city.country, city.name);

  for (const source of localSources) {
    try {
      const sourceEvents = await scrapeGenericEventSource(source, city);
      events.push(...sourceEvents);
    } catch (error) {
      console.log(`Local source ${source.name} failed for ${city.name}:`, error.message);
    }
  }

  return events;
}

function getLocalSourcesForCountry(country: string, cityName: string): Array<{name: string, url: string, type: string}> {
  const sources = [];

  switch (country) {
    case 'India':
      sources.push(
        { name: 'BookMyShow', url: `https://in.bookmyshow.com/explore/events-${cityName.toLowerCase()}`, type: 'html' },
        { name: 'Insider', url: `https://insider.in/${cityName.toLowerCase()}/events`, type: 'html' },
        { name: 'Townscript', url: `https://www.townscript.com/e/${cityName.toLowerCase()}-events`, type: 'html' }
      );
      break;
    case 'UK':
      sources.push(
        { name: 'Eventbrite UK', url: `https://www.eventbrite.co.uk/d/united-kingdom--${cityName.toLowerCase()}/events/`, type: 'html' },
        { name: 'Time Out', url: `https://www.timeout.com/${cityName.toLowerCase()}/things-to-do/events`, type: 'html' }
      );
      break;
    case 'Canada':
      sources.push(
        { name: 'Eventbrite CA', url: `https://www.eventbrite.ca/d/canada--${cityName.toLowerCase()}/events/`, type: 'html' },
        { name: 'BlogTO', url: `https://www.blogto.com/events/`, type: 'html' }
      );
      break;
    default: // US and others
      sources.push(
        { name: 'Facebook Events', url: `https://www.facebook.com/events/search/?q=${cityName}`, type: 'html' }
      );
  }

  return sources;
}

async function scrapeGenericEventSource(source: {name: string, url: string, type: string}, city: TargetCity): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];

  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) return events;

    const html = await response.text();
    
    // Generic event extraction patterns
    const titlePatterns = [
      /<h[1-6][^>]*>([^<]{10,100})<\/h[1-6]>/gi,
      /<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{10,100})</gi,
      /<[^>]*class="[^"]*event[^"]*"[^>]*>[\s\S]*?<[^>]*>([^<]{10,100})</gi
    ];

    for (const pattern of titlePatterns) {
      const matches = [...html.matchAll(pattern)];
      
      for (let i = 0; i < Math.min(matches.length, 5); i++) {
        const title = matches[i][1]?.trim();
        if (title && title.length > 5 && !title.includes('javascript') && !title.includes('error')) {
          events.push({
            title: title,
            description: `Event from ${source.name}`,
            start_date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
            location_name: `${city.name}, ${city.country}`,
            latitude: city.latitude,
            longitude: city.longitude,
            price: 'Check website',
            organizer: source.name,
            category: inferCategory(title),
            website_url: source.url,
            source: source.name.toLowerCase().replace(/\s+/g, '_'),
            external_id: `${source.name.toLowerCase()}_${city.name}_${i}`,
            city_name: city.name
          });
        }
      }
      
      if (events.length > 0) break; // Found events, no need to try other patterns
    }

  } catch (error) {
    console.log(`Generic scraping failed for ${source.name}:`, error.message);
  }

  return events;
}

function inferCategory(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('music') || titleLower.includes('concert') || titleLower.includes('band')) return 'music';
  if (titleLower.includes('food') || titleLower.includes('restaurant') || titleLower.includes('dining')) return 'food';
  if (titleLower.includes('art') || titleLower.includes('gallery') || titleLower.includes('exhibition')) return 'art';
  if (titleLower.includes('sport') || titleLower.includes('fitness') || titleLower.includes('yoga')) return 'sports';
  if (titleLower.includes('business') || titleLower.includes('networking') || titleLower.includes('professional')) return 'business';
  if (titleLower.includes('tech') || titleLower.includes('startup') || titleLower.includes('coding')) return 'technology';
  if (titleLower.includes('party') || titleLower.includes('social') || titleLower.includes('meetup')) return 'social';
  if (titleLower.includes('workshop') || titleLower.includes('class') || titleLower.includes('learn')) return 'education';
  
  return 'entertainment';
}