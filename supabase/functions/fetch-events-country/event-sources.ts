// Event source definitions and utility functions
// Copied from fetch-events for isolated edge function deployment

export interface EventSource {
  name: string;
  priority: number;
  cost: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  requiresAuth: boolean;
}

export const EVENT_SOURCES: Record<string, EventSource> = {
  google: {
    name: 'Google Places',
    priority: 1,
    cost: 0.017,
    rateLimit: { maxRequests: 100, windowMs: 60000 },
    requiresAuth: true
  },
  bookmyshow: {
    name: 'BookMyShow',
    priority: 2,
    cost: 0.01,
    rateLimit: { maxRequests: 50, windowMs: 60000 },
    requiresAuth: false
  },
  insider: {
    name: 'Paytm Insider',
    priority: 3,
    cost: 0.01,
    rateLimit: { maxRequests: 50, windowMs: 60000 },
    requiresAuth: false
  },
  district: {
    name: 'District',
    priority: 4,
    cost: 0.01,
    rateLimit: { maxRequests: 30, windowMs: 60000 },
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

export const EVENT_CATEGORIES = {
  MUSIC: 'Music',
  ARTS: 'Arts & Culture',
  FOOD: 'Food & Drinks',
  NIGHTLIFE: 'Nightlife',
  OUTDOOR: 'Outdoor & Adventure',
  ENTERTAINMENT: 'Entertainment',
  CULTURAL: 'Cultural',
  SPORTS: 'Sports',
  WELLNESS: 'Health & Wellness'
};

export function generateEventDates(count: number, startOffset: number = 1): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + startOffset + i);
    dates.push(futureDate);
  }
  
  return dates;
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatEventTiming(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  };
  
  const daysDiff = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) return 'Today';
  if (daysDiff === 1) return 'Tomorrow';
  if (daysDiff <= 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  
  return date.toLocaleDateString('en-US', options);
}

export function generateLocationBasedEvents(location: string, count: number = 10): UnifiedEvent[] {
  const eventTypes = [
    { title: 'Jazz Under the Stars', category: EVENT_CATEGORIES.MUSIC, price: '₹800 - ₹2500' },
    { title: 'Wine Tasting Evening', category: EVENT_CATEGORIES.FOOD, price: '₹1200 - ₹3500' },
    { title: 'Art Gallery Opening', category: EVENT_CATEGORIES.ARTS, price: '₹500 - ₹1500' },
    { title: 'Rooftop Cinema', category: EVENT_CATEGORIES.ENTERTAINMENT, price: '₹600 - ₹2000' },
    { title: 'Cooking Workshop for Couples', category: EVENT_CATEGORIES.FOOD, price: '₹1500 - ₹4000' },
    { title: 'Stand-up Comedy Night', category: EVENT_CATEGORIES.ENTERTAINMENT, price: '₹400 - ₹1200' },
    { title: 'Salsa Dancing Class', category: EVENT_CATEGORIES.ENTERTAINMENT, price: '₹800 - ₹2000' },
    { title: 'Photography Walk', category: EVENT_CATEGORIES.OUTDOOR, price: '₹300 - ₹800' }
  ];

  const venues = [
    'Cultural Center', 'Rooftop Lounge', 'Art Gallery', 'Community Hall',
    'Restaurant', 'Cafe', 'Studio', 'Park Pavilion'
  ];

  return Array.from({ length: count }, (_, index) => {
    const eventType = eventTypes[index % eventTypes.length];
    const venue = venues[index % venues.length];
    const eventDate = new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000);
    
    return {
      id: `generated_${location.replace(/\s+/g, '_')}_${index}_${Date.now()}`,
      title: `${eventType.title} in ${location}`,
      distance: `${Math.floor(Math.random() * 25) + 5} km away`,
      timing: formatEventTiming(eventDate),
      description: `Join us for ${eventType.title.toLowerCase()} - perfect for couples!`,
      category: eventType.category,
      venue: `${venue}, ${location}`,
      city: location,
      price: eventType.price,
      date: eventDate.toISOString().split('T')[0],
      time: `${18 + (index % 4)}:00`,
      source: 'generated',
      location_lat: 19.0760 + (Math.random() - 0.5) * 0.1,
      location_lng: 72.8777 + (Math.random() - 0.5) * 0.1,
      location_name: `${venue}, ${location}`
    };
  });
}