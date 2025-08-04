import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GooglePlace {
  id: string;
  displayName: { text: string };
  location: { latitude: number; longitude: number };
  rating?: number;
  types: string[];
  photos?: Array<{ name: string }>;
}

interface GooglePlacesResponse {
  places: GooglePlace[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleApiKey = Deno.env.get('GOOGLE_EVENTS_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting Google Places events location fix...')

    // Get all Google events that are missing coordinates
    const { data: googleEvents, error: fetchError } = await supabase
      .from('events')
      .select('id, external_id, venue, city, state, country')
      .eq('source', 'google')
      .or('location_lat.is.null,location_lng.is.null')
      .limit(100)

    if (fetchError) {
      throw new Error(`Failed to fetch Google events: ${fetchError.message}`)
    }

    if (!googleEvents || googleEvents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No Google events found that need coordinate updates',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${googleEvents.length} Google events needing coordinate updates`)

    let updatedCount = 0
    let errorCount = 0

    // Process each event to get its coordinates
    for (const event of googleEvents) {
      try {
        if (!event.venue) {
          console.log(`Skipping event ${event.id} - no venue name`)
          continue
        }

        // Search for the venue using Google Places API
        const searchQuery = event.venue + (event.city ? `, ${event.city}` : '')
        console.log(`Searching for: ${searchQuery}`)

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress'
          },
          body: JSON.stringify({
            textQuery: searchQuery,
            maxResultCount: 1
          })
        })

        if (!response.ok) {
          console.error(`Google Places API error for ${event.venue}: ${response.status}`)
          errorCount++
          continue
        }

        const data: GooglePlacesResponse = await response.json()

        if (!data.places || data.places.length === 0) {
          console.log(`No places found for: ${searchQuery}`)
          continue
        }

        const place = data.places[0]
        
        // Get location details from reverse geocoding
        let city = event.city
        let state = event.state
        let country = event.country

        if (place.location) {
          try {
            const geocodeResponse = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${place.location.latitude},${place.location.longitude}&key=${googleApiKey}`
            )
            
            if (geocodeResponse.ok) {
              const geocodeData = await geocodeResponse.json()
              if (geocodeData.status === 'OK' && geocodeData.results?.[0]) {
                const addressComponents = geocodeData.results[0].address_components
                
                const cityComponent = addressComponents.find(component => 
                  component.types.includes('locality')
                )
                const stateComponent = addressComponents.find(component => 
                  component.types.includes('administrative_area_level_1')
                )
                const countryComponent = addressComponents.find(component => 
                  component.types.includes('country')
                )
                
                if (cityComponent && !city) city = cityComponent.long_name
                if (stateComponent && !state) state = stateComponent.long_name
                if (countryComponent && !country) country = countryComponent.long_name
              }
            }
          } catch (geocodeError) {
            console.error('Geocoding error:', geocodeError)
          }
        }

        // Update the event with coordinates and location data
        const { error: updateError } = await supabase
          .from('events')
          .update({
            location_lat: place.location.latitude,
            location_lng: place.location.longitude,
            location_name: place.displayName.text,
            city: city || event.city,
            state: state || event.state,
            country: country || event.country
          })
          .eq('id', event.id)

        if (updateError) {
          console.error(`Failed to update event ${event.id}:`, updateError)
          errorCount++
        } else {
          console.log(`Updated event ${event.id} with coordinates: ${place.location.latitude}, ${place.location.longitude}`)
          updatedCount++
        }

        // Add a small delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (eventError) {
        console.error(`Error processing event ${event.id}:`, eventError)
        errorCount++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed Google events`,
        processed: googleEvents.length,
        updated: updatedCount,
        errors: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fixing Google events:', error)
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