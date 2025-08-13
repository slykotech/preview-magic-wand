-- Fix RLS security issue - enable RLS on any tables that don't have it
-- Check and enable RLS on tables that might be missing it

-- Enable RLS on any geography/geometry tables that might be missing it
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Enable RLS on any public schema tables that don't have it enabled
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN (
            SELECT tablename 
            FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            WHERE c.relrowsecurity = true
            AND t.schemaname = 'public'
        )
        AND tablename NOT LIKE 'spatial_%'
        AND tablename NOT LIKE 'geometry_%'
        AND tablename NOT LIKE 'geography_%'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'Enabled RLS on table: %', r.tablename;
    END LOOP;
END $$;