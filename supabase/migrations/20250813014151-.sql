-- Fix RLS for tables missing it
-- Enable RLS on any tables that might be missing it

-- Check if spatial_ref_sys needs RLS (PostGIS table)
ALTER TABLE IF EXISTS spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy for spatial_ref_sys if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spatial_ref_sys' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Spatial reference data viewable by authenticated users" ON spatial_ref_sys;
    CREATE POLICY "Spatial reference data viewable by authenticated users" 
      ON spatial_ref_sys FOR SELECT 
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Fix function security by adding SET search_path = '' to our RPC functions
CREATE OR REPLACE FUNCTION public.start_card_deck_game(p_couple_id uuid, p_user1_id uuid, p_user2_id uuid, p_game_mode text DEFAULT 'classic'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  new_session_id UUID;
  first_player UUID;
  result JSON;
BEGIN
  -- Randomly select first player
  first_player := CASE WHEN random() < 0.5 THEN p_user1_id ELSE p_user2_id END;
  
  -- Create new game session
  INSERT INTO public.card_deck_game_sessions (
    couple_id,
    user1_id, 
    user2_id,
    current_turn,
    game_mode,
    status
  ) VALUES (
    p_couple_id,
    p_user1_id,
    p_user2_id, 
    first_player,
    p_game_mode,
    'active'
  ) RETURNING id INTO new_session_id;
  
  result := json_build_object(
    'session_id', new_session_id,
    'current_turn', first_player,
    'status', 'active'
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.draw_card_for_session(p_session_id uuid, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
  available_cards UUID[];
  selected_card_id UUID;
  card_record public.deck_cards%ROWTYPE;
  updated_played_cards JSONB;
  result JSON;
BEGIN
  -- Get session info
  SELECT * INTO session_record 
  FROM public.card_deck_game_sessions 
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  -- Check if it's the user's turn
  IF session_record.current_turn != p_user_id THEN
    RETURN json_build_object('error', 'Not your turn');
  END IF;
  
  -- Get played cards array
  SELECT COALESCE(played_cards::jsonb, '[]'::jsonb) INTO updated_played_cards
  FROM public.card_deck_game_sessions
  WHERE id = p_session_id;
  
  -- Get available cards (not in played_cards)
  SELECT array_agg(id) INTO available_cards
  FROM public.deck_cards 
  WHERE is_active = true 
    AND id NOT IN (
      SELECT jsonb_array_elements_text(updated_played_cards)::uuid
    );
  
  IF array_length(available_cards, 1) = 0 THEN
    RETURN json_build_object('error', 'No more cards available');
  END IF;
  
  -- Randomly select a card
  selected_card_id := available_cards[1 + floor(random() * array_length(available_cards, 1))];
  
  -- Get card details
  SELECT * INTO card_record
  FROM public.deck_cards
  WHERE id = selected_card_id;
  
  -- Add to played cards
  updated_played_cards := updated_played_cards || to_jsonb(selected_card_id);
  
  -- Update session
  UPDATE public.card_deck_game_sessions
  SET 
    current_card_id = selected_card_id,
    played_cards = updated_played_cards,
    total_cards_played = jsonb_array_length(updated_played_cards),
    current_card_revealed = false,
    current_card_started_at = now(),
    last_activity_at = now()
  WHERE id = p_session_id;
  
  result := json_build_object(
    'card_id', selected_card_id,
    'prompt', card_record.prompt,
    'response_type', card_record.response_type,
    'timer_seconds', card_record.timer_seconds,
    'total_cards_played', jsonb_array_length(updated_played_cards)
  );
  
  RETURN result;
END;
$function$;