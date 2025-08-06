-- Add card reveal synchronization columns to card_deck_game_sessions table
ALTER TABLE card_deck_game_sessions 
ADD COLUMN current_card_revealed BOOLEAN DEFAULT FALSE,
ADD COLUMN current_card_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN current_card_completed BOOLEAN DEFAULT FALSE;