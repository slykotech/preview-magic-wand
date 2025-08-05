-- Fix the duplicate game issue by adding unique constraint and cleaning up duplicates

-- First, delete duplicate games (keep the one with more moves)
DELETE FROM tic_toe_heart_games 
WHERE session_id = 'faf39281-8ec9-416c-91ef-fda38bae65f8' 
  AND moves_count = 0;

-- Add unique constraint to prevent duplicate games per session
ALTER TABLE tic_toe_heart_games 
ADD CONSTRAINT unique_session_game UNIQUE (session_id);

-- Create index for better performance on session_id lookups
CREATE INDEX IF NOT EXISTS idx_tic_toe_heart_games_session_id 
ON tic_toe_heart_games(session_id);