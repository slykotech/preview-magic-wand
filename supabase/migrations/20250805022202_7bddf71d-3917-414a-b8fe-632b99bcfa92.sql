-- Create events table with automatic expiration and duplicate detection
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unique_hash TEXT NOT NULL UNIQUE, -- For duplicate detection
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  location_name TEXT NOT NULL,
  location_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  category TEXT DEFAULT 'entertainment',
  price_range TEXT,
  organizer TEXT,
  source_url TEXT,
  source_platform TEXT NOT NULL, -- 'bookmyshow', 'eventbrite', etc.
  image_url TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints to ensure only future events
  CONSTRAINT events_future_only CHECK (event_date >= CURRENT_DATE)
);

-- Create index for efficient queries
CREATE INDEX idx_events_location_date ON public.events(latitude, longitude, event_date);
CREATE INDEX idx_events_category_date ON public.events(category, event_date);
CREATE INDEX idx_events_expires_at ON public.events(expires_at);
CREATE INDEX idx_events_unique_hash ON public.events(unique_hash);

-- Location-based event cache to reduce API calls
CREATE TABLE public.location_event_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_hash TEXT NOT NULL, -- Hash of lat/lng/radius
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  search_radius INTEGER NOT NULL DEFAULT 10, -- km
  last_fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_fetch_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '4 hours'),
  event_count INTEGER DEFAULT 0,
  source_platforms TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(location_hash)
);

-- API source configuration and cost tracking
CREATE TABLE public.event_api_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name TEXT NOT NULL UNIQUE,
  api_type TEXT NOT NULL, -- 'free', 'paid', 'scraping'
  cost_per_request DECIMAL(10, 4) DEFAULT 0,
  daily_quota INTEGER,
  monthly_quota INTEGER,
  current_daily_usage INTEGER DEFAULT 0,
  current_monthly_usage INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 100.00,
  avg_response_time_ms INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5, -- 1-10, higher = preferred
  supported_regions TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User event preferences for personalization
CREATE TABLE public.user_event_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preferred_categories TEXT[] DEFAULT '{}',
  max_distance_km INTEGER DEFAULT 25,
  preferred_price_range TEXT DEFAULT 'any',
  preferred_times TEXT[] DEFAULT '{}', -- 'morning', 'afternoon', 'evening'
  blacklisted_venues TEXT[] DEFAULT '{}',
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Event interaction tracking for intelligence
CREATE TABLE public.user_event_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'viewed', 'saved', 'shared', 'planned'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_event_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_api_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_interactions ENABLE ROW LEVEL SECURITY;

-- Events are publicly viewable but only system can manage
CREATE POLICY "Events are viewable by authenticated users" ON public.events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage events" ON public.events
  FOR ALL USING (auth.role() = 'service_role');

-- Location cache is system managed
CREATE POLICY "System can manage location cache" ON public.location_event_cache
  FOR ALL USING (auth.role() = 'service_role');

-- API sources are read-only for authenticated users
CREATE POLICY "API sources are viewable by authenticated users" ON public.event_api_sources
  FOR SELECT USING (auth.role() = 'authenticated');

-- User preferences are user-specific
CREATE POLICY "Users can manage their own preferences" ON public.user_event_preferences
  FOR ALL USING (auth.uid() = user_id);

-- User interactions are user-specific
CREATE POLICY "Users can manage their own interactions" ON public.user_event_interactions
  FOR ALL USING (auth.uid() = user_id);

-- Insert default API sources
INSERT INTO public.event_api_sources (platform_name, api_type, cost_per_request, daily_quota, priority, supported_regions) VALUES
('eventbrite', 'free', 0, 1000, 8, '{"global"}'),
('meetup', 'free', 0, 200, 7, '{"global"}'),
('google_places', 'paid', 0.032, 2500, 9, '{"global"}'),
('bookmyshow_scraper', 'scraping', 0, 500, 6, '{"IN"}'),
('ticketmaster', 'paid', 0.25, 1000, 10, '{"US", "CA", "UK"}'),
('seatgeek', 'paid', 0.15, 800, 8, '{"US", "CA"}');

-- Function to generate unique hash for duplicate detection
CREATE OR REPLACE FUNCTION public.generate_event_hash(
  p_title TEXT,
  p_event_date DATE,
  p_location_name TEXT,
  p_organizer TEXT DEFAULT ''
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      LOWER(TRIM(p_title)) || '|' || 
      p_event_date::TEXT || '|' || 
      LOWER(TRIM(p_location_name)) || '|' ||
      LOWER(TRIM(COALESCE(p_organizer, ''))),
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired events
CREATE OR REPLACE FUNCTION public.cleanup_expired_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete events that have expired (1 day after event date)
  DELETE FROM public.events 
  WHERE expires_at < now() OR event_date < CURRENT_DATE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up orphaned cache entries
  DELETE FROM public.location_event_cache 
  WHERE last_fetched_at < (now() - INTERVAL '24 hours');
  
  -- Reset daily API usage counters if needed
  UPDATE public.event_api_sources 
  SET current_daily_usage = 0 
  WHERE last_used_at < CURRENT_DATE;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to check for duplicate events with fuzzy matching
CREATE OR REPLACE FUNCTION public.find_duplicate_event(
  p_title TEXT,
  p_event_date DATE,
  p_location_name TEXT,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL,
  p_organizer TEXT DEFAULT ''
) RETURNS UUID AS $$
DECLARE
  exact_match_id UUID;
  fuzzy_match_id UUID;
  location_threshold DECIMAL := 0.01; -- ~1km threshold
BEGIN
  -- Check for exact hash match first
  SELECT id INTO exact_match_id
  FROM public.events
  WHERE unique_hash = public.generate_event_hash(p_title, p_event_date, p_location_name, p_organizer);
  
  IF exact_match_id IS NOT NULL THEN
    RETURN exact_match_id;
  END IF;
  
  -- Fuzzy match: similar title, same date, nearby location
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    SELECT id INTO fuzzy_match_id
    FROM public.events
    WHERE event_date = p_event_date
      AND similarity(LOWER(title), LOWER(p_title)) > 0.7
      AND ABS(latitude - p_latitude) < location_threshold
      AND ABS(longitude - p_longitude) < location_threshold
    LIMIT 1;
    
    IF fuzzy_match_id IS NOT NULL THEN
      RETURN fuzzy_match_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate unique hash and set expiration
CREATE OR REPLACE FUNCTION public.set_event_unique_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.unique_hash := public.generate_event_hash(
    NEW.title,
    NEW.event_date,
    NEW.location_name,
    NEW.organizer
  );
  NEW.expires_at := DATE(NEW.event_date) + INTERVAL '1 day';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_event_unique_hash
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_event_unique_hash();