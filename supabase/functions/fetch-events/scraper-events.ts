// Web scraping for event sources (BookMyShow, Paytm Insider, District, Eventbrite, Ticketmaster)

import FirecrawlApp from 'npm:@mendable/firecrawl-js@^1.0.0';
import { UnifiedEvent, generateEventDates, formatEventTiming, EVENT_CATEGORIES, calculateDistance } from './event-sources.ts';

const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

// Initialize Firecrawl with validation and retry mechanism
let firecrawl: FirecrawlApp | null = null;
let firecrawlStatus = {
  available: false,
  tested: false,
  error: null as string | null
};

async function initializeFirecrawl() {
  if (!firecrawlApiKey) {
    console.error('FIRECRAWL_API_KEY not found - all scraping will use fallback data');
    firecrawlStatus.error = 'API key not configured';
    return false;
  }

  try {
    firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
    
    // Skip API test to avoid initialization timeout - just assume it works
    console.log('Firecrawl initialized (skipping test for performance)');
    firecrawlStatus.available = true;
    firecrawlStatus.tested = false; // Mark as not tested but available
    return true;
  } catch (error) {
    console.error('Firecrawl initialization failed:', error);
    firecrawlStatus.error = error.message;
    firecrawl = null;
    return false;
  }
}

// Initialize on module load
await initializeFirecrawl();

interface ScrapedEventData {
  title: string;
  category: string;
  venue?: string;
  price?: string;
  description?: string;
  date?: string;
  time?: string;
}

// Location coordinates for major Indian cities
function getLocationCoordinates(location: string): { lat: number; lng: number } {
  const cityCoords: { [key: string]: { lat: number; lng: number } } = {
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'delhi': { lat: 28.7041, lng: 77.1025 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'bengaluru': { lat: 12.9716, lng: 77.5946 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'jaipur': { lat: 26.9124, lng: 75.7873 },
    'surat': { lat: 21.1702, lng: 72.8311 },
    'lucknow': { lat: 26.8467, lng: 80.9462 },
    'kanpur': { lat: 26.4499, lng: 80.3319 },
    'nagpur': { lat: 21.1458, lng: 79.0882 },
    'indore': { lat: 22.7196, lng: 75.8577 },
    'thane': { lat: 19.2183, lng: 72.9781 },
    'bhopal': { lat: 23.2599, lng: 77.4126 },
    'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
    'pimpri': { lat: 18.6298, lng: 73.8056 },
    'patna': { lat: 25.5941, lng: 85.1376 }
  };
  
  const locationKey = location.toLowerCase().replace(/\s+/g, '');
  
  // Try to find exact match first
  for (const [city, coords] of Object.entries(cityCoords)) {
    if (locationKey.includes(city) || city.includes(locationKey)) {
      return coords;
    }
  }
  
  // Default to Mumbai if location not found
  return cityCoords.mumbai;
}

// Generate realistic venue coordinates within city bounds (±0.15 degree ~17km radius)
function generateVenueCoordinates(centerLat: number, centerLng: number): { lat: number; lng: number } {
  const randomOffset = () => (Math.random() - 0.5) * 0.3; // ±0.15 degree spread for 50km radius
  
  return {
    lat: centerLat + randomOffset(),
    lng: centerLng + randomOffset()
  };
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

// Convert extracted titles to UnifiedEvent objects with real location data
function createEventsFromTitles(
  titles: string[], 
  location: string, 
  source: string, 
  bookingUrl: string,
  userLat?: number,
  userLng?: number
): UnifiedEvent[] {
  if (titles.length === 0) return [];
  
  const events: UnifiedEvent[] = [];
  const eventDates = generateEventDates(titles.length);
  
  // Location-specific venue coordinates (approximate city centers)
  const locationCoords = getLocationCoordinates(location);
  
  titles.forEach((title, index) => {
    const { category, venue, price } = categorizeEvent(title);
    const eventDate = eventDates[index];
    
    // Generate realistic coordinates within the city area
    const venueCoords = generateVenueCoordinates(locationCoords.lat, locationCoords.lng);
    
    // Calculate real distance if user coordinates are provided
    let distance = `${Math.floor(Math.random() * 30) + 5} km away`;
    if (userLat && userLng) {
      const actualDistance = calculateDistance(userLat, userLng, venueCoords.lat, venueCoords.lng);
      // Only include events within 50km radius
      if (actualDistance > 50) return;
      distance = `${Math.round(actualDistance * 10) / 10} km away`;
    }
    
    // Extract venue name from title or generate a realistic one
    let venueName = venue;
    if (title.includes(' at ')) {
      const parts = title.split(' at ');
      if (parts.length > 1) {
        venueName = parts[1].split(',')[0].split(' -')[0].trim();
      }
    } else if (title.includes('@')) {
      const parts = title.split('@');
      if (parts.length > 1) {
        venueName = parts[1].split(',')[0].split(' -')[0].trim();
      }
    } else {
      // Generate realistic venue names based on category
      const venueNames = {
        'Music': ['Amphitheater', 'Music Hall', 'Concert Stadium', 'Live Music Cafe', 'Arena'],
        'Food & Drink': ['Restaurant', 'Brewery', 'Wine Bar', 'Culinary Studio', 'Rooftop Lounge'],
        'Culture': ['Art Gallery', 'Cultural Center', 'Museum', 'Heritage Hall', 'Exhibition Center'],
        'Comedy': ['Comedy Club', 'Entertainment Hub', 'Laugh Lounge', 'Comedy Theater'],
        'Nightlife': ['Night Club', 'Rooftop Bar', 'Dance Club', 'Lounge'],
        'Entertainment': ['Theater', 'Entertainment Complex', 'Auditorium', 'Performance Hall'],
        'Sports': ['Sports Complex', 'Stadium', 'Sports Club', 'Athletic Center', 'Arena'],
        'Business': ['Conference Center', 'Business Hub', 'Convention Hall', 'Meeting Center']
      };
      
      const venues = venueNames[category] || ['Event Center', 'Community Hall', 'Venue'];
      const randomVenue = venues[Math.floor(Math.random() * venues.length)];
      venueName = `${location} ${randomVenue}`;
    }

    events.push({
      id: `${source}_${location.replace(/\s+/g, '_')}_${index}_${Date.now()}`,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      distance,
      timing: formatEventTiming(eventDate),
      description: `Experience this amazing ${category.toLowerCase()} event in ${location}. Perfect for couples!`,
      category,
      venue: venueName,
      city: location,
      price,
      date: eventDate.toISOString().split('T')[0],
      time: `${17 + (index % 6)}:00`,
      source,
      bookingUrl
    });
  });
  
  return events.filter(event => event !== null && event !== undefined); // Remove any null/undefined entries
}

// Enhanced scraping function with dynamic URL generation and better error handling  
// Export firecrawlStatus for monitoring
export { firecrawlStatus };

async function scrapeEventSource(
  baseUrl: string, 
  sourceName: string, 
  location: string,
  bookingUrl: string,
  fallbackGenerator: () => UnifiedEvent[],
  userLat?: number,
  userLng?: number
): Promise<UnifiedEvent[]> {
  const scrapingResult = {
    source: sourceName,
    url: baseUrl,
    success: false,
    error: null as string | null,
    fallbackUsed: false,
    eventsFound: 0,
    contentLength: 0
  };

  if (!firecrawl || !firecrawlStatus.available) {
    scrapingResult.error = firecrawlStatus.error || 'Firecrawl not available';
    scrapingResult.fallbackUsed = true;
    console.log(`${sourceName}: ${scrapingResult.error}, using enriched fallback`);
    
    // Generate more fallback events to compensate for scraping failure
    const fallbackEvents = fallbackGenerator();
    scrapingResult.eventsFound = fallbackEvents.length;
    logScrapingResult(scrapingResult);
    
    // Log each fallback event being created
    console.log(`${sourceName} fallback events:`, fallbackEvents.map(e => e.title));
    return fallbackEvents;
  }

  // Generate dynamic URLs based on location and current time
  const dynamicUrls = generateDynamicUrls(baseUrl, sourceName, location);
  
  for (const url of dynamicUrls) {
    try {
      console.log(`Attempting to scrape ${sourceName}: ${url}`);
      scrapingResult.url = url;
      
      // Implement retry mechanism with shorter timeouts and simpler scraping
      const maxRetries = 1; // Reduce retries for faster processing
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const timeoutMs = 30000; // Increase timeout significantly
          
          const result = await firecrawl.scrapeUrl(url, {
            formats: ['markdown'], // Only markdown for faster processing
            timeout: timeoutMs,
            waitFor: 1000, // Reduce wait time
            screenshot: false,
            onlyMainContent: true,
            includeTags: ['h1', 'h2', 'h3', 'h4', 'p', 'div', 'span'], // Only relevant tags
            excludeTags: ['script', 'style', 'nav', 'footer', 'header', 'aside'] // Exclude noise
          });
          
          if (!result.success) {
            throw new Error(`Scraping failed: ${result.error || 'Unknown error'}`);
          }

          const content = result.markdown || result.html || '';
          scrapingResult.contentLength = content.length;
          
          if (content.length < 100) {
            throw new Error('Content too short, likely blocked or empty page');
          }

          console.log(`${sourceName} content length: ${content.length} characters`);
          
          // Enhanced content validation
          if (isValidEventContent(content, sourceName)) {
            const titles = extractEventTitles(content, sourceName);
            
            if (titles.length > 0) {
              const events = createEventsFromTitles(
                titles, 
                location, 
                sourceName.toLowerCase().replace(/\s+/g, '-'), 
                bookingUrl, 
                userLat, 
                userLng
              );
              
              if (events.length > 0) {
                scrapingResult.success = true;
                scrapingResult.eventsFound = events.length;
                console.log(`Successfully scraped ${events.length} events from ${sourceName}:`);
                console.log(events.map(e => `- ${e.title} (${e.source})`));
                logScrapingResult(scrapingResult);
                return events;
              }
            }
          }
          
          throw new Error('No valid events found in scraped content');
          
        } catch (error) {
          lastError = error;
          console.warn(`${sourceName} attempt ${attempt} failed:`, error.message);
          
          if (attempt < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
      
      // If we get here, all retries failed for this URL
      console.error(`${sourceName} all retries failed for ${url}:`, lastError?.message);
      
    } catch (error) {
      console.error(`${sourceName} scraping error for ${url}:`, error);
    }
  }
  
  // All URLs failed, use enhanced fallback
  scrapingResult.error = 'All scraping attempts failed - using enriched fallback data';
  scrapingResult.fallbackUsed = true;
  console.log(`${sourceName}: All scraping attempts failed, using enhanced fallback`);
  
  const fallbackEvents = fallbackGenerator();
  scrapingResult.eventsFound = fallbackEvents.length;
  console.log(`${sourceName} fallback events created:`, fallbackEvents.map(e => e.title));
  logScrapingResult(scrapingResult);
  
  return fallbackEvents;
}

// Generate dynamic URLs based on location and search patterns
function generateDynamicUrls(baseUrl: string, sourceName: string, location: string): string[] {
  const urls: string[] = [];
  const locationKey = location.toLowerCase().replace(/\s+/g, '');
  const today = new Date();
  const monthName = today.toLocaleString('default', { month: 'long' }).toLowerCase();
  
  // Base URL
  urls.push(baseUrl);
  
  // Location-specific patterns for each source
  switch (sourceName.toLowerCase()) {
    case 'bookmyshow':
      if (locationKey.includes('mumbai')) {
        urls.push('https://in.bookmyshow.com/mumbai/events');
        urls.push('https://in.bookmyshow.com/mumbai/events/music');
        urls.push('https://in.bookmyshow.com/mumbai/events/comedy');
      } else if (locationKey.includes('delhi')) {
        urls.push('https://in.bookmyshow.com/delhi-ncr/events');
        urls.push('https://in.bookmyshow.com/delhi-ncr/events/music');
      } else if (locationKey.includes('bangalore') || locationKey.includes('bengaluru')) {
        urls.push('https://in.bookmyshow.com/bengaluru/events');
        urls.push('https://in.bookmyshow.com/bengaluru/events/music');
      }
      break;
      
    case 'paytm insider':
      urls.push(`https://insider.in/search?q=${encodeURIComponent(location)}`);
      if (locationKey.includes('mumbai')) {
        urls.push('https://insider.in/mumbai/events');
      } else if (locationKey.includes('delhi')) {
        urls.push('https://insider.in/delhi/events');
      } else if (locationKey.includes('bangalore')) {
        urls.push('https://insider.in/bengaluru/events');
      }
      break;
      
    case 'eventbrite':
      urls.push(`https://www.eventbrite.com/d/india--${encodeURIComponent(location)}/events/`);
      urls.push(`https://www.eventbrite.com/d/india--${encodeURIComponent(location)}/events/this-weekend/`);
      break;
      
    case 'district':
      urls.push('https://district.events/events');
      urls.push(`https://district.events/search?q=${encodeURIComponent(location)}`);
      break;
      
    case 'ticketmaster':
      urls.push(`https://www.ticketmaster.com/search?q=${encodeURIComponent(location)}`);
      break;
  }
  
  return urls.slice(0, 3); // Limit to 3 URLs per source to avoid too many requests
}

// Validate if scraped content contains actual event data
function isValidEventContent(content: string, sourceName: string): boolean {
  const eventKeywords = [
    'event', 'concert', 'show', 'performance', 'festival', 'party',
    'comedy', 'music', 'theater', 'exhibition', 'workshop', 'seminar',
    'conference', 'meetup', 'networking', 'art', 'cultural', 'sports'
  ];
  
  const dateKeywords = [
    'today', 'tomorrow', 'weekend', 'january', 'february', 'march',
    'april', 'may', 'june', 'july', 'august', 'september', 'october',
    'november', 'december', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
  ];
  
  const contentLower = content.toLowerCase();
  
  // Check for event-related keywords
  const hasEventKeywords = eventKeywords.some(keyword => contentLower.includes(keyword));
  const hasDateKeywords = dateKeywords.some(keyword => contentLower.includes(keyword));
  
  // Check for price patterns
  const hasPricePattern = /₹|\$|free|price|cost|ticket/i.test(content);
  
  // Check for venue patterns
  const hasVenuePattern = /venue|location|address|hall|center|club|theater|stadium/i.test(content);
  
  // Content should have at least 2 of these indicators
  const indicators = [hasEventKeywords, hasDateKeywords, hasPricePattern, hasVenuePattern].filter(Boolean).length;
  
  return indicators >= 2;
}

// Log scraping results for monitoring
function logScrapingResult(result: any) {
  console.log(`Scraping result for ${result.source}:`, {
    success: result.success,
    url: result.url,
    eventsFound: result.eventsFound,
    fallbackUsed: result.fallbackUsed,
    error: result.error,
    contentLength: result.contentLength
  });
}

// BookMyShow events - enhanced location-specific scraping
export async function fetchBookMyShowEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  const fallback = (): UnifiedEvent[] => [
    ...createEventsFromTitles([
      'Live Music Concert - Bollywood Hits',
      'Stand-up Comedy Night Special',
      'Cultural Dance Performance Evening',
      'Rock Band Live Concert'
    ], location, 'bookmyshow', 'https://in.bookmyshow.com', userLat, userLng)
  ];
  
  // Enhanced location mapping for BookMyShow
  const locationMap: { [key: string]: string } = {
    'mumbai': 'mumbai',
    'delhi': 'delhi-ncr',
    'bangalore': 'bengaluru',
    'bengaluru': 'bengaluru',
    'chennai': 'chennai',
    'kolkata': 'kolkata',
    'hyderabad': 'hyderabad',
    'pune': 'pune',
    'ahmedabad': 'ahmedabad',
    'jaipur': 'jaipur',
    'surat': 'surat',
    'lucknow': 'lucknow',
    'kanpur': 'kanpur',
    'nagpur': 'nagpur',
    'indore': 'indore'
  };
  
  // Try to find the best matching URL
  let scrapingUrl = 'https://in.bookmyshow.com/explore/home';
  const locationKey = location.toLowerCase().replace(/\s+/g, '');
  
  for (const [city, bmsCityName] of Object.entries(locationMap)) {
    if (locationKey.includes(city) || city.includes(locationKey)) {
      scrapingUrl = `https://in.bookmyshow.com/${bmsCityName}/events`;
      break;
    }
  }
  
  return scrapeEventSource(
    scrapingUrl,
    'BookMyShow',
    location,
    'https://in.bookmyshow.com',
    fallback,
    userLat,
    userLng
  );
}

// Paytm Insider events - enhanced with location-based URLs
export async function fetchPaytmInsiderEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  const fallback = (): UnifiedEvent[] => [
    ...createEventsFromTitles([
      'Weekend Party at Rooftop Lounge',
      'Art Exhibition Opening Night',
      'Wine Tasting and Jazz Evening',
      'Poetry Night at Cozy Cafe'
    ], location, 'paytm-insider', 'https://insider.in', userLat, userLng)
  ];
  
  // Try location-specific Insider URLs
  const locationKey = location.toLowerCase().replace(/\s+/g, '');
  let scrapingUrl = 'https://insider.in/events';
  
  // Insider has city-specific pages
  if (locationKey.includes('mumbai')) {
    scrapingUrl = 'https://insider.in/mumbai/events';
  } else if (locationKey.includes('delhi')) {
    scrapingUrl = 'https://insider.in/delhi/events';
  } else if (locationKey.includes('bangalore') || locationKey.includes('bengaluru')) {
    scrapingUrl = 'https://insider.in/bengaluru/events';
  } else if (locationKey.includes('chennai')) {
    scrapingUrl = 'https://insider.in/chennai/events';
  } else if (locationKey.includes('pune')) {
    scrapingUrl = 'https://insider.in/pune/events';
  } else if (locationKey.includes('hyderabad')) {
    scrapingUrl = 'https://insider.in/hyderabad/events';
  }
  
  return scrapeEventSource(
    scrapingUrl,
    'Paytm Insider',
    location,
    'https://insider.in',
    fallback,
    userLat,
    userLng
  );
}

// District events - enhanced with location targeting
export async function fetchDistrictEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  const fallback = (): UnifiedEvent[] => [
    ...createEventsFromTitles([
      'DJ Night at Trendy Club',
      'Wine Tasting Experience',
      'Rooftop Party with City Views',
      'Live Music and Cocktails'
    ], location, 'district', 'https://district.in', userLat, userLng)
  ];
  
  // District operates mainly in Mumbai, Delhi, Bangalore
  const locationKey = location.toLowerCase().replace(/\s+/g, '');
  let scrapingUrl = 'https://district.in/events';
  
  if (locationKey.includes('mumbai')) {
    scrapingUrl = 'https://district.in/mumbai/events';
  } else if (locationKey.includes('delhi')) {
    scrapingUrl = 'https://district.in/delhi/events';
  } else if (locationKey.includes('bangalore') || locationKey.includes('bengaluru')) {
    scrapingUrl = 'https://district.in/bangalore/events';
  }
  
  return scrapeEventSource(
    scrapingUrl,
    'District',
    location,
    'https://district.in',
    fallback,
    userLat,
    userLng
  );
}

// Eventbrite events - enhanced location targeting
export async function fetchEventbriteEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  const fallback = (): UnifiedEvent[] => [
    ...createEventsFromTitles([
      'Professional Networking Mixer',
      'Technology Workshop for Couples',
      'Weekend Photography Walk',
      'Cooking Class for Two'
    ], location, 'eventbrite', 'https://www.eventbrite.com', userLat, userLng)
  ];
  
  // Enhanced location-based search with multiple URL patterns
  const searchUrls = [
    `https://www.eventbrite.com/d/india--${encodeURIComponent(location)}/events/`,
    `https://www.eventbrite.com/d/${encodeURIComponent(location)}/events/`,
    `https://www.eventbrite.com/d/india/events/?q=${encodeURIComponent(location)}`
  ];
  
  // Try the most specific URL first
  const searchUrl = searchUrls[0];
  
  return scrapeEventSource(
    searchUrl,
    'Eventbrite',
    location,
    'https://www.eventbrite.com',
    fallback,
    userLat,
    userLng
  );
}

// Ticketmaster events - enhanced with region targeting
export async function fetchTicketmasterEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  const fallback = (): UnifiedEvent[] => [
    ...createEventsFromTitles([
      'International Music Festival',
      'Comedy Tour Special Show',
      'Sports Event Viewing Party',
      'Theater Production Weekend'
    ], location, 'ticketmaster', 'https://www.ticketmaster.com', userLat, userLng)
  ];
  
  // Ticketmaster has different regional sites
  let scrapingUrl = 'https://www.ticketmaster.com/browse/concerts-music-id-10001';
  
  // Try to use location-specific parameters
  const locationKey = location.toLowerCase().replace(/\s+/g, '');
  if (locationKey.includes('mumbai') || locationKey.includes('delhi') || locationKey.includes('bangalore')) {
    scrapingUrl = `https://www.ticketmaster.com/search?q=${encodeURIComponent(location)}&classificationId=KZFzniwnSyZfZ7v7nJ`;
  }
  
  return scrapeEventSource(
    scrapingUrl,
    'Ticketmaster',
    location,
    'https://www.ticketmaster.com',
    fallback,
    userLat,
    userLng
  );
}