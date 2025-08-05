import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.29.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EventWebsite {
  name: string;
  baseUrl: string;
  selectors: {
    eventContainer: string;
    title: string;
    date: string;
    location: string;
    price?: string;
    image?: string;
    link?: string;
  };
  dateFormat: string;
}

// Website configurations for different countries/regions
const WEBSITE_CONFIGS: Record<string, EventWebsite[]> = {
  'IN': [
    {
      name: 'BookMyShow',
      baseUrl: 'https://in.bookmyshow.com/explore/home',
      selectors: {
        eventContainer: '.event-card, .card-container',
        title: '.event-title, .title, h3, h4',
        date: '.event-date, .date, .time',
        location: '.event-venue, .venue, .location',
        price: '.event-price, .price',
        image: 'img',
        link: 'a'
      },
      dateFormat: 'DD MMM YYYY'
    },
    {
      name: 'Insider.in',
      baseUrl: 'https://insider.in/city',
      selectors: {
        eventContainer: '.event-item, .listing-item',
        title: '.event-name, .title',
        date: '.event-date, .date',
        location: '.venue-name, .location',
        price: '.price',
        image: 'img',
        link: 'a'
      },
      dateFormat: 'DD/MM/YYYY'
    },
    {
      name: 'Paytm Insider',
      baseUrl: 'https://insider.in/city',
      selectors: {
        eventContainer: '.event-card, .event-item',
        title: '.event-title, h3, h4',
        date: '.event-date, .date-time',
        location: '.venue-details, .location',
        price: '.price-range, .price',
        image: 'img',
        link: 'a'
      },
      dateFormat: 'DD MMM YYYY'
    },
    {
      name: 'MeraEvents',
      baseUrl: 'https://meraevents.com/events',
      selectors: {
        eventContainer: '.event-listing, .event-box',
        title: '.event-name, .title',
        date: '.event-date, .date',
        location: '.venue-name, .location',
        price: '.ticket-price, .price',
        image: 'img',
        link: 'a'
      },
      dateFormat: 'DD/MM/YYYY'
    }
  ],
  'US': [
    {
      name: 'Eventful',
      baseUrl: 'https://eventful.com/events',
      selectors: {
        eventContainer: '.event-summary',
        title: '.event-title',
        date: '.event-date',
        location: '.venue-name',
        price: '.price',
        image: 'img',
        link: 'a'
      },
      dateFormat: 'MM/DD/YYYY'
    }
  ]
};

async function crawlEventWebsite(
  firecrawl: FirecrawlApp,
  website: EventWebsite,
  country: string,
  city?: string,
  retryCount = 0
): Promise<any[]> {
  console.log(`Crawling ${website.name} for ${country}${city ? `, ${city}` : ''} (attempt ${retryCount + 1})`);
  
  try {
    // Build URL with city-specific path if available
    let targetUrl = website.baseUrl;
    if (city && website.name === 'BookMyShow') {
      targetUrl = `https://in.bookmyshow.com/${city.toLowerCase()}/events`;
    } else if (city && website.name === 'Insider.in') {
      targetUrl = `https://insider.in/${city.toLowerCase()}`;
    } else if (city && website.name === 'Paytm Insider') {
      targetUrl = `https://insider.in/${city.toLowerCase()}`;
    } else if (city && website.name === 'MeraEvents') {
      targetUrl = `https://meraevents.com/${city.toLowerCase()}/events`;
    }

    console.log(`Crawling URL: ${targetUrl}`);

    const crawlResult = await firecrawl.crawlUrl(targetUrl, {
      limit: 5,
      scrapeOptions: {
        formats: ['markdown', 'html'],
        waitFor: 3000,
        timeout: 20000,
        onlyMainContent: true
      }
    });

    if (!crawlResult.success) {
      const error = crawlResult.error;
      console.error(`Failed to crawl ${website.name}:`, error);
      
      // Handle rate limiting with exponential backoff
      if (error && error.includes('429') && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 5000; // 5s, 10s, 20s
        console.log(`Rate limited. Retrying ${website.name} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return crawlEventWebsite(firecrawl, website, country, city, retryCount + 1);
      }
      
      return [];
    }

    const events: any[] = [];
    
    // Process crawled data
    for (const page of crawlResult.data || []) {
      console.log(`Processing page: ${page.url || 'unknown'}`);
      
      if (page.html) {
        const extractedEvents = extractEventsFromHtml(page.html, website, targetUrl, country, city);
        console.log(`Extracted ${extractedEvents.length} events from HTML`);
        events.push(...extractedEvents);
      }
      
      if (page.markdown) {
        const extractedEvents = extractEventsFromMarkdown(page.markdown, website, targetUrl, country, city);
        console.log(`Extracted ${extractedEvents.length} events from Markdown`);
        events.push(...extractedEvents);
      }
    }

    console.log(`Extracted ${events.length} events from ${website.name}`);
    return events;

  } catch (error) {
    console.error(`Error crawling ${website.name}:`, error);
    
    // Handle rate limiting with exponential backoff
    if (error.message && error.message.includes('429') && retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 5000;
      console.log(`Rate limited. Retrying ${website.name} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return crawlEventWebsite(firecrawl, website, country, city, retryCount + 1);
    }
    
    return [];
  }
}

function extractEventsFromHtml(html: string, website: EventWebsite, sourceUrl: string, country: string, city?: string): any[] {
  const events: any[] = [];
  
  try {
    console.log(`Analyzing HTML content for ${website.name}...`);
    
    // Remove script and style tags
    const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                         .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Extract potential event data using regex patterns
    const eventPatterns = [
      // Match event titles in headings or specific classes
      /<h[1-6][^>]*class="[^"]*(?:event|title|name)[^"]*"[^>]*>([^<]+)<\/h[1-6]>/gi,
      /<div[^>]*class="[^"]*(?:event|title|name)[^"]*"[^>]*>([^<]+)<\/div>/gi,
      /<span[^>]*class="[^"]*(?:event|title|name)[^"]*"[^>]*>([^<]+)<\/span>/gi,
      
      // Match price patterns
      /[₹$€£]\s*\d+(?:[,.\d]*)?(?:\s*-\s*[₹$€£]?\s*\d+(?:[,.\d]*)?)?/g,
      
      // Match date patterns
      /\b(?:\d{1,2}[\s\-\/](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})[\s\-\/]\d{2,4})\b/gi,
      
      // Match time patterns
      /\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi
    ];
    
    // Look for structured event data in JSON-LD
    const jsonLdMatches = cleanHtml.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const data = JSON.parse(jsonContent);
          
          if (data['@type'] === 'Event' || (Array.isArray(data) && data.some(item => item['@type'] === 'Event'))) {
            const eventData = Array.isArray(data) ? data.filter(item => item['@type'] === 'Event') : [data];
            
            for (const event of eventData) {
              const extractedEvent = {
                title: event.name || 'Untitled Event',
                description: event.description || `Event from ${website.name}`,
                event_date: event.startDate ? parseEventDate(event.startDate) : null,
                event_time: event.startDate ? extractTimeFromDate(event.startDate) : null,
                location_name: event.location?.name || event.location?.address?.addressLocality || city || 'Unknown',
                location_address: event.location?.address?.streetAddress || null,
                city: event.location?.address?.addressLocality || city || null,
                region: getRegionForCountry(country),
                country: country,
                latitude: event.location?.geo?.latitude || null,
                longitude: event.location?.geo?.longitude || null,
                category: event.category || getCategoryFromText(event.name || ''),
                price_range: event.offers?.price ? `${event.offers.priceCurrency || '₹'}${event.offers.price}` : null,
                source_platform: website.name,
                source_url: event.url || sourceUrl,
                organizer: event.organizer?.name || website.name,
                image_url: event.image || null,
                tags: extractTagsFromText(event.name || ''),
                venue_details: { type: event.location?.['@type'] || 'venue' },
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              };
              
              if (extractedEvent.title && extractedEvent.title !== 'Untitled Event') {
                events.push(extractedEvent);
              }
            }
          }
        } catch (e) {
          console.log('Failed to parse JSON-LD:', e);
        }
      }
    }
    
    // If no structured data found, try to extract from HTML patterns
    if (events.length === 0) {
      const titleMatches = cleanHtml.match(eventPatterns[0]) || 
                          cleanHtml.match(eventPatterns[1]) || 
                          cleanHtml.match(eventPatterns[2]);
      
      if (titleMatches) {
        for (const match of titleMatches.slice(0, 10)) { // Limit to 10 events
          const title = match.replace(/<[^>]*>/g, '').trim();
          
          if (title.length > 5 && isLikelyEventTitle(title)) {
            events.push({
              title: title,
              description: `Event from ${website.name}`,
              event_date: null,
              event_time: null,
              location_name: city || 'Unknown',
              location_address: null,
              city: city || null,
              region: getRegionForCountry(country),
              country: country,
              latitude: null,
              longitude: null,
              category: getCategoryFromText(title),
              price_range: null,
              source_platform: website.name,
              source_url: sourceUrl,
              organizer: website.name,
              image_url: null,
              tags: extractTagsFromText(title),
              venue_details: {},
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });
          }
        }
      }
    }
    
    console.log(`Extracted ${events.length} real events from ${website.name} HTML`);
    
  } catch (error) {
    console.error('Error extracting events from HTML:', error);
  }
  
  return events;
}

function isLikelyEventTitle(title: string): boolean {
  const eventKeywords = [
    'show', 'concert', 'festival', 'workshop', 'seminar', 'conference', 
    'meetup', 'exhibition', 'performance', 'comedy', 'theatre', 'movie',
    'screening', 'launch', 'celebration', 'party', 'night', 'live'
  ];
  
  const lowerTitle = title.toLowerCase();
  return eventKeywords.some(keyword => lowerTitle.includes(keyword)) ||
         /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(title) ||
         /\d{1,2}:\d{2}/.test(title);
}

function getCategoryFromText(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('music') || lowerText.includes('concert') || lowerText.includes('band')) return 'music';
  if (lowerText.includes('comedy') || lowerText.includes('stand up')) return 'comedy';
  if (lowerText.includes('food') || lowerText.includes('restaurant') || lowerText.includes('dining')) return 'food';
  if (lowerText.includes('tech') || lowerText.includes('startup') || lowerText.includes('ai')) return 'technology';
  if (lowerText.includes('art') || lowerText.includes('exhibition') || lowerText.includes('gallery')) return 'art';
  if (lowerText.includes('dance') || lowerText.includes('workshop') || lowerText.includes('class')) return 'workshop';
  if (lowerText.includes('movie') || lowerText.includes('film') || lowerText.includes('cinema')) return 'cinema';
  if (lowerText.includes('sport') || lowerText.includes('game') || lowerText.includes('match')) return 'sports';
  
  return 'entertainment';
}

function extractTagsFromText(text: string): string[] {
  const lowerText = text.toLowerCase();
  const tags: string[] = [];
  
  const tagKeywords = [
    'live', 'comedy', 'music', 'dance', 'food', 'tech', 'art', 'workshop',
    'free', 'paid', 'outdoor', 'indoor', 'family', 'kids', 'adult'
  ];
  
  tagKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      tags.push(keyword);
    }
  });
  
  return tags.length > 0 ? tags : ['event'];
}

function extractTimeFromDate(dateString: string): string | null {
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toTimeString().slice(0, 8); // HH:MM:SS format
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return null;
}

function extractEventsFromMarkdown(markdown: string, website: EventWebsite, sourceUrl: string, country: string, city?: string): any[] {
  const events: any[] = [];
  
  try {
    // Extract events from markdown using patterns
    const lines = markdown.split('\n');
    let currentEvent: any = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for event titles (headings or bold text)
      if (trimmedLine.match(/^#+\s+(.+)|^\*\*(.+)\*\*|^__(.+)__/)) {
        if (currentEvent && currentEvent.title) {
          events.push(currentEvent);
        }
        
        const title = trimmedLine.replace(/^#+\s+|\*\*|__/g, '').trim();
        currentEvent = {
          title: title,
          description: `Event from ${website.name}`,
          event_date: null,
          event_time: null,
          location_name: city || 'Unknown',
          location_address: city || null,
          city: city || null,
          region: getRegionForCountry(country),
          country: country,
          latitude: null,
          longitude: null,
          category: 'entertainment',
          price_range: null,
          source_platform: website.name,
          source_url: sourceUrl,
          organizer: website.name,
          image_url: null,
          tags: [website.name.toLowerCase()],
          venue_details: {},
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
      }
      
      // Look for dates
      if (currentEvent && trimmedLine.match(/\b\d{1,2}[\s\-\/]\w{3,9}[\s\-\/]\d{2,4}\b/)) {
        const dateMatch = trimmedLine.match(/\b\d{1,2}[\s\-\/]\w{3,9}[\s\-\/]\d{2,4}\b/);
        if (dateMatch) {
          currentEvent.event_date = parseEventDate(dateMatch[0]);
        }
      }
      
      // Look for prices
      if (currentEvent && trimmedLine.match(/[₹$€£]\s*\d+/)) {
        const priceMatch = trimmedLine.match(/[₹$€£]\s*\d+/);
        if (priceMatch) {
          currentEvent.price_range = priceMatch[0];
        }
      }
      
      // Look for location/venue info
      if (currentEvent && trimmedLine.toLowerCase().includes('venue') || trimmedLine.toLowerCase().includes('location')) {
        const location = trimmedLine.replace(/.*(?:venue|location)[:\s]+/i, '').trim();
        if (location) {
          currentEvent.location_name = location;
        }
      }
    }
    
    // Add the last event if it exists
    if (currentEvent && currentEvent.title) {
      events.push(currentEvent);
    }
    
  } catch (error) {
    console.error('Error extracting events from markdown:', error);
  }
  
  return events;
}

function parseEventDate(dateString: string | null): string | null {
  if (!dateString) return null;
  
  try {
    // Try to parse various date formats
    let date: Date;
    
    // Remove extra whitespace and normalize
    const cleanDate = dateString.trim().replace(/\s+/g, ' ');
    
    // Try different date parsing approaches
    if (cleanDate.match(/\d{1,2}[\s\-\/]\w{3,9}[\s\-\/]\d{2,4}/)) {
      // Format like "15 Dec 2024" or "15-Dec-2024"
      const parts = cleanDate.split(/[\s\-\/]/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = getMonthNumber(parts[1]);
        const year = parseInt(parts[2]);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(cleanDate);
      }
    } else {
      date = new Date(cleanDate);
    }
    
    // Validate the date
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Format as YYYY-MM-DD for database
    return date.toISOString().split('T')[0];
    
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
}

function getMonthNumber(monthName: string): number {
  const months: Record<string, number> = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
  };
  
  return months[monthName.toLowerCase()] || 1;
}

function getRegionForCountry(country: string): string {
  const countryToRegion: Record<string, string> = {
    'IN': 'India',
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia'
  };
  
  return countryToRegion[country] || country;
}

async function scrapeEventsWithFirecrawl(
  supabase: any,
  firecrawlApiKey: string,
  country: string,
  region?: string,
  city?: string
): Promise<any[]> {
  console.log(`Starting Firecrawl scraping for ${country}, ${region}, ${city}`);
  
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
  const websites = WEBSITE_CONFIGS[country] || [];
  
  if (websites.length === 0) {
    console.log(`No website configurations found for country: ${country}`);
    return [];
  }
  
  const allEvents: any[] = [];
  
  for (const website of websites) {
    try {
      const events = await crawlEventWebsite(firecrawl, website, country, city);
      allEvents.push(...events);
      
      // Add progressive delay between websites to avoid rate limiting
      const delay = Math.min(5000 + (websites.indexOf(website) * 2000), 15000);
      console.log(`Waiting ${delay}ms before next website...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      console.error(`Error scraping ${website.name}:`, error);
      // Continue with next website even if one fails
    }
  }
  
  console.log(`Total events found via Firecrawl: ${allEvents.length}`);
  return allEvents;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Firecrawl API key
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Firecrawl API key not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { country, region, city } = await req.json();
    
    if (!country) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Country is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Starting Firecrawl scraping for ${country}, ${region}, ${city}`);

    // Scrape events using Firecrawl
    const scrapedEvents = await scrapeEventsWithFirecrawl(
      supabase, 
      firecrawlApiKey, 
      country, 
      region, 
      city
    );

    let newEventsInserted = 0;

    // Insert new events into database
    for (const event of scrapedEvents) {
      try {
        // Check for duplicates using existing function
        const { data: duplicateId } = await supabase.rpc('find_duplicate_event', {
          p_title: event.title,
          p_event_date: event.event_date,
          p_location_name: event.location_name,
          p_latitude: event.latitude,
          p_longitude: event.longitude,
          p_organizer: event.organizer
        });

        if (!duplicateId) {
          // Insert new event
          const { error: insertError } = await supabase
            .from('events')
            .insert(event);

          if (insertError) {
            console.error('Error inserting event:', insertError);
          } else {
            newEventsInserted++;
          }
        }
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }

    console.log(`Inserted ${newEventsInserted} new events from Firecrawl`);

    return new Response(
      JSON.stringify({
        success: true,
        source: 'firecrawl',
        totalFound: scrapedEvents.length,
        newEventsInserted,
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
    console.error('Error in Firecrawl scraping:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});