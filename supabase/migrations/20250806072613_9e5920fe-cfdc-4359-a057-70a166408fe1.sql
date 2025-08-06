-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule AI event refresh every 3 hours
SELECT cron.schedule(
  'ai-event-refresh',
  '0 */3 * * *', -- Every 3 hours
  $$
  SELECT
    net.http_post(
        url:='https://kdbgwmtihgmialrmaecn.supabase.co/functions/v1/scheduled-event-refresh',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYmd3bXRpaGdtaWFscm1hZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjA0MzAsImV4cCI6MjA2OTI5NjQzMH0.9tugXDyBuaIaf8fAS0z6cyb-y8Rtykl2zrPxd8bnnOw"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
  'ai-event-cleanup',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT cleanup_old_ai_events();
  $$
);