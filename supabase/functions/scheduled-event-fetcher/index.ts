import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting scheduled event fetcher...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all active country configurations
    const { data: countryConfigs, error: configError } = await supabase
      .from('country_event_config')
      .select('*')
      .eq('is_active', true);
    
    if (configError) {
      console.error('❌ Error fetching country configs:', configError);
      throw new Error(`Failed to fetch country configs: ${configError.message}`);
    }
    
    console.log(`📍 Found ${countryConfigs?.length || 0} active countries`);
    
    const fetchResults = [];
    
    // Process each country configuration
    for (const config of countryConfigs || []) {
      console.log(`🌍 Processing ${config.country_name} (${config.country_code})`);
      
      const cities = config.major_cities || [];
      
      // Process cities in batches to avoid overwhelming the system
      for (const city of cities) {
        try {
          console.log(`🏙️ Fetching events for ${city.name}, ${config.country_name}`);
          
          // Create a fetch job record
          const { data: job, error: jobError } = await supabase
            .from('event_fetch_jobs')
            .insert({
              job_type: 'scheduled',
              target_location: city.name,
              city: city.name,
              country_code: config.country_code,
              latitude: city.lat,
              longitude: city.lng,
              status: 'running',
              started_at: new Date().toISOString(),
              sources_used: config.sources_enabled || ['google']
            })
            .select()
            .single();
          
          if (jobError) {
            console.error(`❌ Error creating job for ${city.name}:`, jobError);
            continue;
          }
          
          console.log(`📝 Created job ${job.id} for ${city.name}`);
          
          // Call the fetch-events function
          const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('fetch-events', {
            body: {
              latitude: city.lat,
              longitude: city.lng,
              locationName: city.name,
              radius: 25,
              size: 50
            }
          });
          
          if (fetchError) {
            console.error(`❌ Error fetching events for ${city.name}:`, fetchError);
            
            // Update job status to failed
            await supabase
              .from('event_fetch_jobs')
              .update({
                status: 'failed',
                error_message: fetchError.message,
                completed_at: new Date().toISOString()
              })
              .eq('id', job.id);
              
            fetchResults.push({
              city: city.name,
              country: config.country_name,
              status: 'failed',
              error: fetchError.message,
              events_count: 0
            });
            continue;
          }
          
          const eventsCount = fetchResult?.events?.length || 0;
          console.log(`✅ Fetched ${eventsCount} events for ${city.name}`);
          
          // Update job status to completed
          await supabase
            .from('event_fetch_jobs')
            .update({
              status: 'completed',
              events_fetched: eventsCount,
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          fetchResults.push({
            city: city.name,
            country: config.country_name,
            status: 'success',
            events_count: eventsCount,
            quota_info: fetchResult?.quota || {}
          });
          
          // Add a small delay between cities to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (cityError) {
          console.error(`❌ Error processing ${city.name}:`, cityError);
          fetchResults.push({
            city: city.name,
            country: config.country_name,
            status: 'failed',
            error: cityError.message,
            events_count: 0
          });
        }
      }
      
      // Add delay between countries
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('🎉 Scheduled event fetching completed');
    console.log('📊 Summary:', {
      total_cities: fetchResults.length,
      successful: fetchResults.filter(r => r.status === 'success').length,
      failed: fetchResults.filter(r => r.status === 'failed').length,
      total_events: fetchResults.reduce((sum, r) => sum + (r.events_count || 0), 0)
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scheduled event fetching completed',
        summary: {
          total_cities: fetchResults.length,
          successful: fetchResults.filter(r => r.status === 'success').length,
          failed: fetchResults.filter(r => r.status === 'failed').length,
          total_events: fetchResults.reduce((sum, r) => sum + (r.events_count || 0), 0)
        },
        results: fetchResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('❌ Scheduled event fetcher error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})