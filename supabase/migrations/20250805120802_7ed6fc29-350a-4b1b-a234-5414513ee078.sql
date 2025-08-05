-- Enable real-time for tic_toe_heart_games table
ALTER TABLE public.tic_toe_heart_games REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tic_toe_heart_games;