-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop and recreate the find_nearby_places function with proper geospatial calculations
DROP FUNCTION IF EXISTS public.find_nearby_places(double precision, double precision, double precision, text);

CREATE OR REPLACE FUNCTION public.find_nearby_places(
  search_lat double precision,
  search_lng double precision,
  radius_km double precision DEFAULT 100,
  category_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  rating numeric,
  place_types text[],
  phone text,
  website text,
  is_open boolean,
  price_level integer,
  photo_references text[],
  google_place_id text,
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  search_point geometry;
BEGIN
  -- Create a point geometry from the search coordinates
  search_point := ST_MakePoint(search_lng, search_lat);
  
  -- Query places within the specified radius
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.address,
    p.latitude,
    p.longitude,
    p.rating,
    p.place_types,
    p.phone,
    p.website,
    p.is_open,
    p.price_level,
    p.photo_references,
    p.google_place_id,
    -- Calculate distance in kilometers using Haversine formula
    (6371 * acos(
      cos(radians(search_lat)) * 
      cos(radians(p.latitude)) * 
      cos(radians(p.longitude) - radians(search_lng)) + 
      sin(radians(search_lat)) * 
      sin(radians(p.latitude))
    )) AS distance_km
  FROM public.places p
  WHERE 
    -- Use bounding box for initial filtering (more efficient)
    p.latitude BETWEEN (search_lat - (radius_km / 111.0)) AND (search_lat + (radius_km / 111.0))
    AND p.longitude BETWEEN 
      (search_lng - (radius_km / (111.0 * cos(radians(search_lat))))) 
      AND (search_lng + (radius_km / (111.0 * cos(radians(search_lat)))))
    -- Then apply precise distance calculation
    AND (6371 * acos(
      cos(radians(search_lat)) * 
      cos(radians(p.latitude)) * 
      cos(radians(p.longitude) - radians(search_lng)) + 
      sin(radians(search_lat)) * 
      sin(radians(p.latitude))
    )) <= radius_km
    -- Apply category filter if provided
    AND (category_filter IS NULL OR p.place_types && ARRAY[category_filter])
    -- Only return places with good ratings
    AND (p.rating IS NULL OR p.rating >= 3.0)
  ORDER BY distance_km ASC
  LIMIT 50;
END;
$$;