-- Drop event-related tables and functions

-- Drop tables in correct order (considering dependencies)
DROP TABLE IF EXISTS public.user_event_interactions CASCADE;
DROP TABLE IF EXISTS public.event_duplicates CASCADE;
DROP TABLE IF EXISTS public.location_event_cache CASCADE;
DROP TABLE IF EXISTS public.events_regional_cache CASCADE;
DROP TABLE IF EXISTS public.event_api_sources CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;

-- Drop event-related functions
DROP FUNCTION IF EXISTS public.get_personalized_events(uuid, numeric, numeric, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_events() CASCADE;
DROP FUNCTION IF EXISTS public.find_duplicate_event(text, text, date, text, text) CASCADE;