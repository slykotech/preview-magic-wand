// Enhanced API-based event fetching for multiple sources
import { UnifiedEvent, generateEventDates, formatEventTiming, EVENT_CATEGORIES, calculateDistance } from './event-sources.ts';

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
  
  for (const [city, coords] of Object.entries(cityCoords)) {
    if (locationKey.includes(city) || city.includes(locationKey)) {
      return coords;
    }
  }
  
  return cityCoords.mumbai; // Default fallback
}

// Generate realistic venue coordinates within city bounds
function generateVenueCoordinates(centerLat: number, centerLng: number): { lat: number; lng: number } {
  const randomOffset = () => (Math.random() - 0.5) * 0.3;
  return {
    lat: centerLat + randomOffset(),
    lng: centerLng + randomOffset()
  };
}

// Status for monitoring API availability
export const firecrawlStatus = {
  available: false,
  tested: false,
  error: 'Rebuilding with direct API calls'
};

// Ticketmaster API Integration
export async function fetchTicketmasterEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
  
  if (!apiKey) {
    console.log('Ticketmaster: API key not found, using fallback');
    return generateTicketmasterFallback(location, userLat, userLng);
  }

  try {
    console.log(`Fetching Ticketmaster events for: ${location}`);
    
    const locationCoords = getLocationCoordinates(location);
    const lat = userLat || locationCoords.lat;
    const lng = userLng || locationCoords.lng;
    
    // Ticketmaster Discovery API endpoint
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&locale=en-us&latlong=${lat},${lng}&radius=50&unit=km&size=20&sort=date,asc`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EventApp/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data._embedded?.events) {
      console.log('Ticketmaster: No events found');
      return generateTicketmasterFallback(location, userLat, userLng);
    }

    const events: UnifiedEvent[] = data._embedded.events.map((event: any, index: number) => {
      const venue = event._embedded?.venues?.[0];
      const eventLocation = venue?.location || { latitude: lat, longitude: lng };
      
      // Calculate distance from user
      let distance = '15 km away';
      if (userLat && userLng) {
        const actualDistance = calculateDistance(userLat, userLng, eventLocation.latitude, eventLocation.longitude);
        distance = `${Math.round(actualDistance * 10) / 10} km away`;
      }

      return {
        id: `ticketmaster_${event.id}`,
        title: event.name,
        distance,
        timing: event.dates?.start?.localDate ? formatEventTiming(new Date(event.dates.start.localDate)) : 'This Weekend',
        description: event.info || `Experience ${event.name} - a premier event perfect for couples!`,
        category: categorizeTicketmasterEvent(event.classifications?.[0]?.segment?.name || 'Entertainment'),
        venue: venue?.name || 'Event Venue',
        city: location,
        price: event.priceRanges?.[0] ? `₹${Math.round(event.priceRanges[0].min * 80)} - ₹${Math.round(event.priceRanges[0].max * 80)}` : '₹800 - ₹3500',
        date: event.dates?.start?.localDate || new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: event.dates?.start?.localTime || `${18 + (index % 4)}:00`,
        source: 'ticketmaster',
        bookingUrl: event.url || 'https://www.ticketmaster.com',
        image: event.images?.[0]?.url,
        location: {
          latitude: eventLocation.latitude,
          longitude: eventLocation.longitude,
          city: location
        }
      };
    });

    console.log(`Ticketmaster: Successfully fetched ${events.length} events`);
    return events;

  } catch (error) {
    console.error('Ticketmaster API error:', error);
    return generateTicketmasterFallback(location, userLat, userLng);
  }
}

// Eventbrite API Integration
export async function fetchEventbriteEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  const apiKey = Deno.env.get('EVENTBRITE_API_KEY');
  
  if (!apiKey) {
    console.log('Eventbrite: API key not found, using fallback');
    return generateEventbriteFallback(location, userLat, userLng);
  }

  try {
    console.log(`Fetching Eventbrite events for: ${location}`);
    
    const locationCoords = getLocationCoordinates(location);
    const lat = userLat || locationCoords.lat;
    const lng = userLng || locationCoords.lng;
    
    // Eventbrite Search API endpoint
    const url = `https://www.eventbriteapi.com/v3/events/search/?location.latitude=${lat}&location.longitude=${lng}&location.within=50km&sort_by=date&expand=venue,organizer&token=${apiKey}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Eventbrite API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.events || data.events.length === 0) {
      console.log('Eventbrite: No events found');
      return generateEventbriteFallback(location, userLat, userLng);
    }

    const events: UnifiedEvent[] = data.events.slice(0, 15).map((event: any, index: number) => {
      const venue = event.venue;
      const eventLat = venue?.latitude || lat;
      const eventLng = venue?.longitude || lng;
      
      // Calculate distance
      let distance = '12 km away';
      if (userLat && userLng) {
        const actualDistance = calculateDistance(userLat, userLng, eventLat, eventLng);
        distance = `${Math.round(actualDistance * 10) / 10} km away`;
      }

      return {
        id: `eventbrite_${event.id}`,
        title: event.name?.text || 'Special Event',
        distance,
        timing: event.start?.local ? formatEventTiming(new Date(event.start.local)) : 'This Weekend',
        description: event.description?.text || `Join us for ${event.name?.text} - perfect for couples looking for memorable experiences!`,
        category: categorizeEventbriteEvent(event.category_id),
        venue: venue?.name || 'Event Venue',
        city: location,
        price: event.ticket_availability?.is_free ? 'Free' : '₹500 - ₹2500',
        date: event.start?.local ? event.start.local.split('T')[0] : new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: event.start?.local ? event.start.local.split('T')[1].slice(0, 5) : `${19 + (index % 3)}:00`,
        source: 'eventbrite',
        bookingUrl: event.url || 'https://www.eventbrite.com',
        image: event.logo?.url,
        location: {
          latitude: eventLat,
          longitude: eventLng,
          city: location
        }
      };
    });

    console.log(`Eventbrite: Successfully fetched ${events.length} events`);
    return events;

  } catch (error) {
    console.error('Eventbrite API error:', error);
    return generateEventbriteFallback(location, userLat, userLng);
  }
}

// BookMyShow fallback (as they don't have public API)
export async function fetchBookMyShowEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  console.log(`BookMyShow: Generating curated events for ${location}`);
  return generateBookMyShowFallback(location, userLat, userLng);
}

// Paytm Insider fallback (as they don't have public API)
export async function fetchPaytmInsiderEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  console.log(`Paytm Insider: Generating curated events for ${location}`);
  return generatePaytmInsiderFallback(location, userLat, userLng);
}

// District fallback (as they don't have public API)
export async function fetchDistrictEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  console.log(`District: Generating curated events for ${location}`);
  return generateDistrictFallback(location, userLat, userLng);
}

// Categorization functions
function categorizeTicketmasterEvent(segment: string): string {
  const segmentLower = segment?.toLowerCase() || '';
  
  if (segmentLower.includes('music')) return EVENT_CATEGORIES.MUSIC;
  if (segmentLower.includes('sports')) return EVENT_CATEGORIES.SPORTS;
  if (segmentLower.includes('comedy')) return EVENT_CATEGORIES.COMEDY;
  if (segmentLower.includes('theater') || segmentLower.includes('arts')) return EVENT_CATEGORIES.ARTS;
  
  return EVENT_CATEGORIES.ENTERTAINMENT;
}

function categorizeEventbriteEvent(categoryId: string): string {
  // Eventbrite category IDs mapping
  const categoryMap: { [key: string]: string } = {
    '103': EVENT_CATEGORIES.MUSIC,      // Music
    '105': EVENT_CATEGORIES.FOOD,       // Food & Drink  
    '110': EVENT_CATEGORIES.ARTS,       // Performing & Visual Arts
    '113': EVENT_CATEGORIES.COMEDY,     // Comedy
    '115': EVENT_CATEGORIES.WORKSHOP,   // Education
    '108': EVENT_CATEGORIES.SPORTS,     // Sports & Fitness
    '199': EVENT_CATEGORIES.ENTERTAINMENT // Other
  };
  
  return categoryMap[categoryId] || EVENT_CATEGORIES.ENTERTAINMENT;
}

// Enhanced fallback generators with realistic data
function generateTicketmasterFallback(location: string, userLat?: number, userLng?: number): UnifiedEvent[] {
  const locationCoords = getLocationCoordinates(location);
  const eventTitles = [
    'Live Concert Series - International Artists',
    'Comedy Night Extravaganza',
    'Musical Theater Performance',
    'Rock Concert - Local & International Bands',
    'Stand-up Comedy Special Show'
  ];
  
  return createEnhancedEvents(eventTitles, location, 'ticketmaster', 'https://www.ticketmaster.com', userLat, userLng);
}

function generateEventbriteFallback(location: string, userLat?: number, userLng?: number): UnifiedEvent[] {
  const eventTitles = [
    'Art & Wine Workshop for Couples',
    'Food Festival - Taste of the City',
    'Photography Workshop Weekend',
    'Cultural Dance Performance',
    'Business Networking Mixer'
  ];
  
  return createEnhancedEvents(eventTitles, location, 'eventbrite', 'https://www.eventbrite.com', userLat, userLng);
}

function generateBookMyShowFallback(location: string, userLat?: number, userLng?: number): UnifiedEvent[] {
  const eventTitles = [
    'Bollywood Movie Night - Latest Releases',
    'Theater Festival - Classic Performances',
    'Live Music Concert - Acoustic Evening',
    'Comedy Show - Stand-up Special',
    'Dance Performance - Contemporary Arts'
  ];
  
  return createEnhancedEvents(eventTitles, location, 'bookmyshow', 'https://in.bookmyshow.com', userLat, userLng);
}

function generatePaytmInsiderFallback(location: string, userLat?: number, userLng?: number): UnifiedEvent[] {
  const eventTitles = [
    'Weekend Night Party - DJ Special',
    'Culinary Experience - Chef\'s Table',
    'Adventure Sports Challenge',
    'Gaming Tournament Weekend',
    'Fitness Bootcamp Session'
  ];
  
  return createEnhancedEvents(eventTitles, location, 'paytm-insider', 'https://insider.in', userLat, userLng);
}

function generateDistrictFallback(location: string, userLat?: number, userLng?: number): UnifiedEvent[] {
  const eventTitles = [
    'Craft Beer Tasting Evening',
    'Live Jazz Performance Night',
    'Rooftop Dining Experience',
    'Wine & Paint Workshop',
    'Weekend Brunch Special'
  ];
  
  return createEnhancedEvents(eventTitles, location, 'district', 'https://www.district.in', userLat, userLng);
}

// Enhanced event creation with realistic data
function createEnhancedEvents(
  titles: string[], 
  location: string, 
  source: string, 
  bookingUrl: string,
  userLat?: number,
  userLng?: number
): UnifiedEvent[] {
  const locationCoords = getLocationCoordinates(location);
  const events: UnifiedEvent[] = [];
  const eventDates = generateEventDates(titles.length);
  
  titles.forEach((title, index) => {
    const { category, venue, price } = categorizeEventByTitle(title);
    const eventDate = eventDates[index];
    const venueCoords = generateVenueCoordinates(locationCoords.lat, locationCoords.lng);
    
    // Calculate realistic distance
    let distance = `${Math.floor(Math.random() * 25) + 5} km away`;
    if (userLat && userLng) {
      const actualDistance = calculateDistance(userLat, userLng, venueCoords.lat, venueCoords.lng);
      if (actualDistance > 50) return; // Skip events too far away
      distance = `${Math.round(actualDistance * 10) / 10} km away`;
    }
    
    events.push({
      id: `${source}_${location.replace(/\s+/g, '_')}_${index}_${Date.now()}`,
      title,
      distance,
      timing: formatEventTiming(eventDate),
      description: `Experience ${title.toLowerCase()} in ${location}. Perfect for couples looking for memorable experiences!`,
      category,
      venue: `${location} ${venue}`,
      city: location,
      price,
      date: eventDate.toISOString().split('T')[0],
      time: `${18 + (index % 5)}:00`,
      source,
      bookingUrl,
      location: {
        latitude: venueCoords.lat,
        longitude: venueCoords.lng,
        city: location
      }
    });
  });
  
  return events;
}

// Enhanced categorization
function categorizeEventByTitle(title: string): { category: string; venue: string; price: string } {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('music') || lowerTitle.includes('concert') || lowerTitle.includes('band')) {
    return { category: EVENT_CATEGORIES.MUSIC, venue: 'Concert Hall', price: '₹800 - ₹3500' };
  }
  if (lowerTitle.includes('comedy') || lowerTitle.includes('standup')) {
    return { category: EVENT_CATEGORIES.COMEDY, venue: 'Comedy Club', price: '₹400 - ₹1800' };
  }
  if (lowerTitle.includes('party') || lowerTitle.includes('night') || lowerTitle.includes('dj')) {
    return { category: EVENT_CATEGORIES.NIGHTLIFE, venue: 'Night Club', price: '₹1200 - ₹6000' };
  }
  if (lowerTitle.includes('art') || lowerTitle.includes('gallery') || lowerTitle.includes('workshop')) {
    return { category: EVENT_CATEGORIES.ARTS, venue: 'Art Gallery', price: '₹300 - ₹1500' };
  }
  if (lowerTitle.includes('food') || lowerTitle.includes('culinary') || lowerTitle.includes('dining')) {
    return { category: EVENT_CATEGORIES.FOOD, venue: 'Restaurant', price: '₹800 - ₹3000' };
  }
  if (lowerTitle.includes('theater') || lowerTitle.includes('performance')) {
    return { category: EVENT_CATEGORIES.ENTERTAINMENT, venue: 'Theater', price: '₹600 - ₹2500' };
  }
  
  return { category: EVENT_CATEGORIES.ENTERTAINMENT, venue: 'Event Venue', price: '₹500 - ₹2500' };
}
