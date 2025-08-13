-- Add missing relationship games enhancements (avoiding duplicates)

-- Add missing columns to card_deck_game_sessions for complete response tracking
DO $$ BEGIN
  -- Add columns only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_deck_game_sessions' AND column_name = 'response_dismissed_by_user1') THEN
    ALTER TABLE public.card_deck_game_sessions ADD COLUMN response_dismissed_by_user1 BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_deck_game_sessions' AND column_name = 'response_dismissed_by_user2') THEN
    ALTER TABLE public.card_deck_game_sessions ADD COLUMN response_dismissed_by_user2 BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_deck_game_sessions' AND column_name = 'current_card_response_type') THEN
    ALTER TABLE public.card_deck_game_sessions ADD COLUMN current_card_response_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_deck_game_sessions' AND column_name = 'session_duration') THEN
    ALTER TABLE public.card_deck_game_sessions ADD COLUMN session_duration INTERVAL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_deck_game_sessions' AND column_name = 'favorite_cards') THEN
    ALTER TABLE public.card_deck_game_sessions ADD COLUMN favorite_cards JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_deck_game_sessions' AND column_name = 'deck_size') THEN
    ALTER TABLE public.card_deck_game_sessions ADD COLUMN deck_size INTEGER DEFAULT 60;
  END IF;
END $$;

-- Enhance deck_cards with additional metadata
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deck_cards' AND column_name = 'special_occasions') THEN
    ALTER TABLE public.deck_cards ADD COLUMN special_occasions TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deck_cards' AND column_name = 'follow_up_card_id') THEN
    ALTER TABLE public.deck_cards ADD COLUMN follow_up_card_id UUID REFERENCES deck_cards(id);
  END IF;
END $$;

-- Create missing tables only if they don't exist
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

-- Enable RLS on new tables (only if they were just created)
DO $$ BEGIN
  -- Enable RLS on tic_toe_heart_games if not already enabled
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tic_toe_heart_games' AND relrowsecurity = true) THEN
    ALTER TABLE public.tic_toe_heart_games ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Enable RLS on tic_toe_moves if not already enabled
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tic_toe_moves' AND relrowsecurity = true) THEN
    ALTER TABLE public.tic_toe_moves ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Enable RLS on love_grants if not already enabled
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'love_grants' AND relrowsecurity = true) THEN
    ALTER TABLE public.love_grants ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies only if they don't exist
DO $$ BEGIN
  -- Tic toe heart games policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tic_toe_heart_games' AND policyname = 'Couple members can view their tic toe games') THEN
    EXECUTE 'CREATE POLICY "Couple members can view their tic toe games" ON public.tic_toe_heart_games
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM game_sessions gs 
          JOIN couples c ON gs.couple_id = c.id
          WHERE gs.id = tic_toe_heart_games.session_id 
          AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
      )';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tic_toe_heart_games' AND policyname = 'Couple members can update their tic toe games') THEN
    EXECUTE 'CREATE POLICY "Couple members can update their tic toe games" ON public.tic_toe_heart_games
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM game_sessions gs 
          JOIN couples c ON gs.couple_id = c.id
          WHERE gs.id = tic_toe_heart_games.session_id 
          AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
      )';
  END IF;
  
  -- Tic toe moves policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tic_toe_moves' AND policyname = 'Couple members can view their game moves') THEN
    EXECUTE 'CREATE POLICY "Couple members can view their game moves" ON public.tic_toe_moves
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM tic_toe_heart_games tthg
          JOIN game_sessions gs ON tthg.session_id = gs.id
          JOIN couples c ON gs.couple_id = c.id
          WHERE tthg.id = tic_toe_moves.game_id 
          AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
      )';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tic_toe_moves' AND policyname = 'Players can create their own moves') THEN
    EXECUTE 'CREATE POLICY "Players can create their own moves" ON public.tic_toe_moves
      FOR INSERT WITH CHECK (auth.uid() = player_id)';
  END IF;
  
  -- Love grants policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'love_grants' AND policyname = 'Couple members can view their love grants') THEN
    EXECUTE 'CREATE POLICY "Couple members can view their love grants" ON public.love_grants
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM couples 
          WHERE couples.id = love_grants.couple_id 
          AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
      )';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'love_grants' AND policyname = 'Couple members can create love grants') THEN
    EXECUTE 'CREATE POLICY "Couple members can create love grants" ON public.love_grants
      FOR INSERT WITH CHECK (
        auth.uid() = winner_user_id AND
        EXISTS (
          SELECT 1 FROM couples 
          WHERE couples.id = love_grants.couple_id 
          AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
      )';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'love_grants' AND policyname = 'Couple members can update their love grants') THEN
    EXECUTE 'CREATE POLICY "Couple members can update their love grants" ON public.love_grants
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM couples 
          WHERE couples.id = love_grants.couple_id 
          AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
      )';
  END IF;
END $$;

-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_tic_toe_games_session ON public.tic_toe_heart_games(session_id);
CREATE INDEX IF NOT EXISTS idx_tic_toe_moves_game ON public.tic_toe_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_love_grants_couple ON public.love_grants(couple_id);
CREATE INDEX IF NOT EXISTS idx_love_grants_status ON public.love_grants(status);