-- Add failed task tracking and winner information to game sessions
ALTER TABLE card_deck_game_sessions 
ADD COLUMN IF NOT EXISTS user1_failed_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user2_failed_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS winner_id UUID,
ADD COLUMN IF NOT EXISTS win_reason TEXT; -- 'failed_tasks', 'no_skips', 'completed'

-- Add game configuration for limits
ALTER TABLE card_games 
ADD COLUMN IF NOT EXISTS max_failed_tasks INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_skips INTEGER DEFAULT 3;