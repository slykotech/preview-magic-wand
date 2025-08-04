import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current state of Google events
    const { data: allGoogleEvents, error: allError } = await supabase
      .from('events')
      .select('id, title, venue, city, state, country, location_lat, location_lng, location_name, source')
      .eq('source', 'google')
      .limit(10)

    const { data: eventsWithCoords, error: coordsError } = await supabase
      .from('events')
      .select('id, title, venue, location_lat, location_lng')
      .eq('source', 'google')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .limit(10)

    const { data: eventsWithoutCoords, error: noCoordsError } = await supabase
      .from('events')
      .select('id, title, venue, city')
      .eq('source', 'google')
      .or('location_lat.is.null,location_lng.is.null')
      .limit(10)

    if (allError || coordsError || noCoordsError) {
      throw new Error('Database query failed')
    }

    // Test location-based search
    const { data: locationResults, error: locationError } = await supabase
      .rpc('get_events_by_location_unlimited', {
        user_lat: 19.0760,
        user_lng: 72.8777,
        radius_km: 25,
        max_events: 20
      })

    if (locationError) {
      console.error('Location search error:', locationError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_google_events: allGoogleEvents?.length || 0,
          events_with_coordinates: eventsWithCoords?.length || 0,
          events_without_coordinates: eventsWithoutCoords?.length || 0,
          location_search_results: locationResults?.length || 0
        },
        sample_events: {
          all_google_events: allGoogleEvents?.slice(0, 3) || [],
          events_with_coords: eventsWithCoords?.slice(0, 3) || [],
          events_without_coords: eventsWithoutCoords?.slice(0, 3) || [],
          location_search_sample: locationResults?.filter(event => event.source === 'google').slice(0, 3) || []
        },
        location_search_error: locationError?.message || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error testing Google location:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})