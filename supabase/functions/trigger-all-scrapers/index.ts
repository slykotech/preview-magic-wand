import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Indian cities to scrape
const INDIA_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune'];

async function triggerAllScrapersForIndia() {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log('Starting comprehensive scraping for all India cities...');
  
  const results = [];
  let totalEventsFound = 0;

  for (const city of INDIA_CITIES) {
    try {
      console.log(`\n🏙️ Processing ${city}...`);
      
      // Trigger event-scraper-master for this city
      // This will call: scrape-india-events, scrape-ticketmaster, scrape-eventbrite, scrape-googleplaces
      const { data, error } = await supabaseClient.functions.invoke('event-scraper-master', {
        body: { 
          country: 'IN',
          region: 'India', 
          city: city,
          mode: 'single'
        }
      });

      if (error) {
        console.error(`❌ Error scraping ${city}:`, error);
        results.push({
          city,
          success: false,
          error: error.message
        });
      } else {
        console.log(`✅ Successfully scraped ${city}:`, data);
        if (data?.totalEventsInserted) {
          totalEventsFound += data.totalEventsInserted;
        }
        results.push({
          city,
          success: true,
          data
        });
      }

      // Delay between cities to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`💥 Exception while scraping ${city}:`, error);
      results.push({
        city,
        success: false,
        error: error.message
      });
    }
  }

  // Final summary
  console.log(`\n📊 SCRAPING COMPLETE:`);
  console.log(`Cities processed: ${INDIA_CITIES.length}`);
  console.log(`Total new events found: ${totalEventsFound}`);
  console.log(`Success rate: ${results.filter(r => r.success).length}/${results.length}`);

  // Log final status to database
  try {
    await supabaseClient
      .from('events_regional_cache')
      .upsert({
        country: 'IN',
        region: 'India',
        city: 'ALL_CITIES',
        cache_key: 'in_india_all_cities',
        event_count: totalEventsFound,
        last_scraped_at: new Date().toISOString(),
        next_scrape_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
        scraping_status: 'completed'
      });
  } catch (logError) {
    console.error('Error logging final status:', logError);
  }

  return {
    success: true,
    totalEventsFound,
    citiesProcessed: INDIA_CITIES.length,
    results
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting comprehensive India event scraping...');
    
    // Use background task for long-running scraping operation
    const backgroundPromise = triggerAllScrapersForIndia();
    
    // Use EdgeRuntime.waitUntil to run the scraping in background
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundPromise);
    }

    // Return immediate response while scraping continues in background
    return new Response(JSON.stringify({ 
      success: true,
      message: '🎯 Comprehensive scraping started for all India cities',
      cities: INDIA_CITIES,
      status: 'scraping_in_progress',
      note: 'Check function logs for progress. Events will appear in database as scraping completes.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error starting comprehensive scraper:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Handle function shutdown gracefully
addEventListener('beforeunload', (ev) => {
  console.log('⚠️ Function shutdown due to:', ev.detail?.reason);
  console.log('💡 Scraping may continue when function restarts');
});