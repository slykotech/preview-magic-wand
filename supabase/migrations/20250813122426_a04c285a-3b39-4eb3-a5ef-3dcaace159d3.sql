-- COMPLETE DATABASE SCHEMA FOR RELATIONSHIP GAMES
-- This file contains all the database tables, relationships, and policies needed for both games

-- ================================================================================================
-- CORE TABLES (Dependencies)
-- ================================================================================================

-- Game sessions table (shared between games)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- 'tic_toe_heart' | 'card_deck'
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================================================
-- TIC-TAC-TOE HEART GAME SCHEMA
-- ================================================================================================

-- Main game state table
CREATE TABLE IF NOT EXISTS tic_toe_heart_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  board JSONB NOT NULL DEFAULT '[[null,null,null],[null,null,null],[null,null,null]]',
  current_player_id UUID NOT NULL,
  game_status TEXT NOT NULL DEFAULT 'playing' CHECK (game_status IN ('playing', 'won', 'draw', 'abandoned')),
  winner_id UUID NULL,
  moves_count INTEGER NOT NULL DEFAULT 0,
  last_move_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Individual moves tracking
CREATE TABLE IF NOT EXISTS tic_toe_moves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES tic_toe_heart_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  position_row INTEGER NOT NULL CHECK (position_row >= 0 AND position_row <= 2),
  position_col INTEGER NOT NULL CHECK (position_col >= 0 AND position_col <= 2),
  symbol TEXT NOT NULL CHECK (symbol IN ('💖', '💘')),
  move_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Love grants system (winner rewards)
CREATE TABLE IF NOT EXISTS love_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  winner_user_id UUID NOT NULL,
  winner_name TEXT NOT NULL,
  winner_symbol TEXT NOT NULL CHECK (winner_symbol IN ('💖', '💘')),
  request_text TEXT NOT NULL,
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'fulfilled')),
  partner_response TEXT,
  rejection_reason TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ================================================================================================
-- CARD DECK GAME SCHEMA  
-- ================================================================================================

-- Available cards in the deck
CREATE TABLE IF NOT EXISTS deck_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  prompt TEXT NOT NULL,
  timer_seconds INT NOT NULL,
  timer_category TEXT NOT NULL,
  difficulty_level INT DEFAULT 1,
  intimacy_level INT DEFAULT 1,
  requires_action BOOLEAN DEFAULT FALSE,
  requires_physical_presence BOOLEAN DEFAULT FALSE,
  mood_tags TEXT[],
  relationship_stage TEXT[],
  special_occasions TEXT[],
  response_type TEXT DEFAULT 'action' CHECK (response_type IN ('action', 'text', 'photo')),
  follow_up_card_id UUID,
  usage_count INT DEFAULT 0,
  avg_rating DECIMAL(3,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game session state
CREATE TABLE IF NOT EXISTS card_deck_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  current_turn UUID NOT NULL,
  current_card_id UUID REFERENCES deck_cards(id),
  played_cards JSONB DEFAULT '[]',
  skipped_cards JSONB DEFAULT '[]',
  favorite_cards JSONB DEFAULT '[]',
  user1_skips_remaining INT DEFAULT 3,
  user2_skips_remaining INT DEFAULT 3,
  user1_failed_tasks INT DEFAULT 0,
  user2_failed_tasks INT DEFAULT 0,
  max_failed_tasks INT DEFAULT 3,
  max_skips INT DEFAULT 3,
  game_mode TEXT DEFAULT 'classic',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'rematch_started')),
  winner_id UUID,
  win_reason TEXT,
  current_card_revealed BOOLEAN DEFAULT FALSE,
  current_card_started_at TIMESTAMP WITH TIME ZONE,
  current_card_completed BOOLEAN DEFAULT FALSE,
  last_response_text TEXT,
  last_response_photo_url TEXT,
  last_response_photo_caption TEXT,
  last_response_author_id UUID,
  last_response_timestamp TIMESTAMP WITH TIME ZONE,
  last_response_seen BOOLEAN DEFAULT FALSE,
  rematch_session_id UUID,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_cards_played INT DEFAULT 0,
  session_duration INTERVAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player responses to cards
CREATE TABLE IF NOT EXISTS card_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES card_deck_game_sessions(id),
  card_id UUID NOT NULL REFERENCES deck_cards(id),
  user_id UUID NOT NULL,
  response_text TEXT,
  response_type TEXT DEFAULT 'text' CHECK (response_type IN ('action', 'text', 'photo')),
  partner_reaction TEXT,
  emoji_reaction TEXT,
  time_taken_seconds INT,
  completed_on_time BOOLEAN DEFAULT TRUE,
  is_meaningful BOOLEAN DEFAULT FALSE,
  response_time_seconds INTEGER,
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ================================================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================================================

-- Tic-Tac-Toe indexes
CREATE INDEX IF NOT EXISTS idx_tic_toe_games_session_id ON tic_toe_heart_games(session_id);
CREATE INDEX IF NOT EXISTS idx_tic_toe_moves_game_id ON tic_toe_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_tic_toe_moves_player_id ON tic_toe_moves(player_id);
CREATE INDEX IF NOT EXISTS idx_love_grants_couple_id ON love_grants(couple_id);
CREATE INDEX IF NOT EXISTS idx_love_grants_status ON love_grants(status);

-- Card Game indexes  
CREATE INDEX IF NOT EXISTS idx_card_sessions_couple_id ON card_deck_game_sessions(couple_id);
CREATE INDEX IF NOT EXISTS idx_card_sessions_status ON card_deck_game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_card_responses_session_id ON card_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_card_responses_user_id ON card_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_active ON deck_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_deck_cards_category ON deck_cards(category);

-- ================================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================================================

-- Enable RLS on all tables
ALTER TABLE tic_toe_heart_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE tic_toe_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE love_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_deck_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_responses ENABLE ROW LEVEL SECURITY;

-- Tic-Tac-Toe RLS Policies
CREATE POLICY "Couple members can view their tic toe heart games" 
ON tic_toe_heart_games FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM game_sessions gs
  JOIN couples c ON gs.couple_id = c.id
  WHERE gs.id = tic_toe_heart_games.session_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Couple members can create tic toe heart games" 
ON tic_toe_heart_games FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM game_sessions gs
  JOIN couples c ON gs.couple_id = c.id
  WHERE gs.id = tic_toe_heart_games.session_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Couple members can update their tic toe heart games" 
ON tic_toe_heart_games FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM game_sessions gs
  JOIN couples c ON gs.couple_id = c.id
  WHERE gs.id = tic_toe_heart_games.session_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

-- Love Grants RLS Policies
CREATE POLICY "Couple members can view their love grants" 
ON love_grants FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM couples c
  WHERE c.id = love_grants.couple_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Couple members can create love grants" 
ON love_grants FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM couples c
  WHERE c.id = love_grants.couple_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
) AND winner_user_id = auth.uid());

CREATE POLICY "Couple members can update their love grants" 
ON love_grants FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM couples c
  WHERE c.id = love_grants.couple_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

-- Card Game RLS Policies
CREATE POLICY "Couple members can view their card game sessions" 
ON card_deck_game_sessions FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Couple members can create card game sessions" 
ON card_deck_game_sessions FOR INSERT 
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Couple members can update their card game sessions" 
ON card_deck_game_sessions FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Deck Cards RLS Policies
CREATE POLICY "Anyone can view active cards" 
ON deck_cards FOR SELECT 
USING (is_active = true);

-- Card Responses RLS Policies
CREATE POLICY "Couple members can view card responses for their sessions" 
ON card_responses FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM card_deck_game_sessions cgs
  WHERE cgs.id = card_responses.session_id 
  AND (cgs.user1_id = auth.uid() OR cgs.user2_id = auth.uid())
));

CREATE POLICY "Users can create their own card responses" 
ON card_responses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card responses" 
ON card_responses FOR UPDATE 
USING (auth.uid() = user_id);

-- ================================================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ================================================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_tic_toe_heart_games_updated_at
  BEFORE UPDATE ON tic_toe_heart_games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_love_grants_updated_at
  BEFORE UPDATE ON love_grants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_game_sessions_updated_at
  BEFORE UPDATE ON card_deck_game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================================================
-- REAL-TIME SUBSCRIPTIONS (Supabase)
-- ================================================================================================

-- Enable real-time for game tables
ALTER TABLE tic_toe_heart_games REPLICA IDENTITY FULL;
ALTER TABLE love_grants REPLICA IDENTITY FULL;
ALTER TABLE card_deck_game_sessions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE tic_toe_heart_games;
ALTER PUBLICATION supabase_realtime ADD TABLE love_grants;
ALTER PUBLICATION supabase_realtime ADD TABLE card_deck_game_sessions;

-- ================================================================================================
-- HELPER FUNCTIONS FOR GAME LOGIC
-- ================================================================================================

-- Function to check tic-tac-toe winner
CREATE OR REPLACE FUNCTION check_tic_toe_winner(board JSONB)
RETURNS TEXT AS $$
DECLARE
  row_check TEXT;
  col_check TEXT;
  diag_check TEXT;
BEGIN
  -- Check rows
  FOR i IN 0..2 LOOP
    IF (board->i->0) IS NOT NULL AND 
       (board->i->0) = (board->i->1) AND 
       (board->i->1) = (board->i->2) THEN
      RETURN board->i->0;
    END IF;
  END LOOP;
  
  -- Check columns  
  FOR i IN 0..2 LOOP
    IF (board->0->i) IS NOT NULL AND
       (board->0->i) = (board->1->i) AND
       (board->1->i) = (board->2->i) THEN
      RETURN board->0->i;
    END IF;
  END LOOP;
  
  -- Check diagonals
  IF (board->0->0) IS NOT NULL AND
     (board->0->0) = (board->1->1) AND
     (board->1->1) = (board->2->2) THEN
    RETURN board->0->0;
  END IF;
  
  IF (board->0->2) IS NOT NULL AND
     (board->0->2) = (board->1->1) AND
     (board->1->1) = (board->2->0) THEN
    RETURN board->0->2;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check if board is full (draw condition)
CREATE OR REPLACE FUNCTION is_board_full(board JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  FOR i IN 0..2 LOOP
    FOR j IN 0..2 LOOP
      IF (board->i->j) IS NULL THEN
        RETURN FALSE;
      END IF;
    END LOOP;
  END LOOP;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- SAMPLE DATA INSERTION
-- ================================================================================================

-- Sample deck cards for card game
INSERT INTO deck_cards (category, subcategory, prompt, timer_seconds, timer_category, difficulty_level, intimacy_level, requires_action, requires_physical_presence, mood_tags, relationship_stage, response_type) VALUES

-- Romantic Cards
('romantic', 'appreciation', 'Look into my eyes and tell me three specific things I do that make you feel deeply loved, then seal each one with a kiss.', 120, 'standard', 2, 3, true, true, ARRAY['romantic', 'emotional', 'sweet'], ARRAY['dating', 'committed', 'married'], 'action'),

('romantic', 'memory', 'Tell me about the exact moment you knew you were falling in love with me. What were we doing? What did it feel like?', 180, 'deep', 3, 4, false, false, ARRAY['romantic', 'nostalgic', 'emotional'], ARRAY['dating', 'committed', 'married'], 'text'),

('romantic', 'gesture', 'Create a 30-second love song for me using only humming and hand gestures. Make it as romantic as possible!', 180, 'action', 2, 3, true, false, ARRAY['romantic', 'creative', 'fun'], ARRAY['dating', 'committed', 'married'], 'action'),

-- Flirty Cards  
('flirty', 'tease', 'Using only your eyes and smile, make me blush without saying a word or touching me.', 45, 'quick', 2, 2, true, true, ARRAY['playful', 'flirty', 'fun'], ARRAY['dating', 'committed'], 'action'),

('flirty', 'compliment', 'Tell me the most attractive thing about me that others might not notice, but drives you wild.', 90, 'standard', 2, 3, false, false, ARRAY['flirty', 'compliment', 'attraction'], ARRAY['dating', 'committed', 'married'], 'text'),

-- Fun Cards
('funny', 'silly', 'Do your best impression of me when I first wake up in the morning. Make it as dramatic as possible!', 60, 'action', 1, 1, true, false, ARRAY['funny', 'playful', 'silly'], ARRAY['dating', 'committed', 'married'], 'action'),

('funny', 'challenge', 'Take a selfie together showing your silliest faces and caption it with what you think we''re thinking!', 90, 'action', 1, 2, true, true, ARRAY['funny', 'photo', 'silly'], ARRAY['dating', 'committed', 'married'], 'photo'),

-- Deep Questions
('deep', 'growth', 'What is one way I have helped you become a better person since we have been together?', 120, 'standard', 3, 3, false, false, ARRAY['growth', 'appreciation', 'emotional'], ARRAY['dating', 'committed', 'married'], 'text'),

('deep', 'vulnerability', 'Share your biggest fear about our relationship, then let me reassure you why that fear will never come true.', 240, 'deep', 4, 5, true, true, ARRAY['deep', 'vulnerable', 'emotional'], ARRAY['committed', 'married'], 'text'),

-- Future Planning
('future', 'dreams', 'If we could live anywhere in the world for one year, where would it be and what would we do every day?', 150, 'standard', 2, 2, false, false, ARRAY['dreamy', 'planning', 'future'], ARRAY['dating', 'committed', 'married'], 'text'),

('future', 'goals', 'Describe our perfect weekend together 5 years from now. What will we be doing?', 120, 'standard', 2, 3, false, false, ARRAY['future', 'planning', 'dreams'], ARRAY['committed', 'married'], 'text'),

-- Photo Cards
('memory', 'capture', 'Take a photo that represents how you feel about us right now. Explain why you chose this image.', 120, 'standard', 2, 3, true, false, ARRAY['creative', 'memory', 'emotional'], ARRAY['dating', 'committed', 'married'], 'photo'),

('creative', 'artistic', 'Create a mini photoshoot of our hands in different positions that tell our love story.', 180, 'action', 2, 3, true, true, ARRAY['creative', 'artistic', 'romantic'], ARRAY['dating', 'committed', 'married'], 'photo'),

-- Intimate Cards (higher intimacy level)
('intimate', 'touch', 'Close your eyes and describe how it feels when I touch your face, using only emotions and metaphors.', 120, 'standard', 3, 4, false, true, ARRAY['intimate', 'sensual', 'emotional'], ARRAY['committed', 'married'], 'text'),

('intimate', 'desire', 'Whisper in my ear the one thing about me that drives you absolutely wild with desire.', 90, 'action', 3, 5, true, true, ARRAY['spicy', 'intimate', 'sensual'], ARRAY['dating', 'committed', 'married'], 'action');