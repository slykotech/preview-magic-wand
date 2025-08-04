-- Add country and state fields to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Create index for country-based queries
CREATE INDEX IF NOT EXISTS idx_events_country_state ON public.events(country, state, city);

-- Update RPC function to remove limit constraint and support unlimited events
CREATE OR REPLACE FUNCTION public.get_events_by_location_unlimited(
  user_lat numeric, 
  user_lng numeric, 
  radius_km integer DEFAULT 25, 
  max_events integer DEFAULT 100
)
RETURNS TABLE(
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
  country text,
  state text,
  distance_km numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  events_found integer := 0;
  current_radius integer := radius_km;
  max_radius integer := 500; -- Increased max radius for country-wide search
BEGIN
  -- Try expanding radius until we find events or hit max radius
  WHILE events_found < 10 AND current_radius <= max_radius LOOP
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
      e.country,
      e.state,
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
    IF events_found < 10 THEN
      current_radius := current_radius * 2;
    END IF;
  END LOOP;
END;
$function$;

-- Create country-wide event search function
CREATE OR REPLACE FUNCTION public.get_events_by_country(
  country_name text, 
  state_name text DEFAULT NULL,
  max_events integer DEFAULT 100
)
RETURNS TABLE(
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
  country text,
  state text,
  distance_km numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
    e.country,
    e.state,
    CAST(0 AS numeric(10,2)) as distance_km
  FROM public.events e
  WHERE 
    e.expires_at > now()
    AND (e.country ILIKE '%' || country_name || '%' OR country_name = 'ALL')
    AND (state_name IS NULL OR e.state ILIKE '%' || state_name || '%')
  ORDER BY e.fetch_timestamp DESC, e.city ASC
  LIMIT max_events;
END;
$function$;

-- Update city search to return more events
CREATE OR REPLACE FUNCTION public.get_events_by_city_unlimited(
  city_name text, 
  max_events integer DEFAULT 100
)
RETURNS TABLE(
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
  country text,
  state text,
  distance_km numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
    e.country,
    e.state,
    CAST(0 AS numeric(10,2)) as distance_km
  FROM public.events e
  WHERE 
    e.expires_at > now()
    AND (e.city ILIKE '%' || city_name || '%' OR e.location_name ILIKE '%' || city_name || '%')
  ORDER BY e.fetch_timestamp DESC
  LIMIT max_events;
END;
$function$;