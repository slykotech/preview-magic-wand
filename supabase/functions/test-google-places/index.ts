import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'GOOGLE_PLACES_API_KEY is not configured' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log('Testing Google Places API key...');

    // Test API with a simple place search for Hyderabad
    const params = new URLSearchParams({
      key: apiKey,
      location: '17.3850,78.4867', // Hyderabad coordinates
      radius: '5000', // 5km radius  
      type: 'establishment',
      keyword: 'restaurant'
    });
    
    const testUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
    console.log('Making test request to Google Places API...');
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    console.log('Google Places API Response Status:', data.status);
    console.log('Google Places API Response:', JSON.stringify(data, null, 2));

    // Check API response
    if (data.status === 'OK') {
      return new Response(JSON.stringify({ 
        success: true,
        message: '✅ Google Places API key is working!',
        results_found: data.results?.length || 0,
        status: data.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (data.status === 'REQUEST_DENIED') {
      return new Response(JSON.stringify({ 
        success: false,
        error: '❌ API key invalid or Google Places API not enabled',
        status: data.status,
        error_message: data.error_message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      return new Response(JSON.stringify({ 
        success: false,
        error: '⚠️ Google Places API quota exceeded',
        status: data.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false,
        error: `Google Places API error: ${data.status}`,
        status: data.status,
        error_message: data.error_message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

  } catch (error) {
    console.error('Error testing Google Places API:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});