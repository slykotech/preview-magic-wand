-- Create user event interactions table for personalization
CREATE TABLE IF NOT EXISTS public.user_event_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('viewed', 'saved', 'shared', 'planned')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create event analytics table for monitoring
CREATE TABLE IF NOT EXISTS public.event_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_platform TEXT NOT NULL,
  country TEXT,
  city TEXT,
  events_scraped INTEGER DEFAULT 0,
  events_inserted INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  avg_response_time_ms INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user preferences table
CREATE TABLE IF NOT EXISTS public.user_event_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  preferred_categories TEXT[] DEFAULT '{}',
  preferred_price_range TEXT DEFAULT 'any',
  max_distance_km INTEGER DEFAULT 25,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_events_location ON public.events (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_date_location ON public.events (event_date, latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events (category);
CREATE INDEX IF NOT EXISTS idx_events_country_city ON public.events (country, city);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_event_interactions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_event_id ON public.user_event_interactions (event_id);
CREATE INDEX IF NOT EXISTS idx_event_analytics_date ON public.event_analytics (date);

-- Enable RLS
ALTER TABLE public.user_event_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_event_interactions
CREATE POLICY "Users can manage their own interactions" 
ON public.user_event_interactions 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS policies for user_event_preferences
CREATE POLICY "Users can manage their own preferences" 
ON public.user_event_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS policies for event_analytics (admin view only)
CREATE POLICY "Event analytics viewable by authenticated users" 
ON public.event_analytics 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Function to get personalized events based on user preferences and interactions
CREATE OR REPLACE FUNCTION public.get_personalized_events(
  p_user_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius INTEGER DEFAULT 25,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_date DATE,
  event_time TIME,
  location_name TEXT,
  location_address TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  category TEXT,
  price_range TEXT,
  organizer TEXT,
  source_url TEXT,
  source_platform TEXT,
  image_url TEXT,
  tags TEXT[],
  distance_km DECIMAL,
  relevance_score DECIMAL
) LANGUAGE plpgsql AS $$
DECLARE
  user_preferences public.user_event_preferences%ROWTYPE;
BEGIN
  -- Get user preferences
  SELECT * INTO user_preferences 
  FROM public.user_event_preferences 
  WHERE user_id = p_user_id;
  
  RETURN QUERY
  WITH user_interactions AS (
    SELECT 
      event_id,
      COUNT(*) as interaction_count,
      array_agg(DISTINCT interaction_type) as interaction_types
    FROM public.user_event_interactions 
    WHERE user_id = p_user_id 
    GROUP BY event_id
  ),
  event_distances AS (
    SELECT 
      e.*,
      -- Calculate distance using Haversine formula
      (6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(e.latitude)) * 
        cos(radians(e.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(e.latitude))
      )) as distance_km
    FROM public.events e
    WHERE e.event_date >= CURRENT_DATE
    AND e.latitude IS NOT NULL 
    AND e.longitude IS NOT NULL
  )
  SELECT 
    ed.id,
    ed.title,
    ed.description,
    ed.event_date,
    ed.event_time,
    ed.location_name,
    ed.location_address,
    ed.latitude,
    ed.longitude,
    ed.category,
    ed.price_range,
    ed.organizer,
    ed.source_url,
    ed.source_platform,
    ed.image_url,
    ed.tags,
    ed.distance_km,
    -- Calculate relevance score
    (
      CASE 
        WHEN user_preferences.preferred_categories IS NOT NULL AND 
             ed.category = ANY(user_preferences.preferred_categories) THEN 10
        ELSE 0
      END +
      CASE 
        WHEN ui.interaction_count > 0 THEN 5
        ELSE 0
      END +
      CASE 
        WHEN ed.distance_km <= 5 THEN 8
        WHEN ed.distance_km <= 15 THEN 5
        WHEN ed.distance_km <= 25 THEN 2
        ELSE 0
      END +
      -- Boost events happening soon
      CASE 
        WHEN ed.event_date = CURRENT_DATE THEN 6
        WHEN ed.event_date <= CURRENT_DATE + INTERVAL '3 days' THEN 4
        WHEN ed.event_date <= CURRENT_DATE + INTERVAL '7 days' THEN 2
        ELSE 0
      END
    )::DECIMAL as relevance_score
  FROM event_distances ed
  LEFT JOIN user_interactions ui ON ed.id = ui.event_id
  WHERE ed.distance_km <= COALESCE(user_preferences.max_distance_km, p_radius)
  ORDER BY relevance_score DESC, ed.distance_km ASC, ed.event_date ASC
  LIMIT p_limit;
END;
$$;

-- Function to log scraping analytics
CREATE OR REPLACE FUNCTION public.log_scraping_analytics(
  p_source_platform TEXT,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_events_scraped INTEGER DEFAULT 0,
  p_events_inserted INTEGER DEFAULT 0,
  p_api_calls_made INTEGER DEFAULT 1,
  p_success BOOLEAN DEFAULT true,
  p_response_time_ms INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.event_analytics (
    date,
    source_platform,
    country,
    city,
    events_scraped,
    events_inserted,
    api_calls_made,
    success_rate,
    avg_response_time_ms,
    error_count,
    last_error_message
  ) VALUES (
    CURRENT_DATE,
    p_source_platform,
    p_country,
    p_city,
    p_events_scraped,
    p_events_inserted,
    p_api_calls_made,
    CASE WHEN p_success THEN 100.00 ELSE 0.00 END,
    p_response_time_ms,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    p_error_message
  )
  ON CONFLICT (date, source_platform, COALESCE(country, ''), COALESCE(city, ''))
  DO UPDATE SET
    events_scraped = event_analytics.events_scraped + EXCLUDED.events_scraped,
    events_inserted = event_analytics.events_inserted + EXCLUDED.events_inserted,
    api_calls_made = event_analytics.api_calls_made + EXCLUDED.api_calls_made,
    success_rate = (
      event_analytics.success_rate * event_analytics.api_calls_made + 
      EXCLUDED.success_rate * EXCLUDED.api_calls_made
    ) / (event_analytics.api_calls_made + EXCLUDED.api_calls_made),
    avg_response_time_ms = (
      event_analytics.avg_response_time_ms * event_analytics.api_calls_made + 
      EXCLUDED.avg_response_time_ms * EXCLUDED.api_calls_made
    ) / (event_analytics.api_calls_made + EXCLUDED.api_calls_made),
    error_count = event_analytics.error_count + EXCLUDED.error_count,
    last_error_message = CASE WHEN EXCLUDED.last_error_message IS NOT NULL 
                              THEN EXCLUDED.last_error_message 
                              ELSE event_analytics.last_error_message END;
END;
$$;

-- Set up unique constraint for analytics
ALTER TABLE public.event_analytics 
ADD CONSTRAINT unique_analytics_per_day 
UNIQUE (date, source_platform, country, city);

-- Add triggers for updated_at
CREATE TRIGGER update_user_event_preferences_updated_at
  BEFORE UPDATE ON public.user_event_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();