import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;
  type?: string;
  keyword?: string;
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { latitude, longitude, radius = 5000, type, keyword }: PlaceSearchParams = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Latitude and longitude are required' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log(`Searching for places near ${latitude}, ${longitude} with radius ${radius}m`);

    // Build search parameters
    const params = new URLSearchParams({
      key: apiKey,
      location: `${latitude},${longitude}`,
      radius: radius.toString(),
    });

    // Add type filter if specified
    if (type && type !== 'all') {
      params.append('type', type);
    }

    // Add keyword if specified
    if (keyword) {
      params.append('keyword', keyword);
    }

    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
    console.log('Making request to Google Places API...');
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    console.log('Google Places API Response Status:', data.status);

    if (data.status !== 'OK') {
      console.error('Google Places API Error:', data);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Google Places API error: ${data.status}`,
        message: data.error_message || 'Unknown error'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Transform and filter places
    const places = data.results
      .filter((place: GooglePlace) => place.name && place.rating >= 3.0) // Only show places with good ratings
      .slice(0, 20) // Limit to 20 results
      .map((place: GooglePlace) => ({
        id: place.place_id,
        name: place.name,
        address: place.vicinity,
        rating: place.rating || 0,
        priceLevel: place.price_level,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        types: place.types,
        photoReference: place.photos?.[0]?.photo_reference,
        isOpen: place.opening_hours?.open_now,
        // Calculate distance (approximate)
        distance: calculateDistance(latitude, longitude, place.geometry.location.lat, place.geometry.location.lng)
      }))
      .sort((a, b) => a.distance - b.distance); // Sort by distance

    console.log(`Found ${places.length} places`);

    return new Response(JSON.stringify({ 
      success: true,
      places,
      total: places.length
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