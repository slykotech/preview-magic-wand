-- Enable realtime for game tables to ensure immediate updates
-- First, ensure tables have proper replica identity for realtime
ALTER TABLE public.card_deck_game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.card_responses REPLICA IDENTITY FULL;
ALTER TABLE public.tic_toe_heart_games REPLICA IDENTITY FULL;
ALTER TABLE public.tic_toe_moves REPLICA IDENTITY FULL;

-- Add game tables to realtime publication for immediate updates
SELECT pg_drop_replication_slot('supabase_realtime_replication_slot') WHERE EXISTS (
  SELECT 1 FROM pg_replication_slots WHERE slot_name = 'supabase_realtime_replication_slot'
);

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_deck_game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tic_toe_heart_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tic_toe_moves;