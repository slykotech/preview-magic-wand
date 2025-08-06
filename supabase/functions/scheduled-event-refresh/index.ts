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
    console.log('Starting intelligent scheduled event refresh...');

    // Use new intelligent function to get popular cities that need refresh
    const { data: priorityCities, error: priorityError } = await supabase.rpc('get_popular_cities_for_refresh', {
      p_limit: 15
    });

    if (priorityError) {
      console.error('Error getting priority cities:', priorityError);
      throw priorityError;
    }

    console.log(`Found ${priorityCities?.length || 0} cities to evaluate for refresh`);

    const results = [];
    let processed = 0;
    const maxCitiesToProcess = 10; // Limit to avoid timeouts

    // Process cities that need refresh first
    const citiesToRefresh = priorityCities?.filter(city => city.needs_refresh) || [];
    const citiesToMaintain = priorityCities?.filter(city => !city.needs_refresh) || [];

    console.log(`${citiesToRefresh.length} cities need refresh, ${citiesToMaintain.length} are well-maintained`);

    // Process high-priority cities first (those that need refresh)
    for (const cityData of citiesToRefresh.slice(0, maxCitiesToProcess)) {
      if (processed >= maxCitiesToProcess) break;
      
      try {
        console.log(`[PRIORITY] Processing ${cityData.city_name} - needs refresh`);

        // Double-check if city still needs refresh
        const { data: stillNeedsRefresh, error: checkError } = await supabase.rpc('city_needs_event_refresh', {
          p_city_name: cityData.city_name,
          p_min_events: 5,
          p_hours_threshold: 6 // More frequent refresh for scheduled job
        });

        if (checkError) {
          console.error(`Error checking refresh status for ${cityData.city_name}:`, checkError);
          continue;
        }

        if (!stillNeedsRefresh) {
          console.log(`${cityData.city_name} no longer needs refresh, skipping...`);
          results.push({
            city: cityData.city_name,
            status: 'skipped',
            reason: 'No longer needs refresh'
          });
          continue;
        }

        // Get coordinates for this city (try from cities table first)
        const { data: cityInfo, error: cityError } = await supabase
          .from('cities')
          .select('latitude, longitude')
          .ilike('name', `%${cityData.city_name}%`)
          .limit(1)
          .maybeSingle();

        let latitude = cityInfo?.latitude;
        let longitude = cityInfo?.longitude;

        // Fallback: use existing events to get approximate coordinates
        if (!latitude || !longitude) {
          const { data: existingEvent, error: eventError } = await supabase
            .from('events')
            .select('latitude, longitude')
            .ilike('city_name', `%${cityData.city_name}%`)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .limit(1)
            .maybeSingle();

          if (existingEvent) {
            latitude = existingEvent.latitude;
            longitude = existingEvent.longitude;
          }
        }

        // Skip if we can't find coordinates
        if (!latitude || !longitude) {
          console.log(`No coordinates found for ${cityData.city_name}, skipping...`);
          results.push({
            city: cityData.city_name,
            status: 'skipped',
            reason: 'No coordinates available'
          });
          continue;
        }

        // Generate fresh events for this city
        const { data: generateResponse, error: generateError } = await supabase.functions.invoke('generate-ai-events', {
          body: {
            cityName: cityData.city_name,
            latitude: latitude,
            longitude: longitude,
            forceRefresh: false
          }
        });

        if (generateError) {
          console.error(`Error generating events for ${cityData.city_name}:`, generateError);
          results.push({
            city: cityData.city_name,
            status: 'error',
            error: generateError.message
          });
          continue;
        }

        console.log(`Successfully processed ${cityData.city_name}: ${generateResponse?.events?.length || 0} events`);
        results.push({
          city: cityData.city_name,
          status: 'success',
          eventsGenerated: generateResponse?.events?.length || 0,
          source: generateResponse?.source || 'unknown',
          priority: 'high'
        });

        processed++;

        // Add delay between cities to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (cityError) {
        console.error(`Error processing priority city ${cityData.city_name}:`, cityError);
        results.push({
          city: cityData.city_name,
          status: 'error',
          error: cityError.message
        });
      }
    }

    // Process some well-maintained cities for background refresh (lower priority)
    const remainingSlots = maxCitiesToProcess - processed;
    if (remainingSlots > 0) {
      for (const cityData of citiesToMaintain.slice(0, remainingSlots)) {
        try {
          console.log(`[MAINTENANCE] Background refresh for ${cityData.city_name}`);
          
          // Only refresh if events are getting stale (older than 12 hours)
          if (cityData.last_ai_generation && 
              new Date(cityData.last_ai_generation).getTime() > Date.now() - (12 * 60 * 60 * 1000)) {
            results.push({
              city: cityData.city_name,
              status: 'skipped',
              reason: 'Events still fresh'
            });
            continue;
          }

          // Get coordinates and generate events (same logic as above)
          const { data: cityInfo } = await supabase
            .from('cities')
            .select('latitude, longitude')
            .ilike('name', `%${cityData.city_name}%`)
            .limit(1)
            .maybeSingle();

          if (!cityInfo?.latitude || !cityInfo?.longitude) {
            results.push({
              city: cityData.city_name,
              status: 'skipped',
              reason: 'No coordinates available'
            });
            continue;
          }

          const { data: generateResponse, error: generateError } = await supabase.functions.invoke('generate-ai-events', {
            body: {
              cityName: cityData.city_name,
              latitude: cityInfo.latitude,
              longitude: cityInfo.longitude,
              forceRefresh: false
            }
          });

          if (!generateError && generateResponse?.success) {
            results.push({
              city: cityData.city_name,
              status: 'success',
              eventsGenerated: generateResponse?.events?.length || 0,
              source: generateResponse?.source || 'unknown',
              priority: 'background'
            });
          } else {
            results.push({
              city: cityData.city_name,
              status: 'error',
              error: generateError?.message || 'Background refresh failed'
            });
          }

          processed++;
          await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (cityError) {
          console.error(`Error in background refresh for ${cityData.city_name}:`, cityError);
          results.push({
            city: cityData.city_name,
            status: 'error',
            error: cityError.message
          });
        }
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
      totalCitiesEvaluated: priorityCities?.length || 0,
      totalCitiesProcessed: processed,
      citiesToRefresh: citiesToRefresh.length,
      successful: results.filter(r => r.status === 'success').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      totalEventsGenerated: results
        .filter(r => r.status === 'success')
        .reduce((sum, r) => sum + (r.eventsGenerated || 0), 0),
      priorityRefreshes: results.filter(r => r.priority === 'high').length,
      backgroundRefreshes: results.filter(r => r.priority === 'background').length
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