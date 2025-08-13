-- Ensure proper replica identity for realtime updates
ALTER TABLE public.card_deck_game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.card_responses REPLICA IDENTITY FULL;

-- Check if tables are in realtime publication (just for verification)
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public' 
AND tablename IN ('card_deck_game_sessions', 'card_responses', 'tic_toe_heart_games', 'tic_toe_moves');