-- Track the last response for the next player to see
ALTER TABLE card_deck_game_sessions 
ADD COLUMN IF NOT EXISTS last_response_text TEXT,
ADD COLUMN IF NOT EXISTS last_response_author_id UUID,
ADD COLUMN IF NOT EXISTS last_response_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_response_seen BOOLEAN DEFAULT FALSE;