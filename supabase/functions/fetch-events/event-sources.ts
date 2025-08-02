// Centralized event source configurations and utilities

export interface EventSource {
  name: string;
  priority: number;
  isFree: boolean;
  rateLimitPerHour: number;
  baseUrl?: string;
  requiresAuth: boolean;
}

export const EVENT_SOURCES: Record<string, EventSource> = {
  google: {
    name: 'Google Places',
    priority: 1,
    isFree: false,
    rateLimitPerHour: 100,
    requiresAuth: true
  },
  bookmyshow: {
    name: 'BookMyShow',
    priority: 2,
    isFree: true,
    rateLimitPerHour: 60,
    baseUrl: 'https://in.bookmyshow.com',
    requiresAuth: false
  },
  insider: {
    name: 'Paytm Insider',
    priority: 3,
    isFree: true,
    rateLimitPerHour: 60,
    baseUrl: 'https://insider.in',
    requiresAuth: false
  },
  district: {
    name: 'District',
    priority: 4,
    isFree: true,
    rateLimitPerHour: 60,
    baseUrl: 'https://district.in',
    requiresAuth: false
  }
};

export interface UnifiedEvent {
  id: string;
  title: string;
  distance: string;
  timing: string;
  description: string;
  category: string;
  venue?: string;
  city?: string;
  price?: string;
  image?: string;
  bookingUrl?: string;
  date?: string;
  time?: string;
  source: string;
}

// Common categories for events
export const EVENT_CATEGORIES = {
  MUSIC: 'Music',
  COMEDY: 'Comedy',
  ARTS: 'Arts',
  FOOD: 'Food & Drink',
  NIGHTLIFE: 'Nightlife',
  SPORTS: 'Sports',
  WORKSHOP: 'Workshop',
  ENTERTAINMENT: 'Entertainment',
  CULTURAL: 'Cultural',
  OUTDOOR: 'Outdoor'
};

// Helper to generate event dates
export function generateEventDates(count: number, startOffset: number = 1): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const eventDate = new Date(today.getTime() + (startOffset + i) * 24 * 60 * 60 * 1000);
    dates.push(eventDate);
  }
  
  return dates;
}

// Helper to calculate distance
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper to format timing
export function formatEventTiming(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

// Helper to generate mock events for a location
export function generateLocationBasedEvents(location: string, count: number = 5): UnifiedEvent[] {
  const venues = [
    'Downtown Cultural Center',
    'City Convention Hall',
    'Metropolitan Arts Complex',
    'Urban Entertainment Hub',
    'Community Event Space'
  ];
  
  const events: UnifiedEvent[] = [];
  const dates = generateEventDates(count);
  
  for (let i = 0; i < count; i++) {
    const eventDate = dates[i];
    const venue = venues[i % venues.length];
    
    events.push({
      id: `local_${location.replace(/\s+/g, '_')}_${i}`,
      title: `${location} Cultural Event ${i + 1}`,
      distance: `${Math.floor(Math.random() * 15) + 2} km away`,
      timing: formatEventTiming(eventDate),
      description: `Discover local culture and entertainment in ${location}`,
      category: Object.values(EVENT_CATEGORIES)[i % Object.values(EVENT_CATEGORIES).length],
      venue,
      city: location,
      price: `₹${(Math.floor(Math.random() * 10) + 3) * 100}`,
      date: eventDate.toISOString().split('T')[0],
      time: `${18 + (i % 6)}:30`,
      source: 'local'
    });
  }
  
  return events;
}