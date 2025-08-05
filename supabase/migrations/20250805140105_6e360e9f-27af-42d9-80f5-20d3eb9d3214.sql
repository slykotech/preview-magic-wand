-- Clean up duplicate games and add unique constraint

-- Delete duplicates, keeping the game with most moves or most recent creation
WITH ranked_games AS (
  SELECT id, 
         session_id,
         ROW_NUMBER() OVER (
           PARTITION BY session_id 
           ORDER BY moves_count DESC, created_at DESC
         ) as rn
  FROM tic_toe_heart_games
)
DELETE FROM tic_toe_heart_games 
WHERE id IN (
  SELECT id FROM ranked_games WHERE rn > 1
);

-- Now add the unique constraint to prevent future duplicates
ALTER TABLE tic_toe_heart_games 
ADD CONSTRAINT unique_session_game UNIQUE (session_id);

-- Create index for better performance on session_id lookups
CREATE INDEX IF NOT EXISTS idx_tic_toe_heart_games_session_id 
ON tic_toe_heart_games(session_id);