import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { 
  UnifiedEvent, 
  EVENT_SOURCES, 
  generateLocationBasedEvents 
} from './event-sources.ts';
import { fetchGoogleEvents } from './google-events.ts';
import { 
  fetchBookMyShowEvents, 
  fetchPaytmInsiderEvents, 
  fetchDistrictEvents 
} from './scraper-events.ts';
import { 
  getCacheKey, 
  getFromCache, 
  setCache, 
  isRateLimited, 
  cleanupCache,
  getCacheStats
} from './cache-manager.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Usage tracking
const usageStats = {
  google: 0,
  scraping: 0,
  total: 0
};

function updateUsageStats(source: string) {
  if (source in usageStats) {
    (usageStats as any)[source]++;
    usageStats.total++;
  }
  console.log(`API usage stats:`, usageStats);
}

// Enhanced cost tracking function
async function logApiUsage(userId: string | null, apiSource: string, endpoint: string, success: boolean, responseSize: number, executionTime: number, errorMessage?: string) {
  if (!userId) return;
  
  try {
    // Get cost configuration for this API source
    const { data: costConfig } = await supabase
      .from('api_cost_config')
      .select('cost_per_request')
      .eq('api_source', apiSource)
      .single();
    
    const costEstimate = costConfig?.cost_per_request || 0;
    
    // Log the API usage
    await supabase.from('api_usage_logs').insert({
      user_id: userId,
      api_source: apiSource,
      endpoint: endpoint,
      cost_estimate: costEstimate,
      request_params: {
        timestamp: new Date().toISOString(),
        cached: false
      },
      response_size: responseSize,
      execution_time_ms: executionTime,
      success: success,
      error_message: errorMessage
    });
    
    // Update user quota usage
    if (success) {
      await supabase.rpc('update_user_quota_usage', {
        p_user_id: userId,
        p_cost_increase: costEstimate
      });
    }
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}

// Database connection
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radius = 25, size = 20, keyword = '', locationName = '' } = await req.json();
    
    // Get user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }
    
    // Extract user ID from auth header
    const token = authHeader.replace('Bearer ', '');
    let userId = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
    } catch (e) {
      console.log('Could not extract user ID from token, proceeding without user tracking');
    }
    
    // Check user quota if user is authenticated
    let quotaCheck = { can_proceed: true, daily_remaining: 10, monthly_cost_remaining: 5.0 };
    if (userId) {
      try {
        const { data: quotaData, error: quotaError } = await supabase.rpc('check_user_quota', { 
          p_user_id: userId, 
          p_estimated_cost: 0.05 // Estimated cost for this request
        });
        
        if (quotaError) {
          console.error('Quota check error:', quotaError);
        } else {
          quotaCheck = quotaData;
        }
      } catch (error) {
        console.error('Error checking quota:', error);
      }
    }
    
    // If quota exceeded, return error
    if (!quotaCheck.can_proceed) {
      return new Response(JSON.stringify({
        error: 'API quota exceeded',
        details: {
          daily_remaining: quotaCheck.daily_remaining,
          monthly_cost_remaining: quotaCheck.monthly_cost_remaining,
          daily_limit: quotaCheck.daily_limit,
          monthly_limit: quotaCheck.monthly_limit
        }
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check cache first
    const cacheKey = getCacheKey('events', latitude || 0, longitude || 0, radius, size, keyword);
    const cached = getFromCache<any>(cacheKey);
    
    if (cached) {
      console.log('Returning cached events');
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let finalLatitude = latitude;
    let finalLongitude = longitude;
    let resolvedLocation = locationName || '';
    
    // Fast geocoding with cache
    if (locationName && (!latitude || !longitude)) {
      const geocodeKey = getCacheKey('geocode', undefined, undefined, undefined, undefined, locationName);
      const cachedGeocode = getFromCache<{lat: number; lng: number; address: string}>(geocodeKey);
      
      if (cachedGeocode) {
        finalLatitude = cachedGeocode.lat;
        finalLongitude = cachedGeocode.lng;
        resolvedLocation = cachedGeocode.address;
        console.log(`Using cached geocoding for: ${locationName}`);
      } else {
        const googleKey = Deno.env.get('GOOGLE_EVENTS_API_KEY');
        
        if (!googleKey || isRateLimited('geocoding')) {
          console.log('Geocoding unavailable, using location-based fallback');
          // Return location-based events without coordinates
          const locationEvents = generateLocationBasedEvents(locationName, size);
          setCache(cacheKey, { events: locationEvents, total: locationEvents.length }, 'FALLBACK');
          
          return new Response(JSON.stringify({
            events: locationEvents,
            total: locationEvents.length,
            cached: false,
            quota: quotaCheck,
            stats: getCacheStats()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        try {
          console.log(`Quick geocoding for: ${locationName}`);
          
          const geocodeResponse = await Promise.race([
            fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${googleKey}`),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Geocoding timeout')), 3000))
          ]);
          
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            
            if (geocodeData.status === 'OK' && geocodeData.results?.[0]) {
              const result = geocodeData.results[0];
              finalLatitude = result.geometry.location.lat;
              finalLongitude = result.geometry.location.lng;
              resolvedLocation = result.formatted_address;
              
              // Cache the geocoding result
              setCache(geocodeKey, {
                lat: finalLatitude,
                lng: finalLongitude,
                address: resolvedLocation
              }, 'GEOCODING');
              
              console.log(`Geocoded "${locationName}" to: ${finalLatitude}, ${finalLongitude}`);
            } else {
              throw new Error('Geocoding failed');
            }
          } else {
            throw new Error('Geocoding request failed');
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          // Fallback to location-based events
          const locationEvents = generateLocationBasedEvents(locationName, size);
          setCache(cacheKey, { events: locationEvents, total: locationEvents.length }, 'FALLBACK');
          
          return new Response(JSON.stringify({
            events: locationEvents,
            total: locationEvents.length,
            cached: false,
            quota: quotaCheck,
            stats: getCacheStats()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }
    
    if (!finalLatitude || !finalLongitude) {
      throw new Error('Location coordinates are required');
    }

    console.log(`Fetching events for coordinates: ${finalLatitude}, ${finalLongitude}`);

    const allEvents: UnifiedEvent[] = [];
    const eventPromises: Promise<UnifiedEvent[]>[] = [];

    // Run all event fetching in parallel for speed
    console.log('Starting parallel event fetching...');

    // Google Places (highest priority, fastest)
    const googleKey = Deno.env.get('GOOGLE_EVENTS_API_KEY');
    if (googleKey && finalLatitude && finalLongitude && !isRateLimited('google')) {
      eventPromises.push(
        fetchGoogleEvents(googleKey, finalLatitude, finalLongitude, radius)
          .then(events => {
            updateUsageStats('google');
            console.log(`Fetched ${events.length} events from Google Places`);
            return events;
          })
          .catch(error => {
            console.error('Google Places error:', error);
            return [];
          })
      );
    }

    // Scraping sources (run in parallel with timeout)
    if (!isRateLimited('scraping')) {
      const scrapingPromises = [
        fetchBookMyShowEvents(resolvedLocation).catch(e => { console.error('BookMyShow error:', e); return []; }),
        fetchPaytmInsiderEvents(resolvedLocation).catch(e => { console.error('Paytm Insider error:', e); return []; }),
        fetchDistrictEvents(resolvedLocation).catch(e => { console.error('District error:', e); return []; })
      ];

      // Add scraping with timeout
      eventPromises.push(
        Promise.race([
          Promise.all(scrapingPromises).then(results => {
            updateUsageStats('scraping');
            const combined = results.flat();
            console.log(`Scraped ${combined.length} total events from all sources`);
            return combined;
          }),
          new Promise<UnifiedEvent[]>(resolve => 
            setTimeout(() => {
              console.log('Scraping timeout, proceeding with available data');
              resolve([]);
            }, 10000) // 10 second timeout for all scraping
          )
        ])
      );
    }

    // Wait for all promises with timeout
    try {
      const results = await Promise.allSettled(eventPromises);
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          allEvents.push(...result.value);
        }
      });
    } catch (error) {
      console.error('Error in parallel event fetching:', error);
    }

    // Add location-based fallback events if needed
    const currentEventsCount = allEvents.length;
    console.log(`Current events count: ${currentEventsCount}`);

    if (currentEventsCount < Math.floor(size * 0.5)) {
      console.log(`Adding location-based events to reach target count`);
      const neededEvents = size - currentEventsCount;
      const locationEvents = generateLocationBasedEvents(resolvedLocation || 'Your Area', neededEvents);
      allEvents.push(...locationEvents);
      console.log(`Added ${locationEvents.length} location-based events`);
    }

    // Remove duplicates and sort by date
    const uniqueEvents = removeDuplicateEvents(allEvents);
    const sortedEvents = uniqueEvents.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    console.log(`Processed ${sortedEvents.length} unique couple-friendly events from ${allEvents.length} total events`);

    // Get updated quota info if user is authenticated
    let quotaInfo = null;
    if (userId) {
      try {
        const { data: updatedQuotaData } = await supabase.rpc('check_user_quota', { 
          p_user_id: userId, 
          p_estimated_cost: 0
        });
        quotaInfo = updatedQuotaData;
      } catch (error) {
        console.error('Error getting updated quota:', error);
      }
    }

    const responseData = {
      events: sortedEvents.slice(0, size),
      total: sortedEvents.length,
      cached: false,
      quota: quotaInfo,
      location: resolvedLocation || locationName,
      coordinates: { lat: finalLatitude, lng: finalLongitude },
      stats: getCacheStats()
    };

    setCache(cacheKey, responseData);
    console.log(`Cached events for key: ${cacheKey}`);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-events function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      events: [], // Return empty array as fallback
      totalEvents: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function removeDuplicateEvents(events: UnifiedEvent[]): UnifiedEvent[] {
  const seen = new Set<string>();
  const filtered: UnifiedEvent[] = [];
  
  for (const event of events) {
    // More sophisticated deduplication
    const normalizedTitle = event.title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const key = `${normalizedTitle}_${event.category}_${event.date}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      filtered.push(event);
    }
  }
  
  console.log(`Removed ${events.length - filtered.length} duplicate events`);
  return filtered;
}