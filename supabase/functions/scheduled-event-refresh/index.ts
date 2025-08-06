import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled event refresh...');

    // Get all active cities
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('population', { ascending: false })
      .limit(10); // Process top 10 cities first

    if (citiesError) {
      throw citiesError;
    }

    console.log(`Found ${cities?.length || 0} cities to process`);

    const results = [];

    // Process each city
    for (const city of cities || []) {
      try {
        console.log(`Processing ${city.name}, ${city.state}...`);

        // Check if city needs refresh (no AI events in last 3 hours)
        const { data: recentEvents, error: checkError } = await supabase
          .from('events')
          .select('id')
          .eq('ai_generated', true)
          .eq('city_name', city.name)
          .gte('created_at', new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (checkError) {
          console.error(`Error checking events for ${city.name}:`, checkError);
          continue;
        }

        if (recentEvents && recentEvents.length > 0) {
          console.log(`${city.name} has recent events, skipping...`);
          results.push({
            city: city.name,
            status: 'skipped',
            reason: 'Recent events exist'
          });
          continue;
        }

        // Generate fresh events for this city
        const { data: generateResponse, error: generateError } = await supabase.functions.invoke('generate-ai-events', {
          body: {
            cityName: city.name,
            latitude: city.latitude,
            longitude: city.longitude,
            forceRefresh: false
          }
        });

        if (generateError) {
          console.error(`Error generating events for ${city.name}:`, generateError);
          results.push({
            city: city.name,
            status: 'error',
            error: generateError.message
          });
          continue;
        }

        console.log(`Successfully processed ${city.name}: ${generateResponse?.events?.length || 0} events`);
        results.push({
          city: city.name,
          status: 'success',
          eventsGenerated: generateResponse?.events?.length || 0,
          source: generateResponse?.source || 'unknown'
        });

        // Add small delay between cities to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (cityError) {
        console.error(`Error processing city ${city.name}:`, cityError);
        results.push({
          city: city.name,
          status: 'error',
          error: cityError.message
        });
      }
    }

    // Cleanup old AI events (older than 7 days)
    try {
      console.log('Cleaning up old AI events...');
      const { error: cleanupError } = await supabase.rpc('cleanup_old_ai_events');
      if (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      } else {
        console.log('Cleanup completed successfully');
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    const summary = {
      totalCities: cities?.length || 0,
      successful: results.filter(r => r.status === 'success').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      totalEventsGenerated: results
        .filter(r => r.status === 'success')
        .reduce((sum, r) => sum + (r.eventsGenerated || 0), 0)
    };

    console.log('Scheduled refresh complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in scheduled-event-refresh:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});