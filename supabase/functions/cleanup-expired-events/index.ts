import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting cleanup of expired events...');

    // Call the cleanup function
    const { data: deletedCount, error } = await supabaseClient
      .rpc('cleanup_expired_events');

    if (error) {
      throw error;
    }

    console.log(`Cleanup completed. Deleted ${deletedCount} expired events.`);

    // Also clean up old cache entries and reset quotas
    const { error: cacheError } = await supabaseClient
      .from('location_event_cache')
      .delete()
      .lt('last_fetched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (cacheError) {
      console.error('Cache cleanup error:', cacheError);
    }

    // Reset daily quotas if needed (for new day)
    const { error: quotaError } = await supabaseClient
      .from('event_api_sources')
      .update({ current_daily_usage: 0 })
      .lt('last_used_at', new Date().toISOString().split('T')[0]);

    if (quotaError) {
      console.error('Quota reset error:', quotaError);
    }

    return new Response(JSON.stringify({
      success: true,
      deletedEvents: deletedCount,
      timestamp: new Date().toISOString(),
      message: `Successfully cleaned up ${deletedCount} expired events`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});