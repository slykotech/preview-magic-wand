-- Ensure card_responses table has realtime enabled and proper replica identity
-- Check current replica identity
SELECT schemaname, tablename, replicaidentity 
FROM pg_tables pt
JOIN pg_class pc ON pt.tablename = pc.relname
WHERE schemaname = 'public' AND tablename = 'card_responses';

-- Set full replica identity to ensure all data is sent in realtime events
ALTER TABLE public.card_responses REPLICA IDENTITY FULL;

-- Ensure the table is in the realtime publication
SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'card_responses';

-- Add to realtime publication if not already there (this might error if already added, that's ok)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE card_responses;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Table card_responses already in realtime publication';
    END;
END $$;