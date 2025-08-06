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