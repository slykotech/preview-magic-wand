-- Find and fix the remaining RLS disabled table

-- 1. First, let's see which tables in public schema don't have RLS enabled
DO $$
DECLARE
    t record;
    table_count int := 0;
BEGIN
    RAISE NOTICE 'Checking tables without RLS in public schema:';
    
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
        -- Exclude system tables
        AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    LOOP
        table_count := table_count + 1;
        RAISE NOTICE 'Table without RLS: %.%', t.schemaname, t.tablename;
        
        -- Enable RLS on this table
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.schemaname, t.tablename);
        RAISE NOTICE 'Enabled RLS on: %.%', t.schemaname, t.tablename;
    END LOOP;
    
    IF table_count = 0 THEN
        RAISE NOTICE 'All public tables already have RLS enabled!';
    END IF;
END $$;

-- 2. Also check for the spatial_ref_sys table specifically and enable RLS if needed
DO $$ 
BEGIN
    -- Check if spatial_ref_sys exists and needs RLS
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'spatial_ref_sys' AND table_schema = 'public'
    ) THEN
        -- Check if RLS is already enabled
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'spatial_ref_sys' 
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN
            ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
            RAISE NOTICE 'Enabled RLS on spatial_ref_sys table';
            
            -- Add a policy for authenticated users
            CREATE POLICY "Authenticated users can view spatial reference data"
            ON public.spatial_ref_sys
            FOR SELECT
            TO authenticated
            USING (true);
            RAISE NOTICE 'Created policy for spatial_ref_sys table';
        ELSE
            RAISE NOTICE 'RLS already enabled on spatial_ref_sys table';
        END IF;
    ELSE
        RAISE NOTICE 'spatial_ref_sys table does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error handling spatial_ref_sys: %', SQLERRM;
END $$;