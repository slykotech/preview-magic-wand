-- Fix remaining RPC functions by adding SET search_path = ''

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
SET search_path = ''
AS $function$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
  current_card public.deck_cards%ROWTYPE;
  next_turn_user_id uuid;
  is_failed_task boolean := false;
  new_user1_failed_tasks integer;
  new_user2_failed_tasks integer;
  available_cards uuid[];
  next_card_id uuid;
  result json;
BEGIN
  -- Get session and validate user's turn
  SELECT * INTO session_record
  FROM public.card_deck_game_sessions 
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  IF session_record.current_turn != p_user_id THEN
    RETURN json_build_object('error', 'Not your turn');
  END IF;
  
  -- Get current card
  SELECT * INTO current_card
  FROM public.deck_cards
  WHERE id = session_record.current_card_id;
  
  -- Determine if this is a failed task
  IF p_timed_out THEN
    is_failed_task := true;
  ELSIF current_card.response_type IN ('text', 'photo') AND (p_response_text IS NULL AND p_response_photo_url IS NULL) THEN
    is_failed_task := true;
  END IF;
  
  -- Save response if provided and not failed
  IF NOT is_failed_task AND (p_response_text IS NOT NULL OR p_response_photo_url IS NOT NULL) THEN
    INSERT INTO public.card_responses (
      session_id,
      card_id,
      user_id,
      response_text,
      response_type,
      time_taken_seconds,
      completed_on_time,
      response_photo_url,
      response_photo_caption
    ) VALUES (
      p_session_id,
      session_record.current_card_id,
      p_user_id,
      p_response_text,
      current_card.response_type,
      p_response_time_seconds,
      NOT p_timed_out,
      p_response_photo_url,
      p_response_photo_caption
    );
  END IF;
  
  -- Calculate new failed task counts
  new_user1_failed_tasks := session_record.user1_failed_tasks;
  new_user2_failed_tasks := session_record.user2_failed_tasks;
  
  IF is_failed_task THEN
    IF p_user_id = session_record.user1_id THEN
      new_user1_failed_tasks := new_user1_failed_tasks + 1;
    ELSE
      new_user2_failed_tasks := new_user2_failed_tasks + 1;
    END IF;
  END IF;
  
  -- Check for game over due to failed tasks
  IF new_user1_failed_tasks >= session_record.max_failed_tasks OR new_user2_failed_tasks >= session_record.max_failed_tasks THEN
    -- End game
    UPDATE public.card_deck_game_sessions
    SET 
      status = 'completed',
      completed_at = now(),
      winner_id = CASE 
        WHEN new_user1_failed_tasks >= session_record.max_failed_tasks THEN session_record.user2_id
        ELSE session_record.user1_id
      END,
      win_reason = CASE 
        WHEN p_timed_out THEN 'opponent_timeout_failure'
        ELSE 'opponent_failed_tasks'
      END,
      user1_failed_tasks = new_user1_failed_tasks,
      user2_failed_tasks = new_user2_failed_tasks,
      last_activity_at = now()
    WHERE id = p_session_id;
    
    RETURN json_build_object('game_ended', true, 'reason', 'max_failures_reached');
  END IF;
  
  -- Switch turns and draw next card
  next_turn_user_id := CASE 
    WHEN session_record.current_turn = session_record.user1_id THEN session_record.user2_id
    ELSE session_record.user1_id
  END;
  
  -- Get next available card
  SELECT array_agg(id) INTO available_cards
  FROM public.deck_cards 
  WHERE is_active = true 
    AND id NOT IN (
      SELECT jsonb_array_elements_text(COALESCE(session_record.played_cards, '[]'::jsonb))::uuid
    );
  
  IF array_length(available_cards, 1) > 0 THEN
    next_card_id := available_cards[1 + floor(random() * array_length(available_cards, 1))];
    
    -- Update session with next card and turn
    UPDATE public.card_deck_game_sessions
    SET 
      current_turn = next_turn_user_id,
      current_card_id = next_card_id,
      current_card_revealed = false,
      current_card_started_at = now(),
      played_cards = COALESCE(played_cards, '[]'::jsonb) || to_jsonb(next_card_id),
      total_cards_played = total_cards_played + 1,
      user1_failed_tasks = new_user1_failed_tasks,
      user2_failed_tasks = new_user2_failed_tasks,
      last_activity_at = now()
    WHERE id = p_session_id;
  ELSE
    -- No more cards, end game
    UPDATE public.card_deck_game_sessions
    SET 
      status = 'completed',
      completed_at = now(),
      current_card_id = NULL,
      user1_failed_tasks = new_user1_failed_tasks,
      user2_failed_tasks = new_user2_failed_tasks,
      last_activity_at = now()
    WHERE id = p_session_id;
  END IF;
  
  result := json_build_object(
    'success', true,
    'next_turn', next_turn_user_id,
    'next_card_id', next_card_id,
    'game_completed', next_card_id IS NULL
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.skip_card_turn(p_session_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
  current_user_skips integer;
  new_user1_skips integer;
  new_user2_skips integer;
  next_turn_user_id uuid;
  available_cards uuid[];
  next_card_id uuid;
  result json;
BEGIN
  -- Get session and validate user's turn
  SELECT * INTO session_record
  FROM public.card_deck_game_sessions 
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  IF session_record.current_turn != p_user_id THEN
    RETURN json_build_object('error', 'Not your turn');
  END IF;
  
  -- Check current user's skips
  current_user_skips := CASE 
    WHEN p_user_id = session_record.user1_id THEN session_record.user1_skips_remaining
    ELSE session_record.user2_skips_remaining
  END;
  
  IF current_user_skips <= 0 THEN
    RETURN json_build_object('error', 'No skips remaining');
  END IF;
  
  -- Calculate new skip counts
  new_user1_skips := CASE 
    WHEN p_user_id = session_record.user1_id THEN session_record.user1_skips_remaining - 1
    ELSE session_record.user1_skips_remaining
  END;
  
  new_user2_skips := CASE 
    WHEN p_user_id = session_record.user2_id THEN session_record.user2_skips_remaining - 1
    ELSE session_record.user2_skips_remaining
  END;
  
  -- Add current card to skipped cards
  UPDATE public.card_deck_game_sessions
  SET skipped_cards = COALESCE(skipped_cards, '[]'::jsonb) || to_jsonb(current_card_id)
  WHERE id = p_session_id;
  
  -- Switch turns
  next_turn_user_id := CASE 
    WHEN session_record.current_turn = session_record.user1_id THEN session_record.user2_id
    ELSE session_record.user1_id
  END;
  
  -- Get next available card
  SELECT array_agg(id) INTO available_cards
  FROM public.deck_cards 
  WHERE is_active = true 
    AND id NOT IN (
      SELECT jsonb_array_elements_text(COALESCE(session_record.played_cards, '[]'::jsonb))::uuid
    );
  
  IF array_length(available_cards, 1) > 0 THEN
    next_card_id := available_cards[1 + floor(random() * array_length(available_cards, 1))];
    
    -- Update session with next card and turn
    UPDATE public.card_deck_game_sessions
    SET 
      current_turn = next_turn_user_id,
      current_card_id = next_card_id,
      current_card_revealed = false,
      current_card_started_at = now(),
      played_cards = COALESCE(played_cards, '[]'::jsonb) || to_jsonb(next_card_id),
      user1_skips_remaining = new_user1_skips,
      user2_skips_remaining = new_user2_skips,
      last_activity_at = now()
    WHERE id = p_session_id;
  ELSE
    -- No more cards, end game
    UPDATE public.card_deck_game_sessions
    SET 
      status = 'completed',
      completed_at = now(),
      current_card_id = NULL,
      user1_skips_remaining = new_user1_skips,
      user2_skips_remaining = new_user2_skips,
      last_activity_at = now()
    WHERE id = p_session_id;
  END IF;
  
  result := json_build_object(
    'success', true,
    'skips_remaining', CASE 
      WHEN p_user_id = session_record.user1_id THEN new_user1_skips
      ELSE new_user2_skips
    END,
    'next_turn', next_turn_user_id,
    'next_card_id', next_card_id
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reveal_card(p_session_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
BEGIN
  -- Get session and validate user's turn
  SELECT * INTO session_record
  FROM public.card_deck_game_sessions 
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  IF session_record.current_turn != p_user_id THEN
    RETURN json_build_object('error', 'Not your turn');
  END IF;
  
  -- Update card revealed status
  UPDATE public.card_deck_game_sessions
  SET 
    current_card_revealed = true,
    current_card_started_at = now(),
    last_activity_at = now()
  WHERE id = p_session_id;
  
  RETURN json_build_object('success', true, 'revealed', true);
END;
$function$;