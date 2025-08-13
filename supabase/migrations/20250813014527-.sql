-- Find exactly which tables/views are causing the RLS issue

-- Check all relations (tables and views) in public schema without RLS
DO $$
DECLARE
    r record;
    relation_count int := 0;
BEGIN
    RAISE NOTICE 'Checking all relations in public schema for RLS status:';
    
    -- Check all tables and materialized views
    FOR r IN 
        SELECT 
            n.nspname as schema_name,
            c.relname as relation_name,
            CASE c.relkind 
                WHEN 'r' THEN 'table'
                WHEN 'v' THEN 'view'
                WHEN 'm' THEN 'materialized view'
                ELSE c.relkind::text
            END as relation_type,
            c.relrowsecurity as has_rls
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'v', 'm')  -- tables, views, materialized views
        AND NOT c.relrowsecurity  -- doesn't have RLS enabled
        ORDER BY c.relname
    LOOP
        relation_count := relation_count + 1;
        RAISE NOTICE 'Relation % (%) in schema % does NOT have RLS enabled', 
            r.relation_name, r.relation_type, r.schema_name;
        
        -- Only enable RLS on tables (not views)
        IF r.relation_type = 'table' THEN
            BEGIN
                EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
                    r.schema_name, r.relation_name);
                RAISE NOTICE 'Successfully enabled RLS on table: %.%', 
                    r.schema_name, r.relation_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to enable RLS on %.%: %', 
                    r.schema_name, r.relation_name, SQLERRM;
            END;
        ELSIF r.relation_type = 'materialized view' THEN
            BEGIN
                EXECUTE format('ALTER MATERIALIZED VIEW %I.%I ENABLE ROW LEVEL SECURITY', 
                    r.schema_name, r.relation_name);
                RAISE NOTICE 'Successfully enabled RLS on materialized view: %.%', 
                    r.schema_name, r.relation_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to enable RLS on materialized view %.%: %', 
                    r.schema_name, r.relation_name, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    IF relation_count = 0 THEN
        RAISE NOTICE 'All relations in public schema have RLS enabled!';
    ELSE
        RAISE NOTICE 'Found % relations without RLS', relation_count;
    END IF;
END $$;