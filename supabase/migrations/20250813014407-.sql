-- Fix critical security issues

-- 1. Find and enable RLS on all public tables that don't have it enabled
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN (
            SELECT tablename 
            FROM pg_tables pt
            JOIN pg_class c ON c.relname = pt.tablename
            WHERE c.relrowsecurity = true
            AND pt.schemaname = 'public'
        )
        AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.schemaname, t.tablename);
        RAISE NOTICE 'Enabled RLS on table: %.%', t.schemaname, t.tablename;
    END LOOP;
END $$;

-- 2. Update deck_cards policy to require authentication
DROP POLICY IF EXISTS "Anyone can view active cards" ON public.deck_cards;
DROP POLICY IF EXISTS "Authenticated users can view active cards" ON public.deck_cards;

CREATE POLICY "Authenticated users can view active cards" 
ON public.deck_cards 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- 3. Protect spatial_ref_sys table if it exists and doesn't already have RLS
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'spatial_ref_sys' AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_class c 
        WHERE c.relname = 'spatial_ref_sys' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Authenticated users can view spatial reference data"
        ON public.spatial_ref_sys
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not secure spatial_ref_sys table: %', SQLERRM;
END $$;