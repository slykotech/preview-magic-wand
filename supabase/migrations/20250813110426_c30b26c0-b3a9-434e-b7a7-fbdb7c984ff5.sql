-- Complete the relationship games schema enhancement (fixing policy conflicts)

-- Add missing columns to card_deck_game_sessions for complete response tracking
ALTER TABLE public.card_deck_game_sessions 
ADD COLUMN IF NOT EXISTS response_dismissed_by_user1 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS response_dismissed_by_user2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_card_response_type TEXT,
ADD COLUMN IF NOT EXISTS session_duration INTERVAL,
ADD COLUMN IF NOT EXISTS favorite_cards JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS deck_size INTEGER DEFAULT 60;

-- Enhance deck_cards with additional metadata
ALTER TABLE public.deck_cards 
ADD COLUMN IF NOT EXISTS special_occasions TEXT[],
ADD COLUMN IF NOT EXISTS follow_up_card_id UUID REFERENCES deck_cards(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_decks_session_position ON public.game_decks(session_id, position);
CREATE INDEX IF NOT EXISTS idx_tic_toe_games_session ON public.tic_toe_heart_games(session_id);
CREATE INDEX IF NOT EXISTS idx_tic_toe_moves_game ON public.tic_toe_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_love_grants_couple ON public.love_grants(couple_id);
CREATE INDEX IF NOT EXISTS idx_love_grants_status ON public.love_grants(status);

-- Enhanced database function for creating shuffled deck with smart distribution
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
  
  -- Add action cards (34% of deck)
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
  
  -- Add text cards (33% of deck)
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
  
  -- Add photo cards (33% of deck)
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
  
  -- Final shuffle of all cards for randomization
  WITH shuffled AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) - 1 as new_position
    FROM public.game_decks 
    WHERE session_id = p_session_id
  )
  UPDATE public.game_decks 
  SET position = shuffled.new_position
  FROM shuffled 
  WHERE game_decks.id = shuffled.id;
  
  -- Update session deck creation flag
  UPDATE public.card_deck_game_sessions 
  SET deck_size = p_deck_size
  WHERE id = p_session_id;
  
END;
$$;

-- Function to draw next card from shuffled deck
CREATE OR REPLACE FUNCTION public.draw_next_deck_card(p_session_id UUID)
RETURNS TABLE(
  card_id UUID,
  category TEXT,
  subcategory TEXT,
  prompt TEXT,
  timer_seconds INTEGER,
  timer_category TEXT,
  difficulty_level INTEGER,
  intimacy_level INTEGER,
  requires_action BOOLEAN,
  requires_physical_presence BOOLEAN,
  mood_tags TEXT[],
  relationship_stage TEXT[],
  response_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_card_record RECORD;
BEGIN
  -- Get next unplayed card from shuffled deck
  SELECT gd.*, dc.*
  INTO next_card_record
  FROM public.game_decks gd
  JOIN public.deck_cards dc ON gd.card_id = dc.id
  WHERE gd.session_id = p_session_id 
    AND gd.is_played = false
    AND gd.skipped = false
  ORDER BY gd.position ASC
  LIMIT 1;
  
  IF next_card_record.id IS NULL THEN
    -- No more cards available
    RETURN;
  END IF;
  
  -- Mark card as current in session
  UPDATE public.card_deck_game_sessions 
  SET current_card_id = next_card_record.card_id,
      current_card_revealed = false,
      current_card_started_at = now()
  WHERE id = p_session_id;
  
  -- Mark card as played in deck
  UPDATE public.game_decks 
  SET is_played = true, played_at = now()
  WHERE id = next_card_record.id;
  
  -- Return card data
  RETURN QUERY SELECT 
    next_card_record.card_id,
    next_card_record.category,
    next_card_record.subcategory,
    next_card_record.prompt,
    next_card_record.timer_seconds,
    next_card_record.timer_category,
    next_card_record.difficulty_level,
    next_card_record.intimacy_level,
    next_card_record.requires_action,
    next_card_record.requires_physical_presence,
    next_card_record.mood_tags,
    next_card_record.relationship_stage,
    next_card_record.response_type;
END;
$$;