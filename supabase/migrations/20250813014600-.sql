-- Identify and fix the remaining RLS issues by excluding PostGIS system objects

DO $$
DECLARE
    r record;
    relation_count int := 0;
    postgis_objects text[] := ARRAY[
        'spatial_ref_sys', 'geography_columns', 'geometry_columns',
        'raster_columns', 'raster_overviews', 'topology_topology',
        'layer', 'topology'
    ];
BEGIN
    RAISE NOTICE 'Final RLS check - excluding PostGIS system objects:';
    
    -- Find any remaining tables that need RLS, excluding all PostGIS system objects
    FOR r IN 
        SELECT 
            n.nspname as schema_name,
            c.relname as relation_name,
            CASE c.relkind 
                WHEN 'r' THEN 'table'
                WHEN 'v' THEN 'view'
                WHEN 'm' THEN 'materialized view'
                ELSE c.relkind::text
            END as relation_type
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relkind = 'r'  -- Only tables
        AND NOT c.relrowsecurity  -- doesn't have RLS enabled
        AND c.relname NOT IN (SELECT unnest(postgis_objects))  -- exclude PostGIS objects
        AND c.relname NOT LIKE 'pg_%'  -- exclude PostgreSQL system tables
        AND c.relname NOT LIKE 'sql_%'  -- exclude SQL standard tables
        ORDER BY c.relname
    LOOP
        relation_count := relation_count + 1;
        RAISE NOTICE 'Found table without RLS: %.%', r.schema_name, r.relation_name;
        
        BEGIN
            EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
                r.schema_name, r.relation_name);
            RAISE NOTICE 'Successfully enabled RLS on: %.%', 
                r.schema_name, r.relation_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to enable RLS on %.%: %', 
                r.schema_name, r.relation_name, SQLERRM;
        END;
    END LOOP;
    
    IF relation_count = 0 THEN
        RAISE NOTICE 'All user tables in public schema have RLS enabled!';
    ELSE
        RAISE NOTICE 'Fixed RLS on % tables', relation_count;
    END IF;
    
    -- Also check if any user-created views need special handling
    FOR r IN 
        SELECT 
            n.nspname as schema_name,
            c.relname as relation_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relkind = 'v'  -- Only views
        AND c.relname NOT IN (SELECT unnest(postgis_objects))
        AND c.relname NOT LIKE 'pg_%'
        ORDER BY c.relname
    LOOP
        RAISE NOTICE 'Found user view (views cannot have RLS): %.%', r.schema_name, r.relation_name;
    END LOOP;
    
END $$;