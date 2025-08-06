-- Create function to check if city needs event refresh
CREATE OR REPLACE FUNCTION public.city_needs_event_refresh(
  p_city_name text,
  p_min_events integer DEFAULT 5,
  p_hours_threshold integer DEFAULT 24
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_count integer;
  recent_ai_count integer;
BEGIN
  -- Count total events for the city
  SELECT COUNT(*) INTO event_count
  FROM public.events
  WHERE city_name ILIKE '%' || p_city_name || '%'
    AND expires_at > now()
    AND start_date > now();

  -- Count recent AI-generated events
  SELECT COUNT(*) INTO recent_ai_count
  FROM public.events
  WHERE city_name ILIKE '%' || p_city_name || '%'
    AND ai_generated = true
    AND created_at > now() - (p_hours_threshold || ' hours')::interval
    AND expires_at > now()
    AND start_date > now();

  -- City needs refresh if:
  -- 1. Total events < minimum required, OR
  -- 2. No recent AI events
  RETURN event_count < p_min_events OR recent_ai_count = 0;
END;
$$;

-- Improved search function with better location matching
CREATE OR REPLACE FUNCTION public.search_events_by_location(
  p_lat double precision,
  p_lng double precision,
  p_radius_km integer DEFAULT 50,
  p_city_name text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  location_name text,
  latitude double precision,
  longitude double precision,
  price text,
  organizer text,
  category text,
  website_url text,
  image_url text,
  source text,
  ai_generated boolean,
  city_name text,
  distance_km double precision
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
      -- Search by city name if provided (flexible matching)
      (p_city_name IS NOT NULL AND (
        e.city_name ILIKE '%' || p_city_name || '%' OR
        e.location_name ILIKE '%' || p_city_name || '%' OR
        e.title ILIKE '%' || p_city_name || '%'
      ))
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
      OR
      -- Fallback: if no specific location matching, include events from the general area
      (e.latitude IS NULL OR e.longitude IS NULL)
    )
  ORDER BY 
    -- Prioritize AI events and close proximity
    e.ai_generated DESC,
    distance_km ASC NULLS LAST,
    e.start_date ASC
  LIMIT p_limit;
END;
$$;