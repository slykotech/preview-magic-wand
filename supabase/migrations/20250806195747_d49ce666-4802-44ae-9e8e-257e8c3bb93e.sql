-- Add columns to track who has dismissed the response popup
ALTER TABLE card_deck_game_sessions 
ADD COLUMN IF NOT EXISTS response_dismissed_by_user1 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS response_dismissed_by_user2 BOOLEAN DEFAULT FALSE;