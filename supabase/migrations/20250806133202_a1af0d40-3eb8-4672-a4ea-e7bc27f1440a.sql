-- Check if card_responses is in the realtime publication
SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add card_responses to realtime publication if not already there
ALTER PUBLICATION supabase_realtime ADD TABLE card_responses;

-- Make sure we have full replica identity for complete row data
ALTER TABLE card_responses REPLICA IDENTITY FULL;