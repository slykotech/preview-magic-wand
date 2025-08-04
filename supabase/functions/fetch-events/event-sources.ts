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
  state?: string;
  country?: string;
  price?: string;
  image?: string;
  bookingUrl?: string;
  date?: string;
  time?: string;
  source: string;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
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

// Helper to generate enhanced mock events for a location
export function generateLocationBasedEvents(location: string, count: number = 5): UnifiedEvent[] {
  const eventTypes = [
    { title: 'Live Music Concert', venues: ['Amphitheater', 'Concert Hall', 'Music Venue', 'Outdoor Stage'] },
    { title: 'Food Festival', venues: ['Food Court', 'Park Grounds', 'Exhibition Center', 'Street Market'] },
    { title: 'Art Exhibition', venues: ['Art Gallery', 'Museum', 'Cultural Center', 'Gallery Space'] },
    { title: 'Comedy Show', venues: ['Comedy Club', 'Theater', 'Auditorium', 'Performance Hall'] },
    { title: 'Dance Performance', venues: ['Dance Studio', 'Cultural Center', 'Theater', 'Community Hall'] },
    { title: 'Wine Tasting', venues: ['Wine Bar', 'Restaurant', 'Hotel Lounge', 'Rooftop'] },
    { title: 'Movie Screening', venues: ['Cinema', 'Outdoor Theater', 'Community Hall', 'Cultural Center'] },
    { title: 'Workshop', venues: ['Community Center', 'Library', 'Art Studio', 'Creative Space'] },
    { title: 'Market Fair', venues: ['Market Square', 'Exhibition Ground', 'Park', 'Community Plaza'] },
    { title: 'Romantic Dinner', venues: ['Fine Dining Restaurant', 'Rooftop Restaurant', 'Garden Restaurant', 'Waterfront Cafe'] }
  ];
  
  const events: UnifiedEvent[] = [];
  const dates = generateEventDates(count);
  
  for (let i = 0; i < count; i++) {
    const eventDate = dates[i];
    const eventType = eventTypes[i % eventTypes.length];
    const venue = eventType.venues[Math.floor(Math.random() * eventType.venues.length)];
    const categories = Object.keys(EVENT_CATEGORIES);
    const category = categories[i % categories.length];
    
    events.push({
      id: `local_${location.replace(/\s+/g, '_')}_${i}_${Date.now()}`,
      title: `${eventType.title} in ${location}`,
      distance: `${Math.floor(Math.random() * 20) + 1} km away`,
      timing: formatEventTiming(eventDate),
      description: `Join us for an amazing ${eventType.title.toLowerCase()} experience in ${location}. Perfect for couples and friends!`,
      category: EVENT_CATEGORIES[category],
      venue: `${venue}, ${location}`,
      city: location,
      price: `₹${(Math.floor(Math.random() * 15) + 2) * 100}`,
      date: eventDate.toISOString().split('T')[0],
      time: `${17 + (i % 7)}:${Math.random() > 0.5 ? '00' : '30'}`,
      source: 'local-enhanced',
      bookingUrl: `https://tickets.example.com/event/${i + 1}`
    });
  }
  
  return events;
}