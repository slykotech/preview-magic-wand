-- Ensure card_responses table has full replica identity for complete realtime data
ALTER TABLE public.card_responses REPLICA IDENTITY FULL;

-- Check if table is in realtime publication
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'card_responses';

-- Add to realtime publication (may error if already added, that's ok)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE card_responses;
        RAISE NOTICE 'Added card_responses to realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Table card_responses already in realtime publication';
    END;
END $$;