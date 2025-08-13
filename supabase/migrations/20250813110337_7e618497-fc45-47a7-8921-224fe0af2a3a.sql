-- Enhance relationship games with comprehensive schema updates from the implementation guide

-- Add missing columns to card_deck_game_sessions for complete response tracking
ALTER TABLE public.card_deck_game_sessions 
ADD COLUMN IF NOT EXISTS response_dismissed_by_user1 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS response_dismissed_by_user2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_card_response_type TEXT,
ADD COLUMN IF NOT EXISTS session_duration INTERVAL,
ADD COLUMN IF NOT EXISTS favorite_cards JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS deck_size INTEGER DEFAULT 60;

-- Add game_decks table for shuffled deck management
CREATE TABLE IF NOT EXISTS public.game_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES card_deck_game_sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  card_id UUID NOT NULL REFERENCES deck_cards(id),
  is_played BOOLEAN DEFAULT FALSE,
  played_at TIMESTAMP,
  skipped BOOLEAN DEFAULT FALSE,
  failed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(session_id, position)
);

-- Enhance deck_cards with additional metadata
ALTER TABLE public.deck_cards 
ADD COLUMN IF NOT EXISTS special_occasions TEXT[],
ADD COLUMN IF NOT EXISTS follow_up_card_id UUID REFERENCES deck_cards(id);

-- Add tic_toe_heart_games table for romantic tic-tac-toe
CREATE TABLE IF NOT EXISTS public.tic_toe_heart_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  board JSONB NOT NULL DEFAULT '[[null,null,null],[null,null,null],[null,null,null]]',
  current_player_id UUID NOT NULL,
  game_status TEXT NOT NULL DEFAULT 'playing' CHECK (game_status IN ('playing', 'won', 'draw', 'abandoned')),
  winner_id UUID NULL,
  moves_count INTEGER NOT NULL DEFAULT 0,
  last_move_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(session_id)
);

-- Add tic_toe_moves table for move history
CREATE TABLE IF NOT EXISTS public.tic_toe_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES tic_toe_heart_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  position_row INTEGER NOT NULL CHECK (position_row >= 0 AND position_row <= 2),
  position_col INTEGER NOT NULL CHECK (position_col >= 0 AND position_col <= 2),
  symbol TEXT NOT NULL CHECK (symbol IN ('💖', '💘')),
  move_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Add love_grants table for winner rewards system
CREATE TABLE IF NOT EXISTS public.love_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  winner_user_id UUID NOT NULL,
  winner_name TEXT NOT NULL,
  winner_symbol TEXT NOT NULL CHECK (winner_symbol IN ('💖', '💘')),
  request_text TEXT NOT NULL,
  game_session_id UUID REFERENCES game_sessions(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'fulfilled')),
  response_text TEXT,
  partner_response TEXT,
  responded_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.game_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tic_toe_heart_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tic_toe_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_grants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for game_decks
CREATE POLICY "Players can view their deck" ON public.game_decks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM card_deck_game_sessions 
      WHERE card_deck_game_sessions.id = game_decks.session_id 
      AND (auth.uid() = card_deck_game_sessions.user1_id OR auth.uid() = card_deck_game_sessions.user2_id)
    )
  );

CREATE POLICY "System can manage game decks" ON public.game_decks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM card_deck_game_sessions 
      WHERE card_deck_game_sessions.id = game_decks.session_id 
      AND (auth.uid() = card_deck_game_sessions.user1_id OR auth.uid() = card_deck_game_sessions.user2_id)
    )
  );

-- Create RLS policies for tic_toe_heart_games
CREATE POLICY "Couple members can view their tic toe games" ON public.tic_toe_heart_games
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs 
      JOIN couples c ON gs.couple_id = c.id
      WHERE gs.id = tic_toe_heart_games.session_id 
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can update their tic toe games" ON public.tic_toe_heart_games
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs 
      JOIN couples c ON gs.couple_id = c.id
      WHERE gs.id = tic_toe_heart_games.session_id 
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Create RLS policies for tic_toe_moves
CREATE POLICY "Couple members can view their game moves" ON public.tic_toe_moves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tic_toe_heart_games tthg
      JOIN game_sessions gs ON tthg.session_id = gs.id
      JOIN couples c ON gs.couple_id = c.id
      WHERE tthg.id = tic_toe_moves.game_id 
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "Players can create their own moves" ON public.tic_toe_moves
  FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Create RLS policies for love_grants
CREATE POLICY "Couple members can view their love grants" ON public.love_grants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM couples 
      WHERE couples.id = love_grants.couple_id 
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can create love grants" ON public.love_grants
  FOR INSERT WITH CHECK (
    auth.uid() = winner_user_id AND
    EXISTS (
      SELECT 1 FROM couples 
      WHERE couples.id = love_grants.couple_id 
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can update their love grants" ON public.love_grants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM couples 
      WHERE couples.id = love_grants.couple_id 
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_decks_session_position ON public.game_decks(session_id, position);
CREATE INDEX IF NOT EXISTS idx_tic_toe_games_session ON public.tic_toe_heart_games(session_id);
CREATE INDEX IF NOT EXISTS idx_tic_toe_moves_game ON public.tic_toe_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_love_grants_couple ON public.love_grants(couple_id);
CREATE INDEX IF NOT EXISTS idx_love_grants_status ON public.love_grants(status);

-- Add database function for creating shuffled deck
CREATE OR REPLACE FUNCTION public.create_shuffled_deck(
  p_session_id UUID,
  p_deck_size INTEGER DEFAULT 60
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  action_cards INTEGER := FLOOR(p_deck_size * 0.34);
  text_cards INTEGER := FLOOR(p_deck_size * 0.33);
  photo_cards INTEGER := p_deck_size - action_cards - text_cards;
  card_record RECORD;
  position_counter INTEGER := 0;
BEGIN
  -- Clear existing deck
  DELETE FROM public.game_decks WHERE session_id = p_session_id;
  
  -- Add action cards
  FOR card_record IN (
    SELECT id FROM public.deck_cards 
    WHERE response_type = 'action' AND is_active = true 
    ORDER BY RANDOM() 
    LIMIT action_cards
  ) LOOP
    INSERT INTO public.game_decks (session_id, position, card_id)
    VALUES (p_session_id, position_counter, card_record.id);
    position_counter := position_counter + 1;
  END LOOP;
  
  -- Add text cards
  FOR card_record IN (
    SELECT id FROM public.deck_cards 
    WHERE response_type = 'text' AND is_active = true 
    ORDER BY RANDOM() 
    LIMIT text_cards
  ) LOOP
    INSERT INTO public.game_decks (session_id, position, card_id)
    VALUES (p_session_id, position_counter, card_record.id);
    position_counter := position_counter + 1;
  END LOOP;
  
  -- Add photo cards
  FOR card_record IN (
    SELECT id FROM public.deck_cards 
    WHERE response_type = 'photo' AND is_active = true 
    ORDER BY RANDOM() 
    LIMIT photo_cards
  ) LOOP
    INSERT INTO public.game_decks (session_id, position, card_id)
    VALUES (p_session_id, position_counter, card_record.id);
    position_counter := position_counter + 1;
  END LOOP;
  
  -- Final shuffle of all cards
  WITH shuffled AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) - 1 as new_position
    FROM public.game_decks 
    WHERE session_id = p_session_id
  )
  UPDATE public.game_decks 
  SET position = shuffled.new_position
  FROM shuffled 
  WHERE game_decks.id = shuffled.id;
  
END;
$$;