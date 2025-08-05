-- Ensure proper replica identity for real-time updates
ALTER TABLE public.tic_toe_heart_games REPLICA IDENTITY FULL;