// Simple fallback event generators for country-wide fetching
// This is a simplified version for the country fetcher

import { UnifiedEvent, generateEventDates, formatEventTiming, EVENT_CATEGORIES, calculateDistance } from './event-sources.ts';

// Firecrawl status tracking
let firecrawlStatus = {
  available: false,
  error: null as string | null,
  lastChecked: null as number | null
};

export function getFirecrawlStatus() {
  return firecrawlStatus;
}

// Initialize Firecrawl check
try {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  firecrawlStatus.available = !!apiKey;
  firecrawlStatus.lastChecked = Date.now();
  if (!firecrawlStatus.available) {
    firecrawlStatus.error = 'API key not configured';
  }
} catch (error) {
  firecrawlStatus.error = (error as Error).message;
  console.error('Firecrawl initialization error:', error);
}

// Location coordinates for major cities
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
    'jaipur': { lat: 26.9124, lng: 75.7873 }
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

// Simplified fallback functions that generate mock events for each city
export async function fetchFirecrawlBookMyShowEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  return generateBookMyShowFallback(location, userLat, userLng);
}

export async function fetchFirecrawlPaytmInsiderEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  return generatePaytmInsiderFallback(location, userLat, userLng);
}

export async function fetchFirecrawlDistrictEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  return generateDistrictFallback(location, userLat, userLng);
}

export async function fetchEventbriteEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  return generateEventbriteFallback(location, userLat, userLng);
}

export async function fetchTicketmasterEvents(location: string, userLat?: number, userLng?: number): Promise<UnifiedEvent[]> {
  return generateTicketmasterFallback(location, userLat, userLng);
}

function generateBookMyShowFallback(location: string, userLat?: number, userLng?: number): UnifiedEvent[] {
  const events = [
    { title: 'Live Concert Night', category: EVENT_CATEGORIES.MUSIC, venue: 'Music Hall', price: '₹800 - ₹2500' },
    { title: 'Comedy Show', category: EVENT_CATEGORIES.ENTERTAINMENT, venue: 'Comedy Club', price: '₹500 - ₹1500' },
    { title: 'Theatre Performance', category: EVENT_CATEGORIES.ARTS, venue: 'Drama Theatre', price: '₹600 - ₹2000' }
  ];

  return events.map((event, index) => {
    const locationCoords = getLocationCoordinates(location);
    const venueCoords = generateVenueCoordinates(locationCoords.lat, locationCoords.lng);
    const eventDate = new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000);
    
    return {
      id: `bookmyshow_${location.replace(/\s+/g, '_')}_${index}_${Date.now()}`,
      title: `${event.title} in ${location}`,
      distance: userLat && userLng ? 
        `${Math.round(calculateDistance(userLat, userLng, venueCoords.lat, venueCoords.lng) * 10) / 10} km away` :
        `${Math.floor(Math.random() * 20) + 5} km away`,
      timing: formatEventTiming(eventDate),
      description: `Experience ${event.title.toLowerCase()} in ${location}`,
      category: event.category,
      venue: `${event.venue}, ${location}`,
      city: location,
      price: event.price,
      date: eventDate.toISOString().split('T')[0],
      time: `${18 + (index % 5)}:00`,
      source: 'bookmyshow',
      bookingUrl: 'https://in.bookmyshow.com',
      location: {
        latitude: venueCoords.lat,
        longitude: venueCoords.lng,
        city: location
      }
    };
  });
}

function generatePaytmInsiderFallback(location: string, userLat?: number, userLng?: number): UnifiedEvent[] {
  const events = [
    { title: 'Workshop for Couples', category: EVENT_CATEGORIES.WELLNESS, venue: 'Community Center', price: '₹1000 - ₹3000' },
    { title: 'Food Festival', category: EVENT_CATEGORIES.FOOD, venue: 'Food Court', price: '₹400 - ₹1200' }
  ];

  return events.map((event, index) => {
    const locationCoords = getLocationCoordinates(location);
    const venueCoords = generateVenueCoordinates(locationCoords.lat, locationCoords.lng);
    const eventDate = new Date(Date.now() + (index + 2) * 24 * 60 * 60 * 1000);
    
    return {
      id: `paytm_${location.replace(/\s+/g, '_')}_${index}_${Date.now()}`,
      title: `${event.title} in ${location}`,
      distance: userLat && userLng ? 
        `${Math.round(calculateDistance(userLat, userLng, venueCoords.lat, venueCoords.lng) * 10) / 10} km away` :
        `${Math.floor(Math.random() * 20) + 5} km away`,
      timing: formatEventTiming(eventDate),
      description: `Join ${event.title.toLowerCase()} in ${location}`,
      category: event.category,
      venue: `${event.venue}, ${location}`,
      city: location,
      price: event.price,
      date: eventDate.toISOString().split('T')[0],
      time: `${19 + (index % 3)}:00`,
      source: 'paytm_insider',
      bookingUrl: 'https://insider.in',
      location: {
        latitude: venueCoords.lat,
        longitude: venueCoords.lng,
        city: location
      }
    };
  });
}

function generateDistrictFallback(location: string, userLat?: number, userLng?: number): UnifiedEvent[] {
  const events = [
    { title: 'Art Exhibition', category: EVENT_CATEGORIES.ARTS, venue: 'Gallery Space', price: '₹300 - ₹800' }
  ];

  return events.map((event, index) => {
    const locationCoords = getLocationCoordinates(location);
    const venueCoords = generateVenueCoordinates(locationCoords.lat, locationCoords.lng);
    const eventDate = new Date(Date.now() + (index + 3) * 24 * 60 * 60 * 1000);
    
    return {
      id: `district_${location.replace(/\s+/g, '_')}_${index}_${Date.now()}`,
      title: `${event.title} in ${location}`,
      distance: userLat && userLng ? 
        `${Math.round(calculateDistance(userLat, userLng, venueCoords.lat, venueCoords.lng) * 10) / 10} km away` :
        `${Math.floor(Math.random() * 20) + 5} km away`,
      timing: formatEventTiming(eventDate),
      description: `Discover ${event.title.toLowerCase()} in ${location}`,
      category: event.category,
      venue: `${event.venue}, ${location}`,
      city: location,
      price: event.price,
      date: eventDate.toISOString().split('T')[0],
      time: `${17 + (index % 4)}:00`,
      source: 'district',
      bookingUrl: 'https://district.in',
      location: {
        latitude: venueCoords.lat,
        longitude: venueCoords.lng,
        city: location
      }
    };
  });
}

function generateEventbriteFallback(location: string, userLat?: number, userLng?: number): UnifiedEvent[] {
  const events = [
    { title: 'Networking Event', category: EVENT_CATEGORIES.CULTURAL, venue: 'Conference Hall', price: 'Free' },
    { title: 'Dance Workshop', category: EVENT_CATEGORIES.ENTERTAINMENT, venue: 'Dance Studio', price: '₹800 - ₹2000' }
  ];

  return events.map((event, index) => {
    const locationCoords = getLocationCoordinates(location);
    const venueCoords = generateVenueCoordinates(locationCoords.lat, locationCoords.lng);
    const eventDate = new Date(Date.now() + (index + 4) * 24 * 60 * 60 * 1000);
    
    return {
      id: `eventbrite_${location.replace(/\s+/g, '_')}_${index}_${Date.now()}`,
      title: `${event.title} in ${location}`,
      distance: userLat && userLng ? 
        `${Math.round(calculateDistance(userLat, userLng, venueCoords.lat, venueCoords.lng) * 10) / 10} km away` :
        `${Math.floor(Math.random() * 20) + 5} km away`,
      timing: formatEventTiming(eventDate),
      description: `Attend ${event.title.toLowerCase()} in ${location}`,
      category: event.category,
      venue: `${event.venue}, ${location}`,
      city: location,
      price: event.price,
      date: eventDate.toISOString().split('T')[0],
      time: `${16 + (index % 6)}:00`,
      source: 'eventbrite',
      bookingUrl: 'https://www.eventbrite.com',
      location: {
        latitude: venueCoords.lat,
        longitude: venueCoords.lng,
        city: location
      }
    };
  });
}

function generateTicketmasterFallback(location: string, userLat?: number, userLng?: number): UnifiedEvent[] {
  const events = [
    { title: 'Sports Match', category: EVENT_CATEGORIES.SPORTS, venue: 'Stadium', price: '₹1500 - ₹5000' }
  ];

  return events.map((event, index) => {
    const locationCoords = getLocationCoordinates(location);
    const venueCoords = generateVenueCoordinates(locationCoords.lat, locationCoords.lng);
    const eventDate = new Date(Date.now() + (index + 5) * 24 * 60 * 60 * 1000);
    
    return {
      id: `ticketmaster_${location.replace(/\s+/g, '_')}_${index}_${Date.now()}`,
      title: `${event.title} in ${location}`,
      distance: userLat && userLng ? 
        `${Math.round(calculateDistance(userLat, userLng, venueCoords.lat, venueCoords.lng) * 10) / 10} km away` :
        `${Math.floor(Math.random() * 20) + 5} km away`,
      timing: formatEventTiming(eventDate),
      description: `Watch ${event.title.toLowerCase()} in ${location}`,
      category: event.category,
      venue: `${event.venue}, ${location}`,
      city: location,
      price: event.price,
      date: eventDate.toISOString().split('T')[0],
      time: `${15 + (index % 7)}:00`,
      source: 'ticketmaster',
      bookingUrl: 'https://www.ticketmaster.com',
      location: {
        latitude: venueCoords.lat,
        longitude: venueCoords.lng,
        city: location
      }
    };
  });
}