-- Fix function conflicts and complete relationship games schema

-- Drop existing function to recreate with correct signature
DROP FUNCTION IF EXISTS public.create_shuffled_deck(uuid, integer);

-- Add missing columns to card_deck_game_sessions
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

-- Recreate enhanced database function for creating shuffled deck
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