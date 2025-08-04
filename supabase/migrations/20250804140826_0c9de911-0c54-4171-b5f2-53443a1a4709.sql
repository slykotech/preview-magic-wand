-- Enhanced database functions for better event search and city matching

-- Update the get_events_by_city_enhanced function for better partial matching
CREATE OR REPLACE FUNCTION public.get_events_by_city_enhanced(city_name text, max_events integer DEFAULT 20)
RETURNS TABLE(id uuid, title text, description text, category text, venue text, location_name text, location_lat numeric, location_lng numeric, event_date date, event_time text, price text, image_url text, booking_url text, source text, city text, country text, state text, distance_km numeric)
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
    AND (
      -- Exact city match (highest priority)
      LOWER(TRIM(e.city)) = LOWER(TRIM(city_name)) OR
      -- City starts with search term
      LOWER(TRIM(e.city)) LIKE LOWER(TRIM(city_name) || '%') OR
      -- City contains search term
      LOWER(TRIM(e.city)) LIKE LOWER('%' || TRIM(city_name) || '%') OR
      -- Location name matches
      LOWER(TRIM(e.location_name)) LIKE LOWER('%' || TRIM(city_name) || '%') OR
      -- State matches (for when user searches by state)
      LOWER(TRIM(e.state)) LIKE LOWER('%' || TRIM(city_name) || '%') OR
      -- Venue matches
      LOWER(TRIM(e.venue)) LIKE LOWER('%' || TRIM(city_name) || '%')
    )
  ORDER BY 
    -- Prioritize exact matches first
    CASE 
      WHEN LOWER(TRIM(e.city)) = LOWER(TRIM(city_name)) THEN 1
      WHEN LOWER(TRIM(e.city)) LIKE LOWER(TRIM(city_name) || '%') THEN 2
      WHEN LOWER(TRIM(e.location_name)) LIKE LOWER(TRIM(city_name) || '%') THEN 3
      WHEN LOWER(TRIM(e.venue)) LIKE LOWER('%' || TRIM(city_name) || '%') THEN 4
      ELSE 5
    END,
    e.fetch_timestamp DESC,
    e.created_at DESC
  LIMIT max_events;
END;
$$;

-- Enhanced location-based search with better fallback
CREATE OR REPLACE FUNCTION public.get_events_by_location_enhanced(user_lat numeric, user_lng numeric, radius_km integer DEFAULT 25, max_events integer DEFAULT 100)
RETURNS TABLE(id uuid, title text, description text, category text, venue text, location_name text, location_lat numeric, location_lng numeric, event_date date, event_time text, price text, image_url text, booking_url text, source text, city text, country text, state text, distance_km numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  events_found integer := 0;
  current_radius integer := radius_km;
  max_radius integer := 500;
BEGIN
  -- Try expanding radius until we find events or hit max radius
  WHILE events_found < 5 AND current_radius <= max_radius LOOP
    -- Get results for current radius
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
        CASE 
          WHEN e.location_lat IS NOT NULL AND e.location_lng IS NOT NULL THEN
            6371 * acos(
              cos(radians(user_lat)) * 
              cos(radians(e.location_lat)) * 
              cos(radians(e.location_lng) - radians(user_lng)) + 
              sin(radians(user_lat)) * 
              sin(radians(e.location_lat))
            )
          ELSE 999999 -- Large number for events without coordinates
        END AS numeric(10,2)
      ) as distance_km
    FROM public.events e
    WHERE 
      e.expires_at > now()
      AND (
        -- Events with coordinates within radius
        (e.location_lat IS NOT NULL 
         AND e.location_lng IS NOT NULL
         AND (
           6371 * acos(
             cos(radians(user_lat)) * 
             cos(radians(e.location_lat)) * 
             cos(radians(e.location_lng) - radians(user_lng)) + 
             sin(radians(user_lat)) * 
             sin(radians(e.location_lat))
           )
         ) <= current_radius)
      )
    ORDER BY distance_km ASC, e.fetch_timestamp DESC
    LIMIT max_events;
    
    -- Count how many events we found
    GET DIAGNOSTICS events_found = ROW_COUNT;
    
    -- If we didn't find enough events, expand the radius
    IF events_found < 5 THEN
      current_radius := current_radius * 2;
    END IF;
  END LOOP;
  
  -- If still no events found, try to get some events without coordinates from nearby cities
  IF events_found = 0 THEN
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
      CAST(999 AS numeric(10,2)) as distance_km
    FROM public.events e
    WHERE 
      e.expires_at > now()
    ORDER BY e.fetch_timestamp DESC
    LIMIT LEAST(max_events, 20);
  END IF;
END;
$$;