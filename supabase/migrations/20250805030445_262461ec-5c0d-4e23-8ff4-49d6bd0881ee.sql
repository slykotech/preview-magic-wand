-- Phase 1: Update database schema for comprehensive event system

-- Add new columns to events table for better location and metadata support
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS venue_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ticket_url TEXT,
ADD COLUMN IF NOT EXISTS api_source_id UUID,
ADD COLUMN IF NOT EXISTS external_event_id TEXT,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update event_api_sources table for better tracking
ALTER TABLE public.event_api_sources 
ADD COLUMN IF NOT EXISTS api_key_name TEXT,
ADD COLUMN IF NOT EXISTS base_url TEXT,
ADD COLUMN IF NOT EXISTS regions_covered JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS last_error_message TEXT,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP WITH TIME ZONE;

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS public.api_usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_source_id UUID REFERENCES public.event_api_sources(id),
  endpoint TEXT NOT NULL,
  requests_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_request_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create events cache table for location-based caching
CREATE TABLE IF NOT EXISTS public.events_regional_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT NOT NULL,
  region TEXT,
  city TEXT,
  cache_key TEXT NOT NULL UNIQUE,
  last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  next_scrape_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '4 hours'),
  event_count INTEGER DEFAULT 0,
  scraping_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event deduplication table
CREATE TABLE IF NOT EXISTS public.event_duplicates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_event_id UUID REFERENCES public.events(id),
  duplicate_event_id UUID REFERENCES public.events(id),
  similarity_score DECIMAL(3,2),
  detection_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert API sources for different platforms
INSERT INTO public.event_api_sources (platform_name, api_type, is_active, daily_quota, monthly_quota, cost_per_request, api_key_name, base_url, regions_covered) VALUES
('ticketmaster', 'discovery_api', true, 5000, 150000, 0.001, 'TICKETMASTER_API_KEY', 'https://app.ticketmaster.com/discovery/v2', '["US", "CA", "UK", "IE", "AU", "NZ", "MX"]'),
('eventbrite', 'public_api', true, 1000, 30000, 0.0, 'EVENTBRITE_API_KEY', 'https://www.eventbriteapi.com/v3', '["US", "UK", "AU", "CA", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH", "IE", "NZ", "AR", "BR", "MX"]'),
('meetup', 'graphql_api', true, 200, 6000, 0.0, 'MEETUP_API_KEY', 'https://api.meetup.com/gql', '["US", "UK", "AU", "CA", "DE", "FR", "ES", "IT", "NL", "JP", "IN"]'),
('googlevenues', 'places_api', true, 100, 3000, 0.017, 'GOOGLE_PLACES_API_KEY', 'https://maps.googleapis.com/maps/api/place', '["US", "UK", "AU", "CA", "IN", "DE", "FR", "ES", "IT", "NL", "BR", "MX", "JP"]'),
('seatgeek', 'events_api', true, 10000, 300000, 0.0, 'SEATGEEK_CLIENT_ID', 'https://api.seatgeek.com/2', '["US", "CA"]'),
('bookmyshow', 'web_scraping', false, 50, 1500, 0.0, null, 'https://in.bookmyshow.com', '["IN"]')
ON CONFLICT (platform_name) DO UPDATE SET
  api_type = EXCLUDED.api_type,
  daily_quota = EXCLUDED.daily_quota,
  monthly_quota = EXCLUDED.monthly_quota,
  cost_per_request = EXCLUDED.cost_per_request,
  api_key_name = EXCLUDED.api_key_name,
  base_url = EXCLUDED.base_url,
  regions_covered = EXCLUDED.regions_covered;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_location ON public.events(country, region, city);
CREATE INDEX IF NOT EXISTS idx_events_date_location ON public.events(event_date, latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_external_id ON public.events(external_event_id, api_source_id);
CREATE INDEX IF NOT EXISTS idx_events_cache_key ON public.events_regional_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_events_next_scrape ON public.events_regional_cache(next_scrape_at);

-- Create trigger for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_usage_tracking_updated_at
  BEFORE UPDATE ON public.api_usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate cache key
CREATE OR REPLACE FUNCTION public.generate_cache_key(p_country TEXT, p_region TEXT DEFAULT NULL, p_city TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(CONCAT(
    COALESCE(p_country, 'unknown'),
    '_',
    COALESCE(p_region, 'all'),
    '_',
    COALESCE(p_city, 'all')
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to check if region needs scraping
CREATE OR REPLACE FUNCTION public.should_scrape_region(p_country TEXT, p_region TEXT DEFAULT NULL, p_city TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  cache_record public.events_regional_cache%ROWTYPE;
  cache_key TEXT;
BEGIN
  cache_key := public.generate_cache_key(p_country, p_region, p_city);
  
  SELECT * INTO cache_record
  FROM public.events_regional_cache
  WHERE cache_key = cache_key;
  
  IF NOT FOUND THEN
    -- No cache record, needs scraping
    INSERT INTO public.events_regional_cache (country, region, city, cache_key)
    VALUES (p_country, p_region, p_city, cache_key);
    RETURN TRUE;
  END IF;
  
  -- Check if next_scrape_at has passed
  RETURN (cache_record.next_scrape_at <= now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS for new tables
ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_regional_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_duplicates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "API usage tracking viewable by authenticated users"
ON public.api_usage_tracking FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Events cache viewable by authenticated users"
ON public.events_regional_cache FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Event duplicates viewable by authenticated users"
ON public.event_duplicates FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage API usage tracking"
ON public.api_usage_tracking FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "System can manage events cache"
ON public.events_regional_cache FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "System can manage event duplicates"
ON public.event_duplicates FOR ALL
USING (auth.role() = 'service_role');