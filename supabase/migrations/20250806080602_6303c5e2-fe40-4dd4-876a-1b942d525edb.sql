-- Create function to search events by location and radius
CREATE OR REPLACE FUNCTION public.search_events_by_location(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km INTEGER DEFAULT 50,
  p_city_name TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  price TEXT,
  organizer TEXT,
  category TEXT,
  website_url TEXT,
  image_url TEXT,
  source TEXT,
  ai_generated BOOLEAN,
  city_name TEXT,
  distance_km DOUBLE PRECISION
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.start_date,
    e.end_date,
    e.location_name,
    e.latitude,
    e.longitude,
    e.price,
    e.organizer,
    e.category,
    e.website_url,
    e.image_url,
    e.source,
    e.ai_generated,
    e.city_name,
    CASE 
      WHEN e.latitude IS NOT NULL AND e.longitude IS NOT NULL THEN
        6371 * acos(
          cos(radians(p_lat)) * cos(radians(e.latitude)) * 
          cos(radians(e.longitude) - radians(p_lng)) + 
          sin(radians(p_lat)) * sin(radians(e.latitude))
        )
      ELSE NULL
    END as distance_km
  FROM public.events e
  WHERE 
    e.expires_at > now()
    AND e.start_date > now()
    AND (
      -- Search by city name if provided
      (p_city_name IS NOT NULL AND e.city_name ILIKE '%' || p_city_name || '%')
      OR
      -- Search by radius if coordinates available
      (
        p_city_name IS NULL 
        AND e.latitude IS NOT NULL 
        AND e.longitude IS NOT NULL
        AND 6371 * acos(
          cos(radians(p_lat)) * cos(radians(e.latitude)) * 
          cos(radians(e.longitude) - radians(p_lng)) + 
          sin(radians(p_lat)) * sin(radians(e.latitude))
        ) <= p_radius_km
      )
    )
  ORDER BY 
    e.ai_generated DESC, -- Prioritize AI events
    distance_km ASC NULLS LAST,
    e.start_date ASC
  LIMIT p_limit;
END;
$$;

-- Create function to check if city needs event refresh
CREATE OR REPLACE FUNCTION public.city_needs_event_refresh(
  p_city_name TEXT,
  p_min_events INTEGER DEFAULT 5,
  p_hours_threshold INTEGER DEFAULT 24
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_event_count INTEGER;
  total_event_count INTEGER;
BEGIN
  -- Count recent events (within threshold)
  SELECT COUNT(*) INTO recent_event_count
  FROM public.events
  WHERE city_name ILIKE '%' || p_city_name || '%'
    AND ai_generated = true
    AND created_at >= now() - (p_hours_threshold || ' hours')::INTERVAL
    AND expires_at > now()
    AND start_date > now();
  
  -- Count total valid events
  SELECT COUNT(*) INTO total_event_count
  FROM public.events
  WHERE city_name ILIKE '%' || p_city_name || '%'
    AND expires_at > now()
    AND start_date > now();
  
  -- Need refresh if we have less than minimum events and no recent AI generation
  RETURN (total_event_count < p_min_events AND recent_event_count = 0);
END;
$$;

-- Create function to get popular cities for scheduled refresh
CREATE OR REPLACE FUNCTION public.get_popular_cities_for_refresh(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  city_name TEXT,
  event_count INTEGER,
  last_ai_generation TIMESTAMP WITH TIME ZONE,
  needs_refresh BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH city_stats AS (
    SELECT 
      e.city_name,
      COUNT(*) as event_count,
      MAX(CASE WHEN e.ai_generated THEN e.created_at END) as last_ai_generation,
      COUNT(CASE WHEN e.ai_generated AND e.created_at >= now() - INTERVAL '6 hours' THEN 1 END) as recent_ai_count
    FROM public.events e
    WHERE e.city_name IS NOT NULL
      AND e.expires_at > now()
    GROUP BY e.city_name
  )
  SELECT 
    cs.city_name,
    cs.event_count::INTEGER,
    cs.last_ai_generation,
    (cs.event_count < 5 OR cs.recent_ai_count = 0)::BOOLEAN as needs_refresh
  FROM city_stats cs
  WHERE cs.city_name IS NOT NULL
  ORDER BY 
    (cs.event_count < 5 OR cs.recent_ai_count = 0) DESC, -- Prioritize cities that need refresh
    cs.event_count DESC,
    cs.last_ai_generation ASC NULLS FIRST
  LIMIT p_limit;
END;
$$;