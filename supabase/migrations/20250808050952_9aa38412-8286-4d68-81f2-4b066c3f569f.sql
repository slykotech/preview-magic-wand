-- Complete Card Deck Game Schema Implementation

-- 1. First, let's update the deck_cards table to match the new schema
ALTER TABLE deck_cards 
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS timer_category TEXT CHECK (timer_category IN ('quick', 'standard', 'deep', 'action')),
ADD COLUMN IF NOT EXISTS requires_action BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_card_id UUID,
ADD COLUMN IF NOT EXISTS avg_rating NUMERIC,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS special_occasions TEXT[],
ADD COLUMN IF NOT EXISTS relationship_stage TEXT[];

-- Update existing columns to match new constraints
ALTER TABLE deck_cards 
DROP CONSTRAINT IF EXISTS deck_cards_response_type_check,
ADD CONSTRAINT deck_cards_response_type_check 
  CHECK (response_type IN ('action', 'text', 'photo'));

-- Set default timer_category for existing cards
UPDATE deck_cards 
SET timer_category = CASE 
  WHEN timer_seconds <= 60 THEN 'quick'
  WHEN timer_seconds <= 180 THEN 'standard'
  WHEN timer_seconds <= 300 THEN 'deep'
  ELSE 'action'
END 
WHERE timer_category IS NULL;

-- Make timer_category NOT NULL after setting defaults
ALTER TABLE deck_cards 
ALTER COLUMN timer_category SET NOT NULL;

-- 2. Create game_decks table for shuffled deck management
CREATE TABLE IF NOT EXISTS game_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES card_deck_game_sessions(id) ON DELETE CASCADE,
  position INT NOT NULL, -- Order in deck (0, 1, 2, ...)
  card_id UUID NOT NULL REFERENCES deck_cards(id),
  is_played BOOLEAN DEFAULT FALSE,
  played_at TIMESTAMP WITH TIME ZONE,
  skipped BOOLEAN DEFAULT FALSE,
  failed BOOLEAN DEFAULT FALSE,
  
  UNIQUE(session_id, position),
  UNIQUE(session_id, card_id),
  CHECK (position >= 0)
);

-- 3. Update card_deck_game_sessions table with new fields
ALTER TABLE card_deck_game_sessions 
ADD COLUMN IF NOT EXISTS current_card_index INT DEFAULT -1,
ADD COLUMN IF NOT EXISTS current_card_revealed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_card_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_card_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deck_size INT DEFAULT 60,
ADD COLUMN IF NOT EXISTS max_skips INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_failed_tasks INT DEFAULT 3;

-- 4. Update card_responses table
ALTER TABLE card_responses 
ADD COLUMN IF NOT EXISTS position_in_deck INT,
ADD COLUMN IF NOT EXISTS response_video_url TEXT,
ADD COLUMN IF NOT EXISTS response_audio_url TEXT;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_decks_session_position ON game_decks(session_id, position);
CREATE INDEX IF NOT EXISTS idx_game_decks_session_played ON game_decks(session_id, is_played);
CREATE INDEX IF NOT EXISTS idx_game_decks_next_card ON game_decks(session_id, is_played, position);
CREATE INDEX IF NOT EXISTS idx_deck_cards_type ON deck_cards(response_type, is_active);

-- 6. Enable RLS on new table
ALTER TABLE game_decks ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for game_decks
CREATE POLICY "Players can view their deck" ON game_decks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM card_deck_game_sessions
      WHERE id = game_decks.session_id
      AND auth.uid() IN (user1_id, user2_id)
    )
  );

CREATE POLICY "System can manage game decks" ON game_decks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM card_deck_game_sessions
      WHERE id = game_decks.session_id
      AND auth.uid() IN (user1_id, user2_id)
    )
  );

-- 8. Function to create shuffled deck
CREATE OR REPLACE FUNCTION create_shuffled_deck(p_session_id UUID, p_deck_size INT DEFAULT 60)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_cards_needed INT;
  text_cards_needed INT;
  photo_cards_needed INT;
  total_inserted INT := 0;
  deck_card RECORD;
  position_counter INT := 0;
BEGIN
  -- Calculate distribution (34% action, 33% text, 33% photo)
  action_cards_needed := FLOOR(p_deck_size * 0.34);
  text_cards_needed := FLOOR(p_deck_size * 0.33);
  photo_cards_needed := p_deck_size - action_cards_needed - text_cards_needed;
  
  -- Clear existing deck for this session
  DELETE FROM game_decks WHERE session_id = p_session_id;
  
  -- Insert action cards
  WITH shuffled_actions AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
    FROM deck_cards 
    WHERE response_type = 'action' AND is_active = true
  )
  INSERT INTO game_decks (session_id, position, card_id)
  SELECT 
    p_session_id,
    position_counter + (ROW_NUMBER() OVER (ORDER BY rn) - 1),
    id
  FROM shuffled_actions 
  WHERE rn <= action_cards_needed;
  
  position_counter := position_counter + action_cards_needed;
  
  -- Insert text cards
  WITH shuffled_text AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
    FROM deck_cards 
    WHERE response_type = 'text' AND is_active = true
  )
  INSERT INTO game_decks (session_id, position, card_id)
  SELECT 
    p_session_id,
    position_counter + (ROW_NUMBER() OVER (ORDER BY rn) - 1),
    id
  FROM shuffled_text 
  WHERE rn <= text_cards_needed;
  
  position_counter := position_counter + text_cards_needed;
  
  -- Insert photo cards
  WITH shuffled_photos AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
    FROM deck_cards 
    WHERE response_type = 'photo' AND is_active = true
  )
  INSERT INTO game_decks (session_id, position, card_id)
  SELECT 
    p_session_id,
    position_counter + (ROW_NUMBER() OVER (ORDER BY rn) - 1),
    id
  FROM shuffled_photos 
  WHERE rn <= photo_cards_needed;
  
  -- Now shuffle the entire deck by updating positions randomly
  WITH shuffled_positions AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY RANDOM()) - 1 as new_position
    FROM game_decks 
    WHERE session_id = p_session_id
  )
  UPDATE game_decks 
  SET position = sp.new_position
  FROM shuffled_positions sp
  WHERE game_decks.id = sp.id;
  
  -- Return count of cards in deck
  SELECT COUNT(*) INTO total_inserted 
  FROM game_decks 
  WHERE session_id = p_session_id;
  
  RETURN total_inserted;
END;
$$;