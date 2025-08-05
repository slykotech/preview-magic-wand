-- Fix search path for the newly created function
CREATE OR REPLACE FUNCTION public.find_nearby_places(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 100,
  category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  google_place_id TEXT,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_types TEXT[],
  rating DECIMAL,
  price_level INTEGER,
  photo_references TEXT[],
  phone TEXT,
  website TEXT,
  opening_hours JSONB,
  is_open BOOLEAN,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.google_place_id,
    p.name,
    p.address,
    p.latitude,
    p.longitude,
    p.place_types,
    p.rating,
    p.price_level,
    p.photo_references,
    p.phone,
    p.website,
    p.opening_hours,
    p.is_open,
    ROUND(
      (ST_Distance(
        ST_Point(user_lng, user_lat)::geography,
        ST_Point(p.longitude, p.latitude)::geography
      ) / 1000)::numeric, 2
    ) as distance_km
  FROM public.places p
  LEFT JOIN public.place_categories pc ON (
    category_filter IS NULL OR 
    pc.category_name = category_filter AND 
    p.place_types && pc.google_place_types
  )
  WHERE ST_DWithin(
    ST_Point(user_lng, user_lat)::geography,
    ST_Point(p.longitude, p.latitude)::geography,
    radius_km * 1000
  )
  AND (category_filter IS NULL OR pc.id IS NOT NULL)
  ORDER BY distance_km ASC
  LIMIT 50;
END;
$$;