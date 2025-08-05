-- Remove the existing cron job for event scraping
SELECT cron.unschedule('auto-scrape-events-global');

-- Check if there are any other event-related cron jobs and remove them
DO $$
DECLARE
    job_record RECORD;
BEGIN
    FOR job_record IN 
        SELECT jobname FROM cron.job 
        WHERE command LIKE '%event%' OR command LIKE '%scrape%' OR jobname LIKE '%event%'
    LOOP
        EXECUTE format('SELECT cron.unschedule(%L)', job_record.jobname);
    END LOOP;
END $$;