-- Drop existing functions and recreate them with proper signatures
DROP FUNCTION IF EXISTS public.complete_card_turn(uuid,uuid,text,text,text,integer,boolean);
DROP FUNCTION IF EXISTS public.skip_card_turn(uuid,uuid);
DROP FUNCTION IF EXISTS public.draw_card_for_session(uuid,uuid);

-- Function to draw a card for a session
CREATE OR REPLACE FUNCTION public.draw_card_for_session(p_session_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
  SELECT COALESCE(played_cards, '[]'::jsonb) INTO updated_played_cards
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

-- Function to complete a card turn
CREATE OR REPLACE FUNCTION public.complete_card_turn(
  p_session_id uuid, 
  p_user_id uuid, 
  p_response_text text DEFAULT NULL,
  p_response_photo_url text DEFAULT NULL,
  p_response_photo_caption text DEFAULT NULL,
  p_response_time_seconds integer DEFAULT NULL,
  p_timed_out boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
  partner_id uuid;
  failed_tasks_count integer;
  result json;
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
  
  -- Determine partner
  partner_id := CASE 
    WHEN session_record.user1_id = p_user_id THEN session_record.user2_id
    ELSE session_record.user1_id
  END;
  
  -- Insert response if provided
  IF p_response_text IS NOT NULL OR p_response_photo_url IS NOT NULL THEN
    INSERT INTO public.card_responses (
      session_id,
      card_id,
      user_id,
      response_text,
      response_photo_url,
      response_photo_caption,
      response_time_seconds,
      completed_on_time
    ) VALUES (
      p_session_id,
      session_record.current_card_id,
      p_user_id,
      p_response_text,
      p_response_photo_url,
      p_response_photo_caption,
      p_response_time_seconds,
      NOT p_timed_out
    );
  END IF;
  
  -- Handle failed task if timed out
  IF p_timed_out THEN
    IF p_user_id = session_record.user1_id THEN
      failed_tasks_count := COALESCE(session_record.user1_failed_tasks, 0) + 1;
      UPDATE public.card_deck_game_sessions
      SET user1_failed_tasks = failed_tasks_count
      WHERE id = p_session_id;
    ELSE
      failed_tasks_count := COALESCE(session_record.user2_failed_tasks, 0) + 1;
      UPDATE public.card_deck_game_sessions
      SET user2_failed_tasks = failed_tasks_count
      WHERE id = p_session_id;
    END IF;
    
    -- Check if max failed tasks reached
    IF failed_tasks_count >= COALESCE(session_record.max_failed_tasks, 3) THEN
      UPDATE public.card_deck_game_sessions
      SET 
        status = 'completed',
        winner_id = partner_id,
        win_reason = 'max_failed_tasks',
        completed_at = now()
      WHERE id = p_session_id;
      
      RETURN json_build_object('game_ended', true, 'winner_id', partner_id, 'reason', 'max_failed_tasks');
    END IF;
  END IF;
  
  -- Update session state - switch turns and clear current card
  UPDATE public.card_deck_game_sessions
  SET 
    current_turn = partner_id,
    current_card_id = NULL,
    current_card_revealed = false,
    current_card_completed = true,
    last_response_text = p_response_text,
    last_response_photo_url = p_response_photo_url,
    last_response_photo_caption = p_response_photo_caption,
    last_response_author_id = p_user_id,
    last_response_timestamp = now(),
    last_response_seen = false,
    last_activity_at = now()
  WHERE id = p_session_id;
  
  result := json_build_object(
    'success', true,
    'next_player', partner_id,
    'timed_out', p_timed_out
  );
  
  RETURN result;
END;
$function$;

-- Function to skip a card
CREATE OR REPLACE FUNCTION public.skip_card_turn(p_session_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
  partner_id uuid;
  skips_remaining integer;
  result json;
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
  
  -- Check remaining skips
  IF p_user_id = session_record.user1_id THEN
    skips_remaining := COALESCE(session_record.user1_skips_remaining, 0);
  ELSE
    skips_remaining := COALESCE(session_record.user2_skips_remaining, 0);
  END IF;
  
  IF skips_remaining <= 0 THEN
    RETURN json_build_object('error', 'No skips remaining');
  END IF;
  
  -- Update skips and add to skipped cards
  IF p_user_id = session_record.user1_id THEN
    UPDATE public.card_deck_game_sessions
    SET 
      user1_skips_remaining = user1_skips_remaining - 1,
      skipped_cards = skipped_cards || to_jsonb(current_card_id)
    WHERE id = p_session_id;
    skips_remaining := skips_remaining - 1;
  ELSE
    UPDATE public.card_deck_game_sessions
    SET 
      user2_skips_remaining = user2_skips_remaining - 1,
      skipped_cards = skipped_cards || to_jsonb(current_card_id)
    WHERE id = p_session_id;
    skips_remaining := skips_remaining - 1;
  END IF;
  
  -- Determine partner
  partner_id := CASE 
    WHEN session_record.user1_id = p_user_id THEN session_record.user2_id
    ELSE session_record.user1_id
  END;
  
  -- Switch turns and clear current card
  UPDATE public.card_deck_game_sessions
  SET 
    current_turn = partner_id,
    current_card_id = NULL,
    current_card_revealed = false,
    last_activity_at = now()
  WHERE id = p_session_id;
  
  result := json_build_object(
    'success', true,
    'skips_remaining', skips_remaining,
    'next_player', partner_id
  );
  
  RETURN result;
END;
$function$;