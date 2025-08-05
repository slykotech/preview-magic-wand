import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceSearchParams {
  latitude: number;
  longitude: number;
  category?: string;
}

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now: boolean;
  };
  formatted_phone_number?: string;
  website?: string;
}

// Comprehensive place types for cultural and historical places
const PLACE_TYPES = {
  'Cultural & Historical': ['tourist_attraction', 'museum', 'art_gallery', 'cultural_center'],
  'Religious & Spiritual': ['church', 'hindu_temple', 'mosque', 'synagogue', 'temple', 'place_of_worship'],
  'Entertainment': ['movie_theater', 'amusement_park', 'bowling_alley', 'casino', 'night_club'],
  'Dining & Social': ['restaurant', 'cafe', 'bar', 'brewery'],
  'Nature & Outdoor': ['park', 'zoo', 'aquarium', 'botanical_garden'],
  'Shopping & Markets': ['shopping_mall', 'market', 'bookstore', 'jewelry_store']
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Google Places API key not configured' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const { latitude, longitude, category }: PlaceSearchParams = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Latitude and longitude are required' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log(`Searching for places near ${latitude}, ${longitude} with 100km radius`);

    // First, check database for existing places in the area
    const { data: existingPlaces, error: dbError } = await supabase.rpc('find_nearby_places', {
      search_lat: latitude,
      search_lng: longitude,
      radius_km: 100,
      category_filter: category || null
    });

    if (dbError) {
      console.error('Database query error:', dbError);
    }

    // Verify distances for database results to ensure they're actually nearby
    let validPlaces = [];
    if (existingPlaces && existingPlaces.length > 0) {
      validPlaces = existingPlaces.filter((place: any) => {
        const actualDistance = calculateDistance(latitude, longitude, place.latitude, place.longitude);
        return actualDistance <= 100;
      });
      
      console.log(`Found ${existingPlaces.length} places from database, ${validPlaces.length} are valid`);
    }

    // If we have enough valid places from database, return them
    if (validPlaces && validPlaces.length >= 10) {
      console.log(`Returning ${validPlaces.length} places from database`);
      return new Response(JSON.stringify({ 
        success: true,
        places: validPlaces.map((place: any) => ({
          id: place.google_place_id,
          name: place.name,
          address: place.address,
          rating: parseFloat(place.rating) || 0,
          priceLevel: place.price_level,
          latitude: place.latitude,
          longitude: place.longitude,
          types: place.place_types,
          photoReference: place.photo_references?.[0],
          isOpen: place.is_open,
          distance: parseFloat(place.distance_km)
        })),
        total: validPlaces.length,
        source: 'database'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If not enough places in database, fetch from Google Places API
    console.log('Fetching from Google Places API...');
    
    // Get place types for the category
    const placeTypes = category && PLACE_TYPES[category as keyof typeof PLACE_TYPES] 
      ? PLACE_TYPES[category as keyof typeof PLACE_TYPES] 
      : ['tourist_attraction', 'museum', 'restaurant', 'park', 'shopping_mall'];

    const allPlaces: any[] = [];

    // Search for multiple place types to get comprehensive results
    for (const placeType of placeTypes) {
      const params = new URLSearchParams({
        key: apiKey,
        location: `${latitude},${longitude}`,
        radius: '100000', // 100km fixed radius
        type: placeType
      });

      const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
      
      try {
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results) {
          for (const place of data.results) {
            // Store place in database
            await supabase.from('places').upsert({
              google_place_id: place.place_id,
              name: place.name,
              address: place.vicinity || place.formatted_address,
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
              place_types: place.types,
              rating: place.rating,
              price_level: place.price_level,
              photo_references: place.photos?.map((p: any) => p.photo_reference) || [],
              phone: place.formatted_phone_number,
              website: place.website,
              opening_hours: place.opening_hours ? { open_now: place.opening_hours.open_now } : null,
              is_open: place.opening_hours?.open_now,
              google_data: place,
              last_updated: new Date().toISOString()
            }, { onConflict: 'google_place_id' });

            // Add to results if meets criteria
            if (place.name && (place.rating || 0) >= 3.0) {
              allPlaces.push({
                id: place.place_id,
                name: place.name,
                address: place.vicinity || place.formatted_address,
                rating: place.rating || 0,
                priceLevel: place.price_level,
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
                types: place.types,
                photoReference: place.photos?.[0]?.photo_reference,
                isOpen: place.opening_hours?.open_now,
                distance: calculateDistance(latitude, longitude, place.geometry.location.lat, place.geometry.location.lng)
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching ${placeType}:`, error);
      }
    }

    // Remove duplicates and sort by distance
    const uniquePlaces = allPlaces
      .filter((place, index, self) => 
        index === self.findIndex(p => p.id === place.id)
      )
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 50);

    console.log(`Found ${uniquePlaces.length} places from Google Places API`);

    return new Response(JSON.stringify({ 
      success: true,
      places: uniquePlaces,
      total: uniquePlaces.length,
      source: 'google_api'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error searching places:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Calculate distance between two coordinates in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}