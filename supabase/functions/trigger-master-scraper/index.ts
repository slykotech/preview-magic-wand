import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

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

    console.log('Manually triggering event scraper master for India...');

    // Call the event-scraper-master for India cities including Hyderabad
    const { data, error } = await supabaseClient.functions.invoke('event-scraper-master', {
      body: { 
        country: 'IN',
        region: 'India', 
        city: 'Hyderabad',
        mode: 'single'
      }
    });

    if (error) {
      console.error('Error calling event scraper master:', error);
      throw error;
    }

    console.log('Event scraper master completed for India:', data);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Event scraper master triggered successfully for India/Hyderabad',
      data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trigger-master-scraper function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});