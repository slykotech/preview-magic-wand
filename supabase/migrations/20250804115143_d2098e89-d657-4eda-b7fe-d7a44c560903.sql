-- Fix the get_events_by_location function with correct ROUND syntax
CREATE OR REPLACE FUNCTION public.get_events_by_location(
  user_lat numeric,
  user_lng numeric,
  radius_km integer DEFAULT 25,
  max_events integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  venue text,
  location_name text,
  location_lat numeric,
  location_lng numeric,
  event_date date,
  event_time text,
  price text,
  image_url text,
  booking_url text,
  source text,
  city text,
  distance_km numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  events_found integer := 0;
  current_radius integer := radius_km;
  max_radius integer := 200; -- Maximum search radius for rural fallback
BEGIN
  -- Try expanding radius until we find events or hit max radius
  WHILE events_found < 5 AND current_radius <= max_radius LOOP
    RETURN QUERY
    SELECT 
      e.id,
      e.title,
      e.description,
      e.category,
      e.venue,
      e.location_name,
      e.location_lat,
      e.location_lng,
      e.event_date,
      e.event_time,
      e.price,
      e.image_url,
      e.booking_url,
      e.source,
      e.city,
      CAST(
        6371 * acos(
          cos(radians(user_lat)) * 
          cos(radians(e.location_lat)) * 
          cos(radians(e.location_lng) - radians(user_lng)) + 
          sin(radians(user_lat)) * 
          sin(radians(e.location_lat))
        ) AS numeric(10,2)
      ) as distance_km
    FROM public.events e
    WHERE 
      e.expires_at > now()
      AND e.location_lat IS NOT NULL 
      AND e.location_lng IS NOT NULL
      AND (
        6371 * acos(
          cos(radians(user_lat)) * 
          cos(radians(e.location_lat)) * 
          cos(radians(e.location_lng) - radians(user_lng)) + 
          sin(radians(user_lat)) * 
          sin(radians(e.location_lat))
        )
      ) <= current_radius
    ORDER BY distance_km ASC, e.fetch_timestamp DESC
    LIMIT max_events;
    
    -- Count how many events we found
    GET DIAGNOSTICS events_found = ROW_COUNT;
    
    -- If we didn't find enough events, expand the radius
    IF events_found < 5 THEN
      current_radius := current_radius * 2;
    END IF;
  END LOOP;
END;
$function$;

-- Also create a simpler version for city-based searches
CREATE OR REPLACE FUNCTION public.get_events_by_city(
  city_name text,
  max_events integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  venue text,
  location_name text,
  location_lat numeric,
  location_lng numeric,
  event_date date,
  event_time text,
  price text,
  image_url text,
  booking_url text,
  source text,
  city text,
  distance_km numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.category,
    e.venue,
    e.location_name,
    e.location_lat,
    e.location_lng,
    e.event_date,
    e.event_time,
    e.price,
    e.image_url,
    e.booking_url,
    e.source,
    e.city,
    CAST(0 AS numeric(10,2)) as distance_km
  FROM public.events e
  WHERE 
    e.expires_at > now()
    AND e.city ILIKE '%' || city_name || '%'
  ORDER BY e.fetch_timestamp DESC
  LIMIT max_events;
END;
$function$;