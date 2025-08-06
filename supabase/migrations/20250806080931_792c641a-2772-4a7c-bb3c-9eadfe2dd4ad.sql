-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests if not already enabled  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the intelligent event refresh to run every 6 hours
SELECT cron.schedule(
  'intelligent-event-refresh',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT
    net.http_post(
        url:='https://kdbgwmtihgmialrmaecn.supabase.co/functions/v1/scheduled-event-refresh',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYmd3bXRpaGdtaWFscm1hZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjA0MzAsImV4cCI6MjA2OTI5NjQzMH0.9tugXDyBuaIaf8fAS0z6cyb-y8Rtykl2zrPxd8bnnOw"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule daily cleanup job to run at 2 AM  
SELECT cron.schedule(
  'daily-event-cleanup',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT
    net.http_post(
        url:='https://kdbgwmtihgmialrmaecn.supabase.co/functions/v1/scheduled-event-refresh',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYmd3bXRpaGdtaWFscm1hZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjA0MzAsImV4cCI6MjA2OTI5NjQzMH0.9tugXDyBuaIaf8fAS0z6cyb-y8Rtykl2zrPxd8bnnOw"}'::jsonb,
        body:=concat('{"cleanup": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create a function to populate some popular cities for initial testing
CREATE OR REPLACE FUNCTION public.seed_popular_cities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.cities (name, state, country, latitude, longitude, population, is_active) VALUES
  ('New York', 'NY', 'US', 40.7128, -74.0060, 8336817, true),
  ('Los Angeles', 'CA', 'US', 34.0522, -118.2437, 3979576, true),
  ('Chicago', 'IL', 'US', 41.8781, -87.6298, 2693976, true),
  ('London', '', 'UK', 51.5074, -0.1278, 9000000, true),
  ('Paris', '', 'FR', 48.8566, 2.3522, 2161000, true),
  ('Toronto', 'ON', 'CA', 43.6532, -79.3832, 2930000, true),
  ('Sydney', 'NSW', 'AU', -33.8688, 151.2093, 5312000, true),
  ('San Francisco', 'CA', 'US', 37.7749, -122.4194, 873965, true),
  ('Miami', 'FL', 'US', 25.7617, -80.1918, 467963, true),
  ('Seattle', 'WA', 'US', 47.6062, -122.3321, 753675, true)
  ON CONFLICT (name, state, country) DO NOTHING;
END;
$$;

-- Run the seed function
SELECT public.seed_popular_cities();