-- Add performance indexes (skip if already exist)
CREATE INDEX IF NOT EXISTS idx_events_location ON public.events (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_date_location ON public.events (event_date, latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events (category);
CREATE INDEX IF NOT EXISTS idx_events_country_city ON public.events (country, city);

-- Function to get personalized events (improved version)
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
BEGIN
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
  WHERE ed.distance_km <= p_radius
  ORDER BY relevance_score DESC, ed.distance_km ASC, ed.event_date ASC
  LIMIT p_limit;
END;
$$;