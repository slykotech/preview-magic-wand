import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapingResult {
  success: boolean;
  source: string;
  totalFound: number;
  newEventsInserted: number;
  country: string;
  region?: string;
  city?: string;
  error?: string;
}

const TARGET_REGIONS = {
  'IN': {
    name: 'India',
    cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune']
  },
  'US': {
    name: 'United States',
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'Dallas']
  },
  'GB': {
    name: 'United Kingdom',
    cities: ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Leeds', 'Liverpool']
  },
  'AU': {
    name: 'Australia',
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide']
  },
  'FR': {
    name: 'France',
    cities: ['Paris', 'Lyon', 'Marseille']
  },
  'DE': {
    name: 'Germany',
    cities: ['Berlin', 'Munich', 'Hamburg']
  },
  'ES': {
    name: 'Spain',
    cities: ['Madrid', 'Barcelona', 'Valencia']
  },
  'IT': {
    name: 'Italy',
    cities: ['Rome', 'Milan', 'Naples']
  },
  'NL': {
    name: 'Netherlands',
    cities: ['Amsterdam', 'Rotterdam']
  }
};

async function callScrapingFunction(functionName: string, country: string, region?: string, city?: string): Promise<ScrapingResult> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  try {
    console.log(`Calling ${functionName} for ${country}${region ? `, ${region}` : ''}${city ? `, ${city}` : ''}`);
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { country, region, city }
    });
    
    if (error) {
      console.error(`Error calling ${functionName}:`, error);
      return {
        success: false,
        source: functionName,
        totalFound: 0,
        newEventsInserted: 0,
        country,
        region,
        city,
        error: error.message
      };
    }
    
    return data;
  } catch (error) {
    console.error(`Exception calling ${functionName}:`, error);
    return {
      success: false,
      source: functionName,
      totalFound: 0,
      newEventsInserted: 0,
      country,
      region,
      city,
      error: error.message
    };
  }
}

async function shouldScrapeRegion(supabase: any, country: string, region?: string, city?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('should_scrape_region', {
      p_country: country,
      p_region: region,
      p_city: city
    });
    
    if (error) {
      console.error('Error checking scraping schedule:', error);
      return true; // Default to scraping if check fails
    }
    
    return data;
  } catch (error) {
    console.error('Exception checking scraping schedule:', error);
    return true;
  }
}

async function updateScrapingCache(supabase: any, country: string, totalEvents: number, region?: string, city?: string) {
  try {
    const cacheKey = `${country.toLowerCase()}_${(region || 'all').toLowerCase()}_${(city || 'all').toLowerCase()}`;
    const nextScrapeTime = new Date();
    nextScrapeTime.setHours(nextScrapeTime.getHours() + 4); // Next scrape in 4 hours
    
    const { error } = await supabase
      .from('events_regional_cache')
      .upsert({
        country,
        region,
        city,
        cache_key: cacheKey,
        event_count: totalEvents,
        last_scraped_at: new Date().toISOString(),
        next_scrape_at: nextScrapeTime.toISOString(),
        scraping_status: 'completed'
      });
    
    if (error) {
      console.error('Error updating scraping cache:', error);
    }
  } catch (error) {
    console.error('Exception updating scraping cache:', error);
  }
}

async function performRegionalScraping(country: string, region?: string, city?: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  console.log(`Starting regional scraping for ${country}${region ? `, ${region}` : ''}${city ? `, ${city}` : ''}`);
  
  // Check if we should scrape this region now
  const shouldScrape = await shouldScrapeRegion(supabase, country, region, city);
  if (!shouldScrape) {
    console.log(`Skipping ${country}${region ? `, ${region}` : ''}${city ? `, ${city}` : ''} - too recent`);
    return {
      success: true,
      message: 'Skipped - recently scraped',
      country,
      region,
      city
    };
  }
  
  const results: ScrapingResult[] = [];
  let totalEventsFound = 0;
  let totalEventsInserted = 0;
  const startTime = Date.now();
  
  // Call each scraping function with appropriate delays and analytics
  const scrapingFunctions = country === 'IN' 
    ? ['scrape-india-events', 'scrape-ticketmaster', 'scrape-eventbrite', 'scrape-googleplaces']
    : ['scrape-ticketmaster', 'scrape-eventbrite', 'scrape-googleplaces', 'scrape-events-firecrawl'];
  
  for (const functionName of scrapingFunctions) {
    const funcStartTime = Date.now();
    try {
      const result = await callScrapingFunction(functionName, country, region, city);
      results.push(result);
      
      const responseTime = Date.now() - funcStartTime;
      
      // Log analytics for this scraping function
      await logScrapingAnalytics(
        supabase,
        functionName.replace('scrape-', ''),
        country,
        city,
        result.totalFound,
        result.newEventsInserted,
        1, // api_calls_made
        result.success,
        responseTime,
        result.error
      );
      
      if (result.success) {
        totalEventsFound += result.totalFound;
        totalEventsInserted += result.newEventsInserted;
      }
      
      // Delay between API calls to respect rate limits
      const delay = functionName === 'scrape-googleplaces' ? 3000 : 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      const responseTime = Date.now() - funcStartTime;
      console.error(`Error with ${functionName}:`, error);
      
      // Log error analytics
      await logScrapingAnalytics(
        supabase,
        functionName.replace('scrape-', ''),
        country,
        city,
        0,
        0,
        1,
        false,
        responseTime,
        error.message
      );
      
      results.push({
        success: false,
        source: functionName,
        totalFound: 0,
        newEventsInserted: 0,
        country,
        region,
        city,
        error: error.message
      });
    }
  }
  
  // Update scraping cache
  await updateScrapingCache(supabase, country, totalEventsFound, region, city);
  
  const totalTime = Date.now() - startTime;
  console.log(`Completed scraping for ${country}${region ? `, ${region}` : ''}${city ? `, ${city}` : ''}: ${totalEventsInserted} new events from ${totalEventsFound} found in ${totalTime}ms`);
  
  return {
    success: true,
    country,
    region,
    city,
    totalEventsFound,
    totalEventsInserted,
    sources: results,
    totalTime
  };
}

// Helper function to log scraping analytics
async function logScrapingAnalytics(
  supabase: any,
  sourcePlatform: string,
  country: string,
  city?: string,
  eventsScraped: number = 0,
  eventsInserted: number = 0,
  apiCallsMade: number = 1,
  success: boolean = true,
  responseTimeMs: number = 0,
  errorMessage?: string
) {
  try {
    await supabase.rpc('log_scraping_analytics', {
      p_source_platform: sourcePlatform,
      p_country: country,
      p_city: city,
      p_events_scraped: eventsScraped,
      p_events_inserted: eventsInserted,
      p_api_calls_made: apiCallsMade,
      p_success: success,
      p_response_time_ms: responseTimeMs,
      p_error_message: errorMessage
    });
  } catch (error) {
    console.error('Failed to log analytics:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Verify API keys are configured
    const requiredKeys = ['TICKETMASTER_API_KEY', 'EVENTBRITE_API_KEY', 'GOOGLE_PLACES_API_KEY'];
    const missingKeys = requiredKeys.filter(key => !Deno.env.get(key));
    
    if (missingKeys.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: `Missing API keys: ${missingKeys.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await req.json().catch(() => ({}));
    const { country, region, city, mode = 'single' } = body;
    
    if (mode === 'batch') {
      // Batch mode: scrape all target regions
      console.log('Starting batch scraping for all target regions');
      
      const batchResults = [];
      let totalRegionsProcessed = 0;
      let totalEventsInserted = 0;
      
      for (const [countryCode, countryInfo] of Object.entries(TARGET_REGIONS)) {
        for (const cityName of countryInfo.cities.slice(0, 3)) { // Limit to 3 cities per country for now
          try {
            const result = await performRegionalScraping(countryCode, countryInfo.name, cityName);
            batchResults.push(result);
            
            if (result.success && result.totalEventsInserted) {
              totalEventsInserted += result.totalEventsInserted;
            }
            totalRegionsProcessed++;
            
            // Delay between regions to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 5000));
            
          } catch (error) {
            console.error(`Error processing ${countryCode}, ${cityName}:`, error);
            batchResults.push({
              success: false,
              country: countryCode,
              region: countryInfo.name,
              city: cityName,
              error: error.message
            });
          }
        }
        
        // Longer delay between countries
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'batch',
          totalRegionsProcessed,
          totalEventsInserted,
          results: batchResults
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
      
    } else {
      // Single region mode
      if (!country) {
        return new Response(
          JSON.stringify({ error: 'Country is required for single mode' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result = await performRegionalScraping(country, region, city);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
  } catch (error) {
    console.error('Master scraper error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});