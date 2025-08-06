-- Add AI generation capabilities to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS generation_batch_id uuid DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city_name text DEFAULT NULL;

-- Create cities table for better location management
CREATE TABLE IF NOT EXISTS public.cities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  state text,
  country text NOT NULL DEFAULT 'US',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  timezone text NOT NULL DEFAULT 'America/New_York',
  population integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert major US cities
INSERT INTO public.cities (name, state, country, latitude, longitude, timezone, population, is_active) VALUES
('New York', 'NY', 'US', 40.7128, -74.0060, 'America/New_York', 8336000, true),
('Los Angeles', 'CA', 'US', 34.0522, -118.2437, 'America/Los_Angeles', 3979000, true),
('Chicago', 'IL', 'US', 41.8781, -87.6298, 'America/Chicago', 2693000, true),
('Houston', 'TX', 'US', 29.7604, -95.3698, 'America/Chicago', 2320000, true),
('Phoenix', 'AZ', 'US', 33.4484, -112.0740, 'America/Phoenix', 1680000, true),
('Philadelphia', 'PA', 'US', 39.9526, -75.1652, 'America/New_York', 1584000, true),
('San Antonio', 'TX', 'US', 29.4241, -98.4936, 'America/Chicago', 1547000, true),
('San Diego', 'CA', 'US', 32.7157, -117.1611, 'America/Los_Angeles', 1423000, true),
('Dallas', 'TX', 'US', 32.7767, -96.7970, 'America/Chicago', 1343000, true),
('San Jose', 'CA', 'US', 37.3382, -121.8863, 'America/Los_Angeles', 1021000, true),
('Austin', 'TX', 'US', 30.2672, -97.7431, 'America/Chicago', 965000, true),
('Jacksonville', 'FL', 'US', 30.3322, -81.6557, 'America/New_York', 911000, true),
('Fort Worth', 'TX', 'US', 32.7555, -97.3308, 'America/Chicago', 895000, true),
('Columbus', 'OH', 'US', 39.9612, -82.9988, 'America/New_York', 879000, true),
('Charlotte', 'NC', 'US', 35.2271, -80.8431, 'America/New_York', 873000, true),
('San Francisco', 'CA', 'US', 37.7749, -122.4194, 'America/Los_Angeles', 873000, true),
('Indianapolis', 'IN', 'US', 39.7684, -86.1581, 'America/New_York', 867000, true),
('Seattle', 'WA', 'US', 47.6062, -122.3321, 'America/Los_Angeles', 750000, true),
('Denver', 'CO', 'US', 39.7392, -104.9903, 'America/Denver', 715000, true),
('Boston', 'MA', 'US', 42.3601, -71.0589, 'America/New_York', 685000, true),
('Miami', 'FL', 'US', 25.7617, -80.1918, 'America/New_York', 470000, true),
('Atlanta', 'GA', 'US', 33.7490, -84.3880, 'America/New_York', 498000, true),
('Las Vegas', 'NV', 'US', 36.1699, -115.1398, 'America/Los_Angeles', 651000, true),
('Nashville', 'TN', 'US', 36.1627, -86.7816, 'America/Chicago', 670000, true),
('Portland', 'OR', 'US', 45.5152, -122.6784, 'America/Los_Angeles', 650000, true)
ON CONFLICT DO NOTHING;

-- Create generation jobs table for tracking
CREATE TABLE IF NOT EXISTS public.ai_generation_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id uuid REFERENCES public.cities(id),
  city_name text NOT NULL,
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  events_generated integer DEFAULT 0,
  generation_batch_id uuid NOT NULL,
  cost_estimate numeric DEFAULT 0,
  error_message text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Cities are viewable by authenticated users" ON public.cities
  FOR SELECT USING (auth.role() = 'authenticated'::text);

CREATE POLICY "AI generation jobs viewable by authenticated users" ON public.ai_generation_jobs
  FOR SELECT USING (auth.role() = 'authenticated'::text);

CREATE POLICY "System can manage AI generation jobs" ON public.ai_generation_jobs
  FOR ALL USING (auth.role() = 'service_role'::text);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_ai_generated ON public.events(ai_generated) WHERE ai_generated = true;
CREATE INDEX IF NOT EXISTS idx_events_city_name ON public.events(city_name) WHERE city_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_generation_batch ON public.events(generation_batch_id) WHERE generation_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cities_location ON public.cities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_city ON public.ai_generation_jobs(city_id);

-- Function to cleanup old AI events
CREATE OR REPLACE FUNCTION cleanup_old_ai_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Delete AI events older than 7 days
  DELETE FROM public.events 
  WHERE ai_generated = true 
    AND created_at < now() - INTERVAL '7 days';
    
  -- Delete old generation jobs
  DELETE FROM public.ai_generation_jobs 
  WHERE created_at < now() - INTERVAL '30 days';
END;
$function$;