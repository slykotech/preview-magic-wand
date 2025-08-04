import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { platform } = await req.json();
    
    if (!platform || !['ios', 'android'].includes(platform)) {
      return new Response(
        JSON.stringify({ error: 'Invalid platform specified' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get API keys from Supabase secrets
    const iosApiKey = Deno.env.get('REVENUECAT_IOS_API_KEY');
    const androidApiKey = Deno.env.get('REVENUECAT_ANDROID_API_KEY');

    if (!iosApiKey || !androidApiKey) {
      console.log('RevenueCat API keys not configured');
      return new Response(
        JSON.stringify({ 
          error: 'RevenueCat API keys not configured',
          configured: false 
        }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const apiKey = platform === 'ios' ? iosApiKey : androidApiKey;

    return new Response(
      JSON.stringify({ 
        apiKey,
        configured: true,
        platform 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-revenuecat-config:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})