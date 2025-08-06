-- Add response tracking columns to game session for real-time display
ALTER TABLE card_deck_game_sessions 
ADD COLUMN current_card_response TEXT,
ADD COLUMN current_card_response_type TEXT,
ADD COLUMN current_card_responded_at TIMESTAMP WITH TIME ZONE;