// Web scraping for event sources (BookMyShow, Paytm Insider, District, Eventbrite, Ticketmaster)

import FirecrawlApp from 'npm:@mendable/firecrawl-js@^1.0.0';
import { UnifiedEvent, generateEventDates, formatEventTiming, EVENT_CATEGORIES } from './event-sources.ts';

const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

// Initialize Firecrawl if available
let firecrawl: FirecrawlApp | null = null;
if (firecrawlApiKey) {
  firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
  console.log('Firecrawl initialized successfully');
} else {
  console.log('FIRECRAWL_API_KEY not found - scraping will use fallback data');
}

interface ScrapedEventData {
  title: string;
  category: string;
  venue?: string;
  price?: string;
  description?: string;
  date?: string;
  time?: string;
}

// Enhanced text cleaning function
function cleanScrapedText(text: string): string {
  return text
    .replace(/\[|\]|\(|\)/g, '') // Remove brackets
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/#{1,6}/g, '') // Remove headers
    .replace(/!\[.*?\]/g, '') // Remove image references
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/\\+/g, ' ') // Replace backslashes
    .replace(/₹\d+[^\s]*/g, '') // Remove inline prices
    .replace(/onwards|Delhi|NCR|app-store|GurugramHaryana/gi, '') // Remove common noise
    .replace(/For you|Dining|Events|Movies|Activities|Search for events/gi, '') // Remove navigation
    .replace(/Select Location|All Cities/gi, '') // Remove location selectors
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Improved event title extraction with better filtering
function extractEventTitles(content: string, source: string): string[] {
  const cleanText = cleanScrapedText(content);
  
  // Skip obvious error pages
  const errorIndicators = [
    'page doesn\'t exist', 'privacy note', 'partner with us',
    'select location', 'all cities', 'got a show', 'error 404',
    'access denied', 'page not found'
  ];
  
  if (errorIndicators.some(indicator => cleanText.toLowerCase().includes(indicator))) {
    console.log(`${source}: Detected error/navigation page`);
    return [];
  }

  // Split content and look for event-like patterns
  const lines = cleanText.split(/[\n\r\|\!]/).map(line => line.trim());
  
  const potentialTitles: string[] = [];
  const eventKeywords = [
    'concert', 'show', 'event', 'festival', 'party', 'night', 'live', 
    'performance', 'comedy', 'standup', 'music', 'dance', 'art', 'exhibition',
    'workshop', 'class', 'seminar', 'conference', 'meetup', 'screening',
    'theater', 'drama', 'musical', 'opera', 'ballet'
  ];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Basic length and content filtering
    if (line.length < 8 || line.length > 150) continue;
    
    // Skip obvious non-events
    if (lowerLine.match(/^\d+\s*(am|pm|january|february|march|april|may|june|july|august|september|october|november|december)/i)) continue;
    if (lowerLine.match(/^(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)) continue;
    if (lowerLine.includes('bookmyshow') || lowerLine.includes('insider.in') || lowerLine.includes('district.in')) continue;
    
    // Look for event indicators
    const hasEventKeyword = eventKeywords.some(keyword => lowerLine.includes(keyword));
    const hasBookingTerms = ['book', 'ticket', 'buy', 'reserve', 'register'].some(term => lowerLine.includes(term));
    const hasTimeIndicators = ['tonight', 'weekend', 'saturday', 'sunday', 'evening', 'morning'].some(time => lowerLine.includes(time));
    
    if (hasEventKeyword || (hasBookingTerms && hasTimeIndicators)) {
      potentialTitles.push(line);
    }
  }
  
  // Remove duplicates and limit results
  const uniqueTitles = [...new Set(potentialTitles)].slice(0, 12);
  console.log(`${source} extracted ${uniqueTitles.length} potential events:`, uniqueTitles.slice(0, 3));
  
  return uniqueTitles;
}

// Enhanced categorization with more categories
function categorizeEvent(title: string): { category: string; venue: string; price: string } {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('music') || lowerTitle.includes('concert') || lowerTitle.includes('band') || lowerTitle.includes('singer')) {
    return {
      category: EVENT_CATEGORIES.MUSIC,
      venue: 'Concert Hall',
      price: '₹800 - ₹3500'
    };
  } else if (lowerTitle.includes('comedy') || lowerTitle.includes('standup') || lowerTitle.includes('comic')) {
    return {
      category: EVENT_CATEGORIES.COMEDY,
      venue: 'Comedy Club',
      price: '₹400 - ₹1800'
    };
  } else if (lowerTitle.includes('party') || lowerTitle.includes('night') || lowerTitle.includes('club') || lowerTitle.includes('dj')) {
    return {
      category: EVENT_CATEGORIES.NIGHTLIFE,
      venue: 'Night Club',
      price: '₹1200 - ₹6000'
    };
  } else if (lowerTitle.includes('art') || lowerTitle.includes('gallery') || lowerTitle.includes('exhibition') || lowerTitle.includes('museum')) {
    return {
      category: EVENT_CATEGORIES.ARTS,
      venue: 'Art Gallery',
      price: '₹200 - ₹1000'
    };
  } else if (lowerTitle.includes('food') || lowerTitle.includes('culinary') || lowerTitle.includes('wine') || lowerTitle.includes('dining')) {
    return {
      category: EVENT_CATEGORIES.FOOD,
      venue: 'Restaurant',
      price: '₹800 - ₹3000'
    };
  } else if (lowerTitle.includes('workshop') || lowerTitle.includes('class') || lowerTitle.includes('learning') || lowerTitle.includes('seminar')) {
    return {
      category: EVENT_CATEGORIES.WORKSHOP,
      venue: 'Learning Center',
      price: '₹500 - ₹2000'
    };
  } else if (lowerTitle.includes('theater') || lowerTitle.includes('drama') || lowerTitle.includes('play') || lowerTitle.includes('musical')) {
    return {
      category: EVENT_CATEGORIES.ENTERTAINMENT,
      venue: 'Theater',
      price: '₹600 - ₹2500'
    };
  }
  
  return {
    category: EVENT_CATEGORIES.ENTERTAINMENT,
    venue: 'Event Venue',
    price: '₹500 - ₹2500'
  };
}

// Convert extracted titles to UnifiedEvent objects
function createEventsFromTitles(
  titles: string[], 
  location: string, 
  source: string, 
  bookingUrl: string
): UnifiedEvent[] {
  if (titles.length === 0) return [];
  
  const events: UnifiedEvent[] = [];
  const eventDates = generateEventDates(titles.length);
  
  titles.forEach((title, index) => {
    const { category, venue, price } = categorizeEvent(title);
    const eventDate = eventDates[index];
    
    events.push({
      id: `${source}_${location.replace(/\s+/g, '_')}_${index}_${Date.now()}`,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      distance: `${Math.floor(Math.random() * 25) + 2} km away`,
      timing: formatEventTiming(eventDate),
      description: `Experience this amazing ${category.toLowerCase()} event in ${location}. Perfect for couples!`,
      category,
      venue,
      city: location,
      price,
      date: eventDate.toISOString().split('T')[0],
      time: `${17 + (index % 6)}:00`,
      source,
      bookingUrl
    });
  });
  
  return events;
}

// Generic scraping function with improved timeout and error handling
async function scrapeEventSource(
  url: string, 
  sourceName: string, 
  location: string,
  bookingUrl: string,
  fallbackGenerator: () => UnifiedEvent[]
): Promise<UnifiedEvent[]> {
  if (!firecrawl) {
    console.log(`${sourceName}: Firecrawl not available, using fallback`);
    return fallbackGenerator();
  }

  try {
    console.log(`Scraping ${sourceName}: ${url}`);
    
    // Shorter timeout for faster response
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Scraping timeout')), 8000) // 8 second timeout
    );
    
    const scrapePromise = firecrawl.scrapeUrl(url, {
      formats: ['markdown'],
      timeout: 6000,
      waitFor: 2000 // Wait for page to load
    });
    
    const result = await Promise.race([scrapePromise, timeoutPromise]);
    
    if (!result.success || !result.markdown) {
      throw new Error(`Failed to scrape ${sourceName} - ${result.error || 'No content'}`);
    }

    console.log(`${sourceName} raw content length:`, result.markdown.length);
    
    const titles = extractEventTitles(result.markdown, sourceName);
    
    if (titles.length === 0) {
      console.log(`${sourceName}: No valid events found, using fallback`);
      return fallbackGenerator();
    }
    
    const events = createEventsFromTitles(titles, location, sourceName.toLowerCase().replace(/\s+/g, '-'), bookingUrl);
    console.log(`Scraped ${events.length} events from ${sourceName}`);
    
    return events;
    
  } catch (error) {
    console.error(`${sourceName} scraping error:`, error);
    console.log(`${sourceName}: Using fallback due to error`);
    return fallbackGenerator();
  }
}

// BookMyShow events - try location-specific URL first
export async function fetchBookMyShowEvents(location: string): Promise<UnifiedEvent[]> {
  const fallback = (): UnifiedEvent[] => [
    ...createEventsFromTitles([
      'Live Music Concert - Bollywood Hits',
      'Stand-up Comedy Night Special',
      'Cultural Dance Performance Evening',
      'Rock Band Live Concert'
    ], location, 'bookmyshow', 'https://in.bookmyshow.com')
  ];
  
  // Try location-specific URL if location is provided
  let scrapingUrl = 'https://in.bookmyshow.com/explore/home';
  if (location && location.toLowerCase().includes('mumbai')) {
    scrapingUrl = 'https://in.bookmyshow.com/mumbai/events';
  } else if (location && location.toLowerCase().includes('delhi')) {
    scrapingUrl = 'https://in.bookmyshow.com/delhi-ncr/events';
  } else if (location && location.toLowerCase().includes('bangalore')) {
    scrapingUrl = 'https://in.bookmyshow.com/bengaluru/events';
  }
  
  return scrapeEventSource(
    scrapingUrl,
    'BookMyShow',
    location,
    'https://in.bookmyshow.com',
    fallback
  );
}

// Paytm Insider events
export async function fetchPaytmInsiderEvents(location: string): Promise<UnifiedEvent[]> {
  const fallback = (): UnifiedEvent[] => [
    ...createEventsFromTitles([
      'Weekend Party at Rooftop Lounge',
      'Art Exhibition Opening Night',
      'Wine Tasting and Jazz Evening',
      'Poetry Night at Cozy Cafe'
    ], location, 'paytm-insider', 'https://insider.in')
  ];
  
  return scrapeEventSource(
    'https://insider.in/events',
    'Paytm Insider',
    location,
    'https://insider.in',
    fallback
  );
}

// District events
export async function fetchDistrictEvents(location: string): Promise<UnifiedEvent[]> {
  const fallback = (): UnifiedEvent[] => [
    ...createEventsFromTitles([
      'DJ Night at Trendy Club',
      'Wine Tasting Experience',
      'Rooftop Party with City Views',
      'Live Music and Cocktails'
    ], location, 'district', 'https://district.in')
  ];
  
  return scrapeEventSource(
    'https://district.in/events',
    'District',
    location,
    'https://district.in',
    fallback
  );
}

// Eventbrite events - NEW
export async function fetchEventbriteEvents(location: string): Promise<UnifiedEvent[]> {
  const fallback = (): UnifiedEvent[] => [
    ...createEventsFromTitles([
      'Professional Networking Mixer',
      'Technology Workshop for Couples',
      'Weekend Photography Walk',
      'Cooking Class for Two'
    ], location, 'eventbrite', 'https://www.eventbrite.com')
  ];
  
  // Use location-based search
  const searchUrl = `https://www.eventbrite.com/d/india--${encodeURIComponent(location)}/events/`;
  
  return scrapeEventSource(
    searchUrl,
    'Eventbrite',
    location,
    'https://www.eventbrite.com',
    fallback
  );
}

// Ticketmaster events - NEW  
export async function fetchTicketmasterEvents(location: string): Promise<UnifiedEvent[]> {
  const fallback = (): UnifiedEvent[] => [
    ...createEventsFromTitles([
      'International Music Festival',
      'Comedy Tour Special Show',
      'Sports Event Viewing Party',
      'Theater Production Weekend'
    ], location, 'ticketmaster', 'https://www.ticketmaster.com')
  ];
  
  return scrapeEventSource(
    'https://www.ticketmaster.com/browse/concerts-music-id-10001',
    'Ticketmaster',
    location,
    'https://www.ticketmaster.com',
    fallback
  );
}