-- Check existing cron jobs and remove any that reference event fetching
DO $$
DECLARE
    job_record RECORD;
BEGIN
    FOR job_record IN 
        SELECT jobname FROM cron.job WHERE command LIKE '%scheduled-event-fetcher%' OR command LIKE '%event-scraper%'
    LOOP
        PERFORM cron.unschedule(job_record.jobname);
    END LOOP;
END $$;

-- Create new cron job to run event-scraper-master every 4 hours for all countries
SELECT cron.schedule(
  'auto-scrape-events-global',
  '0 */4 * * *', -- Every 4 hours at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://kdbgwmtihgmialrmaecn.supabase.co/functions/v1/event-scraper-master',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYmd3bXRpaGdtaWFscm1hZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjA0MzAsImV4cCI6MjA2OTI5NjQzMH0.9tugXDyBuaIaf8fAS0z6cyb-y8Rtykl2zrPxd8bnnOw"}'::jsonb,
        body:='{"mode": "batch"}'::jsonb
    ) as request_id;
  $$
);