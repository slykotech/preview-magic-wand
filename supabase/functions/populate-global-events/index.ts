import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Major cities worldwide to populate events for
const GLOBAL_CITIES = {
  'India': [
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777, country: 'IN' },
    { name: 'Delhi', lat: 28.6139, lng: 77.2090, country: 'IN' },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946, country: 'IN' },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707, country: 'IN' },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639, country: 'IN' },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, country: 'IN' },
    { name: 'Pune', lat: 18.5204, lng: 73.8567, country: 'IN' }
  ],
  'United States': [
    { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'US' },
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, country: 'US' },
    { name: 'Chicago', lat: 41.8781, lng: -87.6298, country: 'US' },
    { name: 'Houston', lat: 29.7604, lng: -95.3698, country: 'US' },
    { name: 'Phoenix', lat: 33.4484, lng: -112.0740, country: 'US' },
    { name: 'Philadelphia', lat: 39.9526, lng: -75.1652, country: 'US' },
    { name: 'San Antonio', lat: 29.4241, lng: -98.4936, country: 'US' },
    { name: 'Dallas', lat: 32.7767, lng: -96.7970, country: 'US' }
  ],
  'United Kingdom': [
    { name: 'London', lat: 51.5074, lng: -0.1278, country: 'GB' },
    { name: 'Birmingham', lat: 52.4862, lng: -1.8904, country: 'GB' },
    { name: 'Manchester', lat: 53.4808, lng: -2.2426, country: 'GB' },
    { name: 'Glasgow', lat: 55.8642, lng: -4.2518, country: 'GB' },
    { name: 'Leeds', lat: 53.8008, lng: -1.5491, country: 'GB' },
    { name: 'Liverpool', lat: 53.4084, lng: -2.9916, country: 'GB' }
  ],
  'Australia': [
    { name: 'Sydney', lat: -33.8688, lng: 151.2093, country: 'AU' },
    { name: 'Melbourne', lat: -37.8136, lng: 144.9631, country: 'AU' },
    { name: 'Brisbane', lat: -27.4698, lng: 153.0251, country: 'AU' },
    { name: 'Perth', lat: -31.9505, lng: 115.8605, country: 'AU' },
    { name: 'Adelaide', lat: -34.9285, lng: 138.6007, country: 'AU' }
  ]
};

// Populate events for a specific city using the enhanced scraper
async function populateEventsForCity(supabase: any, city: any) {
  console.log(`Populating events for ${city.name}, ${city.country}`);
  
  try {
    // Call the enhanced event scraper
    const { data: scrapingResult, error } = await supabase.functions.invoke('enhanced-event-scraper', {
      body: {
        latitude: city.lat,
        longitude: city.lng,
        radius: 50,
        includeMock: true
      }
    });
    
    if (error) {
      console.error(`Error scraping events for ${city.name}:`, error);
      return { city: city.name, success: false, error: error.message };
    }
    
    console.log(`Successfully populated events for ${city.name}: ${scrapingResult?.totalCollected || 0} events`);
    return { 
      city: city.name, 
      success: true, 
      eventsCollected: scrapingResult?.totalCollected || 0,
      breakdown: scrapingResult?.sources || {}
    };
    
  } catch (error) {
    console.error(`Exception while populating ${city.name}:`, error);
    return { city: city.name, success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { regions = 'all', maxCitiesPerRegion = 3 } = await req.json();
    
    console.log(`Starting global event population for regions: ${regions}`);
    
    const results = [];
    let totalCitiesProcessed = 0;
    let totalEventsCollected = 0;
    
    // Determine which regions to process
    const regionsToProcess = regions === 'all' ? Object.keys(GLOBAL_CITIES) : 
                            Array.isArray(regions) ? regions : [regions];
    
    for (const region of regionsToProcess) {
      if (!GLOBAL_CITIES[region]) {
        console.log(`Skipping unknown region: ${region}`);
        continue;
      }
      
      console.log(`\n--- Processing ${region} ---`);
      const cities = GLOBAL_CITIES[region].slice(0, maxCitiesPerRegion);
      
      for (const city of cities) {
        const result = await populateEventsForCity(supabase, city);
        results.push({
          region,
          ...result
        });
        
        totalCitiesProcessed++;
        if (result.success) {
          totalEventsCollected += result.eventsCollected || 0;
        }
        
        // Rate limiting: Wait between cities to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Longer wait between regions
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log(`\n--- Population Complete ---`);
    console.log(`Cities processed: ${totalCitiesProcessed}`);
    console.log(`Total events collected: ${totalEventsCollected}`);
    
    return new Response(JSON.stringify({
      success: true,
      summary: {
        regionsProcessed: regionsToProcess.length,
        citiesProcessed: totalCitiesProcessed,
        totalEventsCollected,
        averageEventsPerCity: Math.round(totalEventsCollected / totalCitiesProcessed)
      },
      results,
      message: `Successfully populated events for ${totalCitiesProcessed} cities across ${regionsToProcess.length} regions`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Global event population error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});