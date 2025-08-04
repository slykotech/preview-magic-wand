-- Fix the security definer view issue
DROP VIEW IF EXISTS public.cron_jobs_status;

-- Create a function instead of a view for security
CREATE OR REPLACE FUNCTION public.get_cron_jobs_status()
RETURNS TABLE (
  jobname text,
  schedule text,
  active boolean,
  jobid bigint
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    j.jobname,
    j.schedule,
    j.active,
    j.jobid
  FROM cron.job j
  WHERE j.jobname LIKE 'scheduled-event-fetcher%';
$$;