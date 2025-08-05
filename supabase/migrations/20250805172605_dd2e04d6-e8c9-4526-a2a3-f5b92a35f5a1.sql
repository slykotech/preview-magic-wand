-- Create places table to store Google Places data with geospatial indexing
CREATE TABLE public.places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  google_place_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  place_types TEXT[] NOT NULL DEFAULT '{}',
  rating DECIMAL(2,1),
  price_level INTEGER,
  photo_references TEXT[] DEFAULT '{}',
  phone TEXT,
  website TEXT,
  opening_hours JSONB,
  is_open BOOLEAN,
  google_data JSONB DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create geospatial index for efficient location queries
CREATE INDEX idx_places_location ON public.places USING GIST (ST_Point(longitude, latitude));

-- Create index on place types for category filtering
CREATE INDEX idx_places_types ON public.places USING GIN (place_types);

-- Create index on Google Place ID for deduplication
CREATE INDEX idx_places_google_id ON public.places (google_place_id);

-- Enable RLS
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Places are viewable by authenticated users
CREATE POLICY "Places are viewable by authenticated users" 
ON public.places 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create place categories lookup table
CREATE TABLE public.place_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL UNIQUE,
  google_place_types TEXT[] NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for place categories
ALTER TABLE public.place_categories ENABLE ROW LEVEL SECURITY;

-- Place categories are viewable by authenticated users
CREATE POLICY "Place categories are viewable by authenticated users" 
ON public.place_categories 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Insert default place categories
INSERT INTO public.place_categories (category_name, google_place_types, display_order) VALUES
('Cultural & Historical', ARRAY['tourist_attraction', 'museum', 'art_gallery', 'historical_landmark', 'monument', 'cultural_center'], 1),
('Religious & Spiritual', ARRAY['church', 'hindu_temple', 'mosque', 'synagogue', 'temple', 'place_of_worship'], 2),
('Entertainment', ARRAY['movie_theater', 'amusement_park', 'bowling_alley', 'casino', 'night_club'], 3),
('Dining & Social', ARRAY['restaurant', 'cafe', 'bar', 'brewery', 'food'], 4),
('Nature & Outdoor', ARRAY['park', 'zoo', 'aquarium', 'botanical_garden', 'beach'], 5),
('Shopping & Markets', ARRAY['shopping_mall', 'market', 'bookstore', 'jewelry_store', 'department_store'], 6);

-- Create function to find nearby places
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