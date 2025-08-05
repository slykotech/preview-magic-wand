-- Fix the find_nearby_places function with proper security settings
CREATE OR REPLACE FUNCTION public.find_nearby_places(
  search_lat double precision, 
  search_lng double precision, 
  radius_km integer DEFAULT 50, 
  category_filter text DEFAULT NULL::text, 
  city_name text DEFAULT NULL::text
)
RETURNS TABLE(
  google_place_id text, 
  name text, 
  address text, 
  latitude double precision, 
  longitude double precision, 
  place_types text[], 
  rating numeric, 
  price_level integer, 
  photo_references text[], 
  phone text, 
  website text, 
  is_open boolean, 
  distance_km numeric, 
  location_context jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
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
    p.is_open,
    ROUND((public.ST_Distance(
      public.ST_Point(search_lng, search_lat)::geography,
      public.ST_Point(p.longitude, p.latitude)::geography
    ) / 1000)::numeric, 2) as distance_km,
    p.location_context
  FROM public.places p
  WHERE 
    -- Distance filter using PostGIS
    public.ST_DWithin(
      public.ST_Point(search_lng, search_lat)::geography,
      public.ST_Point(p.longitude, p.latitude)::geography,
      radius_km * 1000
    )
    -- City-specific filter when provided
    AND (
      city_name IS NULL 
      OR p.location_context->>'city' ILIKE '%' || city_name || '%'
      OR p.address ILIKE '%' || city_name || '%'
    )
    -- Category filter when provided
    AND (
      category_filter IS NULL 
      OR p.place_types && ARRAY[category_filter]
    )
    -- Only return places with decent ratings
    AND (p.rating IS NULL OR p.rating >= 3.0)
  ORDER BY 
    -- Sort by priority types first, then by distance
    CASE 
      WHEN p.place_types && ARRAY['tourist_attraction', 'museum', 'hindu_temple', 'church', 'mosque', 'synagogue', 'place_of_worship', 'historical_landmark'] THEN 1
      WHEN p.place_types && ARRAY['cafe', 'restaurant', 'meal_takeaway', 'meal_delivery'] THEN 2
      WHEN p.place_types && ARRAY['park', 'beach', 'entertainment', 'concert_hall', 'theater'] THEN 3
      ELSE 4
    END,
    distance_km ASC
  LIMIT 50;
END;
$function$