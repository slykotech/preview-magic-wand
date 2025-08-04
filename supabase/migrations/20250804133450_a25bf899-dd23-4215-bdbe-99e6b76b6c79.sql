-- Migration to clean up existing location data and improve search functions

-- First, let's update the events table to ensure we have proper columns and indexes
-- Add indexes for better search performance on cleaned location data
CREATE INDEX IF NOT EXISTS idx_events_city_clean ON public.events (LOWER(city));
CREATE INDEX IF NOT EXISTS idx_events_state_clean ON public.events (LOWER(state));
CREATE INDEX IF NOT EXISTS idx_events_country_clean ON public.events (LOWER(country));
CREATE INDEX IF NOT EXISTS idx_events_location_compound ON public.events (city, state, country);

-- Create a function to parse and clean location strings
CREATE OR REPLACE FUNCTION public.parse_location_string(location_string TEXT)
RETURNS TABLE(city TEXT, state TEXT, country TEXT) 
LANGUAGE plpgsql
AS $$
DECLARE
    parts TEXT[];
    part_count INTEGER;
BEGIN
    -- Split the location string by comma and trim whitespace
    parts := string_to_array(location_string, ',');
    
    -- Remove empty parts and trim whitespace
    parts := array_remove(array_agg(TRIM(unnest)), '') 
             FROM unnest(parts) AS unnest;
    
    part_count := array_length(parts, 1);
    
    IF part_count IS NULL OR part_count = 0 THEN
        RETURN QUERY SELECT ''::TEXT, NULL::TEXT, ''::TEXT;
        RETURN;
    END IF;
    
    -- Handle different formats based on number of parts
    CASE part_count
        WHEN 1 THEN
            -- Just a city name
            RETURN QUERY SELECT parts[1], NULL::TEXT, ''::TEXT;
        WHEN 2 THEN
            -- "City, Country"
            RETURN QUERY SELECT parts[1], NULL::TEXT, parts[2];
        WHEN 3 THEN
            -- "City, State, Country"
            RETURN QUERY SELECT parts[1], parts[2], parts[3];
        ELSE
            -- "Area, City, State, Country" - skip the area, use city
            RETURN QUERY SELECT 
                COALESCE(parts[2], parts[1]), 
                COALESCE(parts[3], NULL::TEXT), 
                COALESCE(parts[4], parts[part_count]);
    END CASE;
END;
$$;

-- Create a function to clean existing location data
CREATE OR REPLACE FUNCTION public.clean_existing_location_data()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER := 0;
    event_record RECORD;
    parsed_location RECORD;
BEGIN
    -- Update events where the city field contains comma-separated location data
    FOR event_record IN 
        SELECT id, city, state, country 
        FROM public.events 
        WHERE city LIKE '%,%' 
           OR (city IS NOT NULL AND (state IS NULL OR state = '' OR state = city))
    LOOP
        -- Parse the location string
        SELECT * INTO parsed_location 
        FROM public.parse_location_string(COALESCE(event_record.city, ''));
        
        -- Update the record with clean data
        IF parsed_location.city IS NOT NULL AND parsed_location.city != '' THEN
            UPDATE public.events 
            SET 
                city = parsed_location.city,
                state = COALESCE(parsed_location.state, event_record.state),
                country = COALESCE(NULLIF(parsed_location.country, ''), event_record.country, 'Unknown')
            WHERE id = event_record.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$;

-- Update the get_events_by_city function to handle partial matches better
CREATE OR REPLACE FUNCTION public.get_events_by_city_enhanced(city_name text, max_events integer DEFAULT 20)
 RETURNS TABLE(id uuid, title text, description text, category text, venue text, location_name text, location_lat numeric, location_lng numeric, event_date date, event_time text, price text, image_url text, booking_url text, source text, city text, country text, state text, distance_km numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
      LOWER(e.city) = LOWER(city_name) OR
      LOWER(e.city) LIKE LOWER('%' || city_name || '%') OR
      LOWER(e.location_name) LIKE LOWER('%' || city_name || '%') OR
      LOWER(e.state) LIKE LOWER('%' || city_name || '%')
    )
  ORDER BY 
    -- Prioritize exact matches
    CASE 
      WHEN LOWER(e.city) = LOWER(city_name) THEN 1
      WHEN LOWER(e.city) LIKE LOWER(city_name || '%') THEN 2
      WHEN LOWER(e.location_name) LIKE LOWER(city_name || '%') THEN 3
      ELSE 4
    END,
    e.fetch_timestamp DESC
  LIMIT max_events;
END;
$$;

-- Update get_events_by_country function for better filtering
CREATE OR REPLACE FUNCTION public.get_events_by_country_enhanced(country_name text, state_name text DEFAULT NULL::text, max_events integer DEFAULT 100)
 RETURNS TABLE(id uuid, title text, description text, category text, venue text, location_name text, location_lat numeric, location_lng numeric, event_date date, event_time text, price text, image_url text, booking_url text, source text, city text, country text, state text, distance_km numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
      LOWER(e.country) LIKE LOWER('%' || country_name || '%') 
      OR country_name = 'ALL'
    )
    AND (
      state_name IS NULL 
      OR LOWER(e.state) LIKE LOWER('%' || state_name || '%')
    )
  ORDER BY e.fetch_timestamp DESC, e.city ASC
  LIMIT max_events;
END;
$$;

-- Run the cleanup function to update existing data
SELECT public.clean_existing_location_data() as updated_events_count;