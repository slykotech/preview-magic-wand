-- Create function to find nearby events
CREATE OR REPLACE FUNCTION public.find_nearby_events(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 25
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  price TEXT,
  organizer TEXT,
  category TEXT,
  website_url TEXT,
  image_url TEXT,
  source TEXT,
  external_id TEXT,
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE
) 
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
    e.external_id,
    ST_Distance(
      e.location::geography,
      ST_MakePoint(lng, lat)::geography
    ) / 1000.0 as distance_km,
    e.created_at
  FROM public.events e
  WHERE e.location IS NOT NULL
    AND e.expires_at > now()
    AND e.start_date > now()
    AND ST_DWithin(
      e.location::geography,
      ST_MakePoint(lng, lat)::geography,
      radius_km * 1000
    )
  ORDER BY 
    e.start_date ASC,
    distance_km ASC
  LIMIT 100;
END;
$$;