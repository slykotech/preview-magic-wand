import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.29.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Phase 1: Rate limiting and retry configuration
const RETRY_DELAYS = [5000, 15000, 45000]; // Exponential backoff: 5s, 15s, 45s
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const MAX_DAILY_REQUESTS = 100; // API quota limit

interface EventData {
  title: string;
  date?: string;
  location?: string;
  price?: string;
  description?: string;
  category?: string;
  url?: string;
  source?: string;
  platform?: string;
}

interface PlatformConfig {
  name: string;
  urlTemplate: string;
  method: 'crawl' | 'search';
  formatCity: (city: string) => string;
  extractionPrompt?: string;
  priority: number; // 1 = high, 3 = low
  lastSuccess?: number;
  failureCount: number;
  enabled: boolean;
}

interface ScrapingJobState {
  lastScrapeTime: Record<string, number>;
  failureCount: Record<string, number>;
  requestCount: number;
  dailyReset: number;
}

// Global state for rate limiting and failure tracking
const jobState: ScrapingJobState = {
  lastScrapeTime: {},
  failureCount: {},
  requestCount: 0,
  dailyReset: Date.now()
};

// Phase 1: Exponential backoff retry mechanism
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries = MAX_RETRIES
): Promise<T | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      console.log(`✅ ${context} succeeded on attempt ${attempt + 1}`);
      return result;
    } catch (error) {
      console.error(`❌ ${context} failed on attempt ${attempt + 1}:`, error);
      
      if (attempt === maxRetries) {
        console.error(`💥 ${context} failed after ${maxRetries + 1} attempts`);
        return null;
      }
      
      const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
      console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 2}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
}

// Phase 1: API key validation and quota checking
function validateApiAccess(): { valid: boolean; error?: string } {
  const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlApiKey) {
    return { 
      valid: false, 
      error: 'FIRECRAWL_API_KEY not configured. Please add it to Edge Function secrets.' 
    };
  }
  
  // Reset daily counter if needed
  const now = Date.now();
  if (now - jobState.dailyReset > 24 * 60 * 60 * 1000) {
    jobState.requestCount = 0;
    jobState.dailyReset = now;
    console.log('🔄 Daily API quota reset');
  }
  
  // Check daily quota
  if (jobState.requestCount >= MAX_DAILY_REQUESTS) {
    return { 
      valid: false, 
      error: `Daily API quota exceeded (${MAX_DAILY_REQUESTS} requests). Try again tomorrow.` 
    };
  }
  
  return { valid: true };
}

// Phase 3: Smart caching and rate limiting
function canScrapeUrl(url: string, platform: string): boolean {
  const now = Date.now();
  const lastScrape = jobState.lastScrapeTime[url] || 0;
  const failures = jobState.failureCount[url] || 0;
  
  // Phase 3: Intelligent caching - don't scrape same URL within 6 hours
  if (now - lastScrape < CACHE_DURATION) {
    console.log(`🏃‍♂️ Skipping ${platform} - cached (last scraped ${Math.round((now - lastScrape) / (60 * 1000))} minutes ago)`);
    return false;
  }
  
  // Phase 3: Deprioritize failing platforms
  if (failures >= 5) {
    const backoffTime = Math.min(failures * 30000, 300000); // Max 5 minutes
    if (now - lastScrape < backoffTime) {
      console.log(`⏳ Skipping ${platform} due to excessive failures (${failures})`);
      return false;
    }
  }
  
  // Basic rate limiting
  if (now - lastScrape < RATE_LIMIT_DELAY) {
    return false;
  }
  
  return true;
}

function markScrapeAttempt(url: string, success: boolean) {
  const now = Date.now();
  jobState.lastScrapeTime[url] = now;
  if (success) {
    jobState.failureCount[url] = 0; // Reset on success
  } else {
    jobState.failureCount[url] = (jobState.failureCount[url] || 0) + 1;
  }
  jobState.requestCount++;
}

// Phase 2: Enhanced platform configurations with priorities
function getPlatformConfigs(): PlatformConfig[] {
  return [
    {
      name: 'BookMyShow',
      urlTemplate: 'https://in.bookmyshow.com/explore/home/{city}',
      method: 'crawl',
      formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
      extractionPrompt: 'Extract BookMyShow events with focus on movies, shows, concerts, and entertainment events.',
      priority: 1, // High priority - reliable platform
      failureCount: jobState.failureCount['bookmyshow'] || 0,
      enabled: true
    },
    {
      name: 'Paytm Insider',
      urlTemplate: 'https://insider.in/all-events-in-{city}',
      method: 'crawl',
      formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
      extractionPrompt: 'Extract Paytm Insider events focusing on live events, workshops, and experiences.',
      priority: 1,
      failureCount: jobState.failureCount['paytm'] || 0,
      enabled: true
    },
    {
      name: 'EventsHigh',
      urlTemplate: 'https://eventshigh.com/{city}',
      method: 'crawl',
      formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
      priority: 2,
      failureCount: jobState.failureCount['eventshigh'] || 0,
      enabled: true
    },
    {
      name: 'Townscript',
      urlTemplate: 'https://www.townscript.com/in/{city}',
      method: 'crawl',
      formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
      priority: 2,
      failureCount: jobState.failureCount['townscript'] || 0,
      enabled: true
    },
    {
      name: 'Eventbrite',
      urlTemplate: 'https://www.eventbrite.com/d/{city}/events/',
      method: 'crawl',
      formatCity: (c: string) => c.toLowerCase().replace(/\s+/g, '-'),
      priority: 3, // Lower priority due to anti-bot measures
      failureCount: jobState.failureCount['eventbrite'] || 0,
      enabled: jobState.failureCount['eventbrite'] < 10 // Disable if too many failures
    }
    // Removed problematic platforms (Meetup, AllEvents) temporarily
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting enhanced event scraping...');
    
    const { urls, city = 'mumbai', country = 'india' } = await req.json()
    
    // Phase 1: Validate API access and quota
    const accessCheck = validateApiAccess();
    if (!accessCheck.valid) {
      console.error('❌ API access validation failed:', accessCheck.error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: accessCheck.error,
          events: [],
          count: 0
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Firecrawl client with error handling
    let firecrawl: FirecrawlApp;
    try {
      const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')!;
      firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
      console.log('✅ Firecrawl client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firecrawl client:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to initialize Firecrawl client',
          events: [],
          count: 0
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Phase 3: Get prioritized platforms and filter by availability
    const platforms = getPlatformConfigs()
      .filter(platform => platform.enabled)
      .sort((a, b) => {
        // Sort by priority first, then by failure count
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.failureCount - b.failureCount;
      });

    console.log(`📋 Processing ${platforms.length} enabled platforms`);

    // Generate URLs from platforms if not provided
    const urlsToScrape = urls || platforms.map(platform => {
      const formattedCity = platform.formatCity(city);
      const url = platform.urlTemplate.replace('{city}', formattedCity);
      
      return {
        url,
        platform: platform.name,
        method: platform.method,
        extractionPrompt: platform.extractionPrompt,
        priority: platform.priority
      };
    }).filter(urlConfig => {
      return canScrapeUrl(urlConfig.url, urlConfig.platform);
    });

    console.log(`🎯 Will scrape ${urlsToScrape.length} URLs after filtering`);
    
    if (urlsToScrape.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All platforms are cached or rate-limited. Try again later.',
          events: [],
          count: 0,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapedEvents: EventData[] = []
    let successfulScrapes = 0;
    let failedScrapes = 0;

    // Phase 5: Enhanced monitoring and logging
    for (const urlConfig of urlsToScrape) {
      const url = typeof urlConfig === 'string' ? urlConfig : urlConfig.url;
      const platform = typeof urlConfig === 'string' ? 'Unknown' : urlConfig.platform;
      const method = typeof urlConfig === 'string' ? 'crawl' : urlConfig.method;
      const customPrompt = typeof urlConfig === 'string' ? null : urlConfig.extractionPrompt;
      
      console.log(`\n🔍 [${platform}] Starting scrape: ${url}`);
      console.log(`📊 Current stats - Success: ${successfulScrapes}, Failed: ${failedScrapes}`);
      
      const scrapeOperation = async () => {
        const basePrompt = `Extract event information from this ${platform} page. For each event found, extract:
          - title: Event name/title
          - date: Event date and time (format as readable string like "Dec 15, 2024 8:00 PM")
          - location: Venue name and full address
          - price: Ticket price (include currency) or "Free" if free
          - description: Brief event description (max 200 chars)
          - category: Event category (music, sports, arts, comedy, food, technology, etc.)
          - url: Direct link to event page
          
          ${customPrompt || ''}
          
          Return as a JSON array of events. If no events found, return empty array.
          Example: [{"title": "Concert Name", "date": "Dec 15, 2024 8:00 PM", "location": "Venue Name, Full Address", "price": "₹500", "description": "Description", "category": "music", "url": "https://..."}]`;

        return await firecrawl.scrapeUrl(url, {
          formats: ['markdown'],
          extract: {
            schema: {
              type: "object",
              properties: {
                events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      date: { type: "string" },
                      location: { type: "string" },
                      price: { type: "string" },
                      description: { type: "string" },
                      category: { type: "string" },
                      url: { type: "string" }
                    }
                  }
                }
              }
            },
            prompt: basePrompt
          }
        });
      };

      // Phase 1: Use retry mechanism with exponential backoff
      const scrapeResponse = await retryWithBackoff(
        scrapeOperation, 
        `Scraping ${platform}`
      );

      if (scrapeResponse && scrapeResponse.success && scrapeResponse.data) {
        markScrapeAttempt(url, true);
        successfulScrapes++;
        
        let extractedEvents = []
        
        // Handle different response formats from new API
        if (scrapeResponse.data.extract) {
          extractedEvents = scrapeResponse.data.extract.events || [];
        } else if (typeof scrapeResponse.data === 'string') {
          try {
            extractedEvents = JSON.parse(scrapeResponse.data)
          } catch {
            extractedEvents = []
          }
        } else if (Array.isArray(scrapeResponse.data)) {
          extractedEvents = scrapeResponse.data
        } else if (scrapeResponse.data.llm_extraction) {
          try {
            extractedEvents = JSON.parse(scrapeResponse.data.llm_extraction)
          } catch {
            extractedEvents = []
          }
        }

        // Validate and clean events
        if (Array.isArray(extractedEvents)) {
          const validEvents = extractedEvents.filter((event: any) => 
            event && typeof event === 'object' && event.title
          );
          
          console.log(`✅ [${platform}] Extracted ${validEvents.length} valid events`);
          
          validEvents.forEach((event: any) => {
            scrapedEvents.push({
              title: event.title,
              date: event.date || undefined,
              location: event.location || undefined,
              price: event.price || undefined,
              description: event.description || undefined,
              category: event.category || undefined,
              url: event.url || url,
              source: platform,
              platform: platform
            })
          });
        }
      } else {
        markScrapeAttempt(url, false);
        failedScrapes++;
        console.error(`❌ [${platform}] Scraping failed after retries`);
      }
      
      // Rate limiting delay between requests
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }

    console.log(`\n📈 Final Results: ${successfulScrapes} successful, ${failedScrapes} failed scrapes`);
    console.log(`🎉 Total events extracted: ${scrapedEvents.length}`);

    // Store events in Supabase if any were found
    if (scrapedEvents.length > 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Convert to database format
      const eventsToStore = scrapedEvents.map(event => ({
        title: event.title,
        description: event.description || '',
        start_date: event.date ? new Date(event.date).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location_name: event.location || `${city}, ${country}`,
        price: event.price || 'Free',
        category: event.category || 'general',
        source: event.platform || event.source || 'firecrawl_enhanced',
        external_id: `${event.platform || 'firecrawl'}_${city}_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        website_url: event.url,
        city_name: city,
        latitude: null,
        longitude: null,
        ai_generated: false,
        created_at: new Date().toISOString()
      }))

      // Insert events, handling duplicates
      const { error: insertError } = await supabase
        .from('events')
        .upsert(eventsToStore, { 
          onConflict: 'external_id',
          ignoreDuplicates: true 
        })

      if (insertError) {
        console.error('💥 Error storing events:', insertError)
      } else {
        console.log(`💾 Stored ${eventsToStore.length} events in database`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        events: scrapedEvents,
        count: scrapedEvents.length,
        message: `Successfully scraped ${scrapedEvents.length} events from ${successfulScrapes} platforms`,
        stats: {
          successful_platforms: successfulScrapes,
          failed_platforms: failedScrapes,
          total_platforms: urlsToScrape.length,
          api_requests_used: jobState.requestCount,
          api_requests_remaining: MAX_DAILY_REQUESTS - jobState.requestCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
    
  } catch (error) {
    console.error('💥 Critical error in firecrawl-scraper:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: `Critical error: ${error.message}`,
        events: [],
        count: 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})