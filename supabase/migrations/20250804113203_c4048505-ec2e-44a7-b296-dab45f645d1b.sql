-- Enable cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Set up scheduled event fetching every 3 hours
SELECT cron.schedule(
  'scheduled-event-fetcher-3h',
  '0 */3 * * *', -- Every 3 hours at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://kdbgwmtihgmialrmaecn.supabase.co/functions/v1/scheduled-event-fetcher',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYmd3bXRpaGdtaWFscm1hZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjA0MzAsImV4cCI6MjA2OTI5NjQzMH0.9tugXDyBuaIaf8fAS0z6cyb-y8Rtykl2zrPxd8bnnOw"}'::jsonb,
        body:='{"trigger": "scheduled", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);

-- Create a view for monitoring cron jobs
CREATE OR REPLACE VIEW public.cron_jobs_status AS
SELECT 
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname LIKE 'scheduled-event-fetcher%';