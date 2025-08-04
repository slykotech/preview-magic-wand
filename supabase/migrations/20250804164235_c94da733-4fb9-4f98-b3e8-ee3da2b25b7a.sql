-- Update the cron job schedule from 3 hours to 4 hours
SELECT cron.unschedule('scheduled-event-fetcher');

-- Create new 4-hour schedule
SELECT cron.schedule(
  'scheduled-event-fetcher',
  '0 */4 * * *', -- Every 4 hours
  $$
  SELECT
    net.http_post(
        url:='https://kdbgwmtihgmialrmaecn.supabase.co/functions/v1/scheduled-event-fetcher',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYmd3bXRpaGdtaWFscm1hZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjA0MzAsImV4cCI6MjA2OTI5NjQzMH0.9tugXDyBuaIaf8fAS0z6cyb-y8Rtykl2zrPxd8bnnOw"}'::jsonb,
        body:='{"time": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);

-- Create table for caching user location preferences
CREATE TABLE IF NOT EXISTS public.user_location_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  display_name TEXT NOT NULL,
  is_current BOOLEAN DEFAULT true,
  search_radius INTEGER DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, latitude, longitude)
);

-- Enable RLS
ALTER TABLE public.user_location_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for user_location_cache
CREATE POLICY "Users can manage their own location cache" 
ON public.user_location_cache 
FOR ALL 
USING (auth.uid() = user_id);

-- Create table for caching event suggestions
CREATE TABLE IF NOT EXISTS public.event_suggestions_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_key TEXT NOT NULL, -- lat,lng,radius hash
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 25,
  cached_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  events_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '6 hours'),
  UNIQUE(location_key)
);

-- Enable RLS
ALTER TABLE public.event_suggestions_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for event_suggestions_cache
CREATE POLICY "Event suggestions cache is viewable by authenticated users" 
ON public.event_suggestions_cache 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_user_location_cache_updated_at
  BEFORE UPDATE ON public.user_location_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_events_location_coords ON public.events(location_lat, location_lng) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_city_country ON public.events(city, country);
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON public.events(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_location_cache_user_id ON public.user_location_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_event_suggestions_cache_location ON public.event_suggestions_cache(location_key);
CREATE INDEX IF NOT EXISTS idx_event_suggestions_cache_expires ON public.event_suggestions_cache(expires_at);