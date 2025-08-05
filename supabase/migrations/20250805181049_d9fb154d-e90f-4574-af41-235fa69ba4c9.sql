-- Create enhanced find_nearby_places function with city-specific filtering
CREATE OR REPLACE FUNCTION public.find_nearby_places(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 50,
  category_filter TEXT DEFAULT NULL,
  city_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  google_place_id TEXT,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_types TEXT[],
  rating NUMERIC,
  price_level INTEGER,
  photo_references TEXT[],
  phone TEXT,
  website TEXT,
  is_open BOOLEAN,
  distance_km NUMERIC,
  location_context JSONB
)
LANGUAGE plpgsql
AS $$
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
    ST_Distance(
      ST_Point(search_lng, search_lat)::geography,
      ST_Point(p.longitude, p.latitude)::geography
    ) / 1000 as distance_km,
    p.location_context
  FROM public.places p
  WHERE 
    -- Distance filter using PostGIS
    ST_DWithin(
      ST_Point(search_lng, search_lat)::geography,
      ST_Point(p.longitude, p.latitude)::geography,
      radius_km * 1000
    )
    -- City-specific filter when provided
    AND (
      city_name IS NULL 
      OR p.location_context->>'city' ILIKE '%' || city_name || '%'
      OR p.location_context->>'region' ILIKE '%' || city_name || '%'
      OR p.address ILIKE '%' || city_name || '%'
    )
    -- Category filter when provided
    AND (
      category_filter IS NULL 
      OR (
        CASE category_filter
          WHEN 'Cultural & Historical' THEN 
            p.place_types && ARRAY['tourist_attraction', 'museum', 'art_gallery', 'cultural_center']
          WHEN 'Religious & Spiritual' THEN 
            p.place_types && ARRAY['church', 'hindu_temple', 'mosque', 'synagogue', 'temple', 'place_of_worship']
          WHEN 'Entertainment' THEN 
            p.place_types && ARRAY['movie_theater', 'amusement_park', 'bowling_alley', 'casino', 'night_club']
          WHEN 'Dining & Social' THEN 
            p.place_types && ARRAY['restaurant', 'cafe', 'bar', 'brewery']
          WHEN 'Nature & Outdoor' THEN 
            p.place_types && ARRAY['park', 'zoo', 'aquarium', 'botanical_garden']
          WHEN 'Shopping & Markets' THEN 
            p.place_types && ARRAY['shopping_mall', 'market', 'bookstore', 'jewelry_store']
          ELSE true
        END
      )
    )
    -- Filter for date-appropriate places
    AND (
      p.place_types && ARRAY[
        'restaurant', 'cafe', 'bar', 'brewery', 'movie_theater', 'amusement_park',
        'park', 'zoo', 'aquarium', 'botanical_garden', 'tourist_attraction',
        'museum', 'art_gallery', 'shopping_mall', 'spa', 'bowling_alley'
      ]
    )
    -- Exclude business/office places
    AND NOT (
      p.place_types && ARRAY[
        'bank', 'atm', 'hospital', 'pharmacy', 'gas_station', 'car_repair',
        'dentist', 'doctor', 'lawyer', 'accounting', 'insurance_agency',
        'real_estate_agency', 'post_office', 'government'
      ]
    )
  ORDER BY distance_km
  LIMIT 50;
END;
$$;