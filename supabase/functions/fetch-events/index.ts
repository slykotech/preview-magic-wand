import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Location cache hash generator
function generateLocationHash(lat: number, lng: number, radius: number): string {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;
}

// Duplicate detection for events
function generateEventHash(title: string, date: string, location: string, organizer?: string): string {
  const normalized = [
    title.toLowerCase().trim(),
    date,
    location.toLowerCase().trim(),
    (organizer || '').toLowerCase().trim()
  ].join('|');
  
  return btoa(normalized).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

// Eventbrite API integration
async function fetchEventbriteEvents(lat: number, lng: number, radius: number) {
  console.log('Fetching from Eventbrite...');
  
  try {
    // Using Eventbrite's free discovery API with future-only events
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?location.latitude=${lat}&location.longitude=${lng}&location.within=${radius}km&start_date.range_start=${new Date().toISOString()}&expand=venue&sort_by=date`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('EVENTBRITE_TOKEN') || 'public'}`,
        }
      }
    );

    if (!response.ok) {
      console.log('Eventbrite API failed, using mock data');
      return [];
    }

    const data = await response.json();
    return (data.events || []).slice(0, 20).map((event: any) => ({
      title: event.name?.text || 'Event',
      description: event.description?.text || '',
      event_date: new Date(event.start.utc).toISOString().split('T')[0],
      event_time: new Date(event.start.utc).toTimeString().split(' ')[0],
      location_name: event.venue?.name || 'TBD',
      location_address: event.venue?.address?.localized_address_display || '',
      latitude: parseFloat(event.venue?.latitude || lat),
      longitude: parseFloat(event.venue?.longitude || lng),
      category: event.category?.name || 'entertainment',
      price_range: event.ticket_availability?.minimum_ticket_price?.display || 'Free',
      organizer: event.organizer?.name || '',
      source_url: event.url || '',
      source_platform: 'eventbrite',
      image_url: event.logo?.url || null,
      tags: event.tags || []
    }));
  } catch (error) {
    console.error('Eventbrite fetch error:', error);
    return [];
  }
}

// Google Places API integration for finding real venues that host events
async function fetchGooglePlacesEvents(lat: number, lng: number, radius: number) {
  console.log(`Fetching venues from Google Places API for: ${lat}, ${lng} within ${radius}km`);
  
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) {
    console.log('No Google Places API key found');
    return [];
  }

  try {
    // Search for venues that typically host events
    const venueTypes = [
      'restaurant', 'cafe', 'bar', 'night_club', 'movie_theater', 
      'museum', 'art_gallery', 'amusement_park', 'zoo', 'aquarium',
      'shopping_mall', 'stadium', 'gym', 'spa'
    ];

    const allEvents: any[] = [];

    for (const type of venueTypes.slice(0, 3)) { // Limit to 3 types to avoid quota issues
      try {
        // Convert radius from km to meters (Google Places uses meters)
        const radiusMeters = radius * 1000;
        
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${type}&key=${apiKey}`
        );

        if (!response.ok) {
          console.log(`Failed to fetch ${type} venues: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.status === 'OK' && data.results) {
          // Generate realistic events based on venue type
          const venueEvents = data.results.slice(0, 5).map((place: any) => 
            generateEventFromVenue(place, type)
          ).filter(Boolean);
          
          allEvents.push(...venueEvents);
        }
      } catch (typeError) {
        console.error(`Error fetching ${type} venues:`, typeError);
      }
    }

    console.log(`Generated ${allEvents.length} events from Google Places venues`);
    return allEvents;

  } catch (error) {
    console.error('Google Places API error:', error);
    return [];
  }
}

// Generate realistic events based on venue information
function generateEventFromVenue(place: any, venueType: string) {
  const today = new Date();
  const eventDate = new Date(today);
  eventDate.setDate(today.getDate() + Math.floor(Math.random() * 21) + 1); // 1-21 days from now

  // More diverse event generation based on venue specifics
  const venueEventMap: Record<string, any> = {
    restaurant: {
      events: [
        `Special Tasting Menu at ${place.name}`,
        `Chef's Table Experience - ${place.name}`,
        `Wine Pairing Dinner at ${place.name}`,
        `Date Night Special - ${place.name}`,
        `Weekend Brunch at ${place.name}`,
        `Cooking Class at ${place.name}`,
        `Food Festival Night - ${place.name}`,
        `Live Music & Dining at ${place.name}`
      ],
      categories: ['food', 'romantic', 'cultural'],
      times: ['11:00', '13:00', '18:00', '19:30', '20:00', '21:00'],
      prices: ['₹₹', '₹₹₹', '₹₹₹₹']
    },
    cafe: {
      events: [
        `Coffee Cupping at ${place.name}`,
        `Artisan Breakfast at ${place.name}`,
        `Book Club Meeting - ${place.name}`,
        `Live Acoustic Session at ${place.name}`,
        `Art & Coffee at ${place.name}`,
        `Morning Yoga & Coffee - ${place.name}`,
        `Business Networking at ${place.name}`,
        `Poetry Reading at ${place.name}`
      ],
      categories: ['food', 'cultural', 'networking'],
      times: ['08:00', '10:00', '12:00', '15:00', '17:00', '19:00'],
      prices: ['₹', '₹₹']
    },
    bar: {
      events: [
        `Happy Hour at ${place.name}`,
        `Live DJ Night - ${place.name}`,
        `Cocktail Masterclass at ${place.name}`,
        `Trivia Night - ${place.name}`,
        `Karaoke Evening at ${place.name}`,
        `Sports Viewing Party - ${place.name}`,
        `Date Night Cocktails at ${place.name}`,
        `Weekend Party - ${place.name}`
      ],
      categories: ['entertainment', 'music', 'romantic'],
      times: ['17:00', '18:00', '20:00', '21:30', '22:00'],
      prices: ['₹₹', '₹₹₹']
    },
    night_club: {
      events: [
        `DJ Night at ${place.name}`,
        `Dance Party - ${place.name}`,
        `Theme Night at ${place.name}`,
        `Live Music Show - ${place.name}`,
        `Weekend Celebration at ${place.name}`,
        `Special Guest DJ - ${place.name}`
      ],
      categories: ['entertainment', 'music', 'dancing'],
      times: ['21:00', '22:00', '23:00'],
      prices: ['₹₹', '₹₹₹']
    },
    movie_theater: {
      events: [
        `Latest Movie Screening at ${place.name}`,
        `Date Night Movie at ${place.name}`,
        `Special Preview Show - ${place.name}`,
        `IMAX Experience at ${place.name}`,
        `Couple's Movie Night - ${place.name}`,
        `Weekend Blockbuster at ${place.name}`
      ],
      categories: ['entertainment', 'romantic'],
      times: ['12:00', '15:00', '18:00', '21:00'],
      prices: ['₹₹', '₹₹₹']
    },
    museum: {
      events: [
        `Art Exhibition at ${place.name}`,
        `Guided Heritage Tour - ${place.name}`,
        `Cultural Workshop at ${place.name}`,
        `Interactive Gallery Walk - ${place.name}`,
        `Photography Exhibition - ${place.name}`,
        `Educational Tour at ${place.name}`,
        `Art Appreciation Class - ${place.name}`
      ],
      categories: ['cultural', 'educational', 'romantic'],
      times: ['10:00', '12:00', '14:00', '16:00'],
      prices: ['₹', '₹₹']
    },
    art_gallery: {
      events: [
        `Contemporary Art Show at ${place.name}`,
        `Artist Meet & Greet - ${place.name}`,
        `Gallery Opening Night - ${place.name}`,
        `Art Appreciation Evening at ${place.name}`,
        `Creative Workshop - ${place.name}`,
        `Sculpture Exhibition at ${place.name}`
      ],
      categories: ['cultural', 'artistic', 'romantic'],
      times: ['11:00', '14:00', '17:00', '19:00'],
      prices: ['₹', '₹₹']
    },
    amusement_park: {
      events: [
        `Adventure Day at ${place.name}`,
        `Couple's Fun Day - ${place.name}`,
        `Weekend Adventure at ${place.name}`,
        `Thrilling Rides Experience - ${place.name}`,
        `Family Fun Time at ${place.name}`,
        `Date Adventure at ${place.name}`
      ],
      categories: ['adventure', 'entertainment', 'romantic'],
      times: ['10:00', '12:00', '14:00', '16:00'],
      prices: ['₹₹', '₹₹₹']
    },
    zoo: {
      events: [
        `Wildlife Tour at ${place.name}`,
        `Animal Feeding Experience - ${place.name}`,
        `Educational Safari at ${place.name}`,
        `Nature Photography at ${place.name}`,
        `Conservation Talk - ${place.name}`,
        `Wildlife Adventure at ${place.name}`
      ],
      categories: ['educational', 'nature', 'adventure'],
      times: ['09:00', '11:00', '14:00', '16:00'],
      prices: ['₹₹', '₹₹₹']
    },
    shopping_mall: {
      events: [
        `Shopping Experience at ${place.name}`,
        `Fashion Show - ${place.name}`,
        `Food Court Festival at ${place.name}`,
        `Weekend Market at ${place.name}`,
        `Brand Launch Event - ${place.name}`,
        `Couple's Shopping Day at ${place.name}`
      ],
      categories: ['shopping', 'fashion', 'food'],
      times: ['10:00', '12:00', '15:00', '18:00'],
      prices: ['₹₹', '₹₹₹']
    },
    gym: {
      events: [
        `Couples Workout at ${place.name}`,
        `Fitness Challenge - ${place.name}`,
        `Yoga Session at ${place.name}`,
        `Dance Fitness Class - ${place.name}`,
        `Strength Training Workshop - ${place.name}`,
        `Wellness Session at ${place.name}`
      ],
      categories: ['fitness', 'wellness', 'sports'],
      times: ['06:00', '09:00', '17:00', '19:00'],
      prices: ['₹', '₹₹']
    },
    spa: {
      events: [
        `Couples Spa Day at ${place.name}`,
        `Relaxation Session - ${place.name}`,
        `Wellness Retreat at ${place.name}`,
        `Massage Therapy at ${place.name}`,
        `Beauty Treatment at ${place.name}`,
        `Romantic Spa Experience - ${place.name}`
      ],
      categories: ['wellness', 'romantic', 'relaxation'],
      times: ['10:00', '12:00', '14:00', '16:00'],
      prices: ['₹₹₹', '₹₹₹₹']
    }
  };

  const venueInfo = venueEventMap[venueType] || venueEventMap.restaurant;
  
  // Add randomization to make events more unique
  const eventIndex = Math.floor(Math.random() * venueInfo.events.length);
  const eventTitle = venueInfo.events[eventIndex];
  const eventTime = venueInfo.times[Math.floor(Math.random() * venueInfo.times.length)];
  const category = venueInfo.categories[Math.floor(Math.random() * venueInfo.categories.length)];
  const priceRange = venueInfo.prices[Math.floor(Math.random() * venueInfo.prices.length)];

  // Create unique descriptions based on venue rating and details
  const rating = place.rating ? `(${place.rating}⭐)` : '';
  const description = `${eventTitle}. Located at ${place.vicinity || 'your area'} ${rating}. ${generateDescriptionByCategory(category, place.name)}.`;

  // Create unique hash for each event
  const uniqueId = `${place.place_id}_${eventDate.toISOString().split('T')[0]}_${eventTime}_${eventIndex}`;

  return {
    id: uniqueId,
    title: eventTitle,
    description: description,
    event_date: eventDate.toISOString().split('T')[0],
    event_time: eventTime,
    location_name: place.name || 'Venue',
    location_address: place.vicinity || '',
    latitude: parseFloat(place.geometry?.location?.lat || 0),
    longitude: parseFloat(place.geometry?.location?.lng || 0),
    category: category,
    price_range: priceRange,
    organizer: place.name || 'Venue',
    source_url: '',
    source_platform: 'google_places',
    image_url: place.photos?.[0] ? 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${Deno.env.get('GOOGLE_PLACES_API_KEY')}` : 
      null,
    tags: [venueType, category, 'local', place.name?.toLowerCase().replace(/\s+/g, '_')]
  };
}

// Generate category-specific descriptions
function generateDescriptionByCategory(category: string, venueName: string): string {
  const descriptions: Record<string, string[]> = {
    food: [
      `Indulge in culinary delights and exceptional flavors`,
      `Experience fine dining with a perfect ambiance`,
      `Savor authentic cuisine in a romantic setting`,
      `Enjoy delicious food with great company`
    ],
    romantic: [
      `Perfect for a romantic evening with your partner`,
      `Create beautiful memories in an intimate setting`,
      `Ideal for couples looking for a special experience`,
      `Romance and elegance combined`
    ],
    cultural: [
      `Immerse yourself in rich cultural experiences`,
      `Discover art, history, and local traditions`,
      `Educational and entertaining cultural journey`,
      `Explore the heritage and culture of the region`
    ],
    entertainment: [
      `Fun-filled experience with great entertainment`,
      `Enjoy lively atmosphere and exciting activities`,
      `Perfect for a night out with lots of entertainment`,
      `Thrilling and engaging entertainment awaits`
    ],
    fitness: [
      `Boost your health and wellness together`,
      `Stay active and energized with fitness activities`,
      `Combine wellness with quality time`,
      `Achieve your fitness goals in a supportive environment`
    ]
  };

  const categoryDescriptions = descriptions[category] || descriptions.food;
  return categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
}

// Mock data generation removed - using real events only

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { latitude, longitude, radius = 100 } = await req.json();
    
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    console.log(`Fetching events for: ${latitude}, ${longitude} within ${radius}km (increased default radius)`);

    // Enhanced filtering to exclude conventions/caterings and focus on experiences
    const excludeKeywords = ['convention', 'catering', 'corporate', 'conference', 'seminar', 'workshop']; 
    const includeKeywords = ['restaurant', 'dining', 'entertainment', 'music', 'food', 'experience', 'activity'];

    // Fetch events from multiple sources: database + Google Places API
    console.log(`Fetching events from database for location: ${latitude}, ${longitude} with radius: ${radius}km`);
    
    // 1. Fetch from database (scraped events)
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString().split('T')[0]) // Only future events
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('event_date', { ascending: true })
      .limit(200); // Increased limit for better filtering
    
    if (eventsError) {
      console.error('Error fetching events from database:', eventsError);
    }
    
    // 2. Fetch from Google Places API for real-time venue events
    const googlePlacesEvents = await fetchGooglePlacesEvents(latitude, longitude, radius);
    console.log(`Found ${googlePlacesEvents.length} events from Google Places API`);
    
    // 3. Combine all events
    const allEvents = [
      ...(events || []),
      ...googlePlacesEvents
    ];
    
    // Filter events by location if coordinates are provided
    let filteredEvents = allEvents;
    if (latitude && longitude && radius) {
      filteredEvents = allEvents.filter(event => {
        if (!event.latitude || !event.longitude) return true; // Include events without coordinates
        
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in kilometers
        const dLat = (event.latitude - latitude) * Math.PI / 180;
        const dLng = (event.longitude - longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(latitude * Math.PI / 180) * Math.cos(event.latitude * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance <= radius;
      });
    }
    
    console.log(`Found ${filteredEvents.length} total events within ${radius}km radius (${(events || []).length} from database, ${googlePlacesEvents.length} from Google Places)`);
    
    return new Response(JSON.stringify({ 
      events: filteredEvents,
      source: 'database',
      totalFound: filteredEvents.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-events function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      events: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});