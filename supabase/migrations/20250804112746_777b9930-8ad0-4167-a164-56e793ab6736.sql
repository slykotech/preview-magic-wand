-- Phase 1: Enhanced Events Table Schema
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS country_code text,
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS audience_tags text[],
ADD COLUMN IF NOT EXISTS fetch_timestamp timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS rural_coverage_radius integer DEFAULT 50;

-- Create indexes for efficient location-based queries
CREATE INDEX IF NOT EXISTS idx_events_location_lat_lng ON public.events (location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_events_city ON public.events (city);
CREATE INDEX IF NOT EXISTS idx_events_country_code ON public.events (country_code);
CREATE INDEX IF NOT EXISTS idx_events_fetch_timestamp ON public.events (fetch_timestamp);
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON public.events (expires_at);

-- Event fetch jobs tracking table
CREATE TABLE IF NOT EXISTS public.event_fetch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  target_location text NOT NULL,
  country_code text,
  city text,
  latitude numeric,
  longitude numeric,
  status text DEFAULT 'pending',
  events_fetched integer DEFAULT 0,
  sources_used text[],
  cost_estimate numeric DEFAULT 0,
  error_message text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS for event_fetch_jobs (admin only)
ALTER TABLE public.event_fetch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event fetch jobs are viewable by authenticated users"
ON public.event_fetch_jobs FOR SELECT
TO authenticated
USING (true);

-- Country event configuration table
CREATE TABLE IF NOT EXISTS public.country_event_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text UNIQUE NOT NULL,
  country_name text NOT NULL,
  major_cities jsonb NOT NULL, -- [{"name": "Mumbai", "lat": 19.076, "lng": 72.877, "priority": 1}]
  fetch_frequency_hours integer DEFAULT 3,
  sources_enabled text[] DEFAULT ARRAY['google', 'bookmyshow', 'insider', 'district', 'facebook', 'meetup', 'allevents'],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for country_event_config
ALTER TABLE public.country_event_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Country config is viewable by authenticated users"
ON public.country_event_config FOR SELECT
TO authenticated
USING (true);

-- Insert initial country configurations
INSERT INTO public.country_event_config (country_code, country_name, major_cities) VALUES 
('IN', 'India', '[
  {"name": "Mumbai", "lat": 19.076, "lng": 72.877, "priority": 1},
  {"name": "Delhi", "lat": 28.6139, "lng": 77.2090, "priority": 1},
  {"name": "Bangalore", "lat": 12.9716, "lng": 77.5946, "priority": 1},
  {"name": "Hyderabad", "lat": 17.3850, "lng": 78.4867, "priority": 1},
  {"name": "Chennai", "lat": 13.0827, "lng": 80.2707, "priority": 1},
  {"name": "Kolkata", "lat": 22.5726, "lng": 88.3639, "priority": 1},
  {"name": "Pune", "lat": 18.5204, "lng": 73.8567, "priority": 2},
  {"name": "Ahmedabad", "lat": 23.0225, "lng": 72.5714, "priority": 2},
  {"name": "Jaipur", "lat": 26.9124, "lng": 75.7873, "priority": 2},
  {"name": "Surat", "lat": 21.1702, "lng": 72.8311, "priority": 2}
]'::jsonb),
('US', 'United States', '[
  {"name": "New York", "lat": 40.7128, "lng": -74.0060, "priority": 1},
  {"name": "Los Angeles", "lat": 34.0522, "lng": -118.2437, "priority": 1},
  {"name": "Chicago", "lat": 41.8781, "lng": -87.6298, "priority": 1},
  {"name": "Houston", "lat": 29.7604, "lng": -95.3698, "priority": 1},
  {"name": "Phoenix", "lat": 33.4484, "lng": -112.0740, "priority": 2},
  {"name": "Philadelphia", "lat": 39.9526, "lng": -75.1652, "priority": 2}
]'::jsonb),
('GB', 'United Kingdom', '[
  {"name": "London", "lat": 51.5074, "lng": -0.1278, "priority": 1},
  {"name": "Manchester", "lat": 53.4808, "lng": -2.2426, "priority": 2},
  {"name": "Birmingham", "lat": 52.4862, "lng": -1.8904, "priority": 2},
  {"name": "Liverpool", "lat": 53.4084, "lng": -2.9916, "priority": 2}
]'::jsonb)
ON CONFLICT (country_code) DO NOTHING;

-- Function to get events by location with rural fallback
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
      ROUND(
        6371 * acos(
          cos(radians(user_lat)) * 
          cos(radians(e.location_lat)) * 
          cos(radians(e.location_lng) - radians(user_lng)) + 
          sin(radians(user_lat)) * 
          sin(radians(e.location_lat))
        ), 2
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