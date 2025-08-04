-- Remove all event-related tables and data
-- This will permanently delete all event fetching functionality

-- Drop event-related tables
DROP TABLE IF EXISTS public.user_saved_events CASCADE;
DROP TABLE IF EXISTS public.event_suggestions_cache CASCADE;
DROP TABLE IF EXISTS public.event_fetch_jobs CASCADE;
DROP TABLE IF EXISTS public.country_event_config CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;

-- Drop any event-related functions
DROP FUNCTION IF EXISTS public.get_events_by_location(numeric, numeric, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_events_by_city(text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_events_by_location_unlimited(numeric, numeric, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_events_by_country(text, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_events_by_city_unlimited(text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_events_by_country_enhanced(text, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_events_by_city_enhanced(text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_events_by_location_enhanced(numeric, numeric, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.parse_location_string(text) CASCADE;
DROP FUNCTION IF EXISTS public.clean_existing_location_data() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_events() CASCADE;
DROP FUNCTION IF EXISTS public.get_cron_jobs_status() CASCADE;

-- Remove any scheduled cron jobs for event fetching
-- Note: This needs to be done manually in the Supabase dashboard or via SQL if cron jobs exist

-- Clean up any remaining indexes or constraints related to events
-- (These will be automatically cleaned up when tables are dropped)