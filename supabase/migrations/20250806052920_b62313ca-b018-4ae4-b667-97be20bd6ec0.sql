-- Create deck cards table first
CREATE TABLE deck_cards (
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
  follow_up_card_id UUID,
  usage_count INT DEFAULT 0,
  avg_rating DECIMAL(3,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now create card deck game sessions table
CREATE TABLE card_deck_game_sessions (
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
  game_mode TEXT DEFAULT 'classic',
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_cards_played INT DEFAULT 0,
  session_duration INTERVAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update card_responses table for the new game
ALTER TABLE card_responses 
ADD COLUMN IF NOT EXISTS response_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS partner_reaction TEXT,
ADD COLUMN IF NOT EXISTS time_taken_seconds INT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable RLS
ALTER TABLE card_deck_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game sessions
CREATE POLICY "Couple members can view their sessions" 
ON card_deck_game_sessions FOR SELECT 
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

CREATE POLICY "Couple members can create sessions" 
ON card_deck_game_sessions FOR INSERT 
WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

CREATE POLICY "Couple members can update their sessions" 
ON card_deck_game_sessions FOR UPDATE 
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- RLS Policies for deck cards
CREATE POLICY "Anyone can view active cards" 
ON deck_cards FOR SELECT 
USING (is_active = true);

-- Insert sample cards for testing
INSERT INTO deck_cards (category, subcategory, prompt, timer_seconds, timer_category, difficulty_level, intimacy_level, requires_action, requires_physical_presence, mood_tags, relationship_stage) VALUES
('romantic', 'appreciation', 'Look into my eyes and tell me three specific things I do that make you feel deeply loved, then seal each one with a kiss.', 120, 'standard', 2, 3, true, true, ARRAY['romantic', 'emotional', 'sweet'], ARRAY['dating', 'committed', 'married']),
('flirty', 'tease', 'Using only your eyes and smile, make me blush without saying a word or touching me.', 45, 'quick', 2, 2, true, true, ARRAY['playful', 'flirty', 'fun'], ARRAY['new_couple', 'dating', 'committed', 'married']),
('memory', 'firsts', 'Tell me about the exact moment you knew you knew you were falling in love with me. What were we doing? What did it feel like?', 180, 'deep', 3, 4, false, false, ARRAY['romantic', 'nostalgic', 'emotional'], ARRAY['dating', 'committed', 'married']),
('intimate', 'fears', 'Share your biggest fear about our relationship, then let me reassure you why that fear will never come true.', 240, 'deep', 4, 5, true, true, ARRAY['deep', 'vulnerable', 'emotional'], ARRAY['committed', 'married']),
('funny', 'silly', 'Do your best impression of me when I first wake up in the morning. Make it as dramatic as possible!', 60, 'action', 1, 1, true, false, ARRAY['funny', 'playful', 'silly'], ARRAY['dating', 'committed', 'married']),
('future', 'dreams', 'If we could live anywhere in the world for one year, where would it be and what would we do every day?', 150, 'standard', 2, 2, false, false, ARRAY['dreamy', 'planning', 'future'], ARRAY['dating', 'committed', 'married']),
('spicy', 'desire', 'Whisper in my ear the one thing about me that drives you absolutely wild with desire.', 90, 'action', 3, 5, true, true, ARRAY['spicy', 'intimate', 'sensual'], ARRAY['dating', 'committed', 'married']),
('growth', 'learning', 'What is one way I have helped you become a better person since we have been together?', 120, 'standard', 3, 3, false, false, ARRAY['growth', 'appreciation', 'emotional'], ARRAY['dating', 'committed', 'married']),
('daily', 'habits', 'What is one silly habit of mine that you secretly find adorable, even though you pretend it annoys you?', 90, 'standard', 1, 2, false, false, ARRAY['funny', 'daily', 'sweet'], ARRAY['dating', 'committed', 'married']),
('romantic', 'gesture', 'Create a 30-second love song for me using only humming and hand gestures. Make it as romantic as possible!', 180, 'action', 2, 3, true, false, ARRAY['romantic', 'creative', 'fun'], ARRAY['new_couple', 'dating', 'committed', 'married']);

-- Enable realtime for the session table
ALTER PUBLICATION supabase_realtime ADD TABLE card_deck_game_sessions;