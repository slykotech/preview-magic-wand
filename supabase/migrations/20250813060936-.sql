-- Enable realtime for game tables
ALTER TABLE public.card_deck_game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.tic_toe_heart_games REPLICA IDENTITY FULL;
ALTER TABLE public.card_responses REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_deck_game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tic_toe_heart_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_responses;

-- Create RPC functions for better game state management
CREATE OR REPLACE FUNCTION public.reveal_card(p_session_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update card reveal state
  UPDATE public.card_deck_game_sessions
  SET 
    current_card_revealed = true,
    last_activity_at = now()
  WHERE id = p_session_id 
    AND current_turn = p_user_id;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session or not your turn';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_card_turn(
  p_session_id uuid,
  p_user_id uuid,
  p_response_text text DEFAULT NULL,
  p_response_photo_url text DEFAULT NULL,
  p_response_photo_caption text DEFAULT NULL,
  p_response_time_seconds integer DEFAULT NULL,
  p_timed_out boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
  partner_id uuid;
  current_failed_tasks integer := 0;
  max_failed_tasks integer := 3;
BEGIN
  -- Get session info
  SELECT * INTO session_record 
  FROM public.card_deck_game_sessions 
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  -- Check if it's the user's turn
  IF session_record.current_turn != p_user_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;
  
  -- Determine partner ID
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
  
  -- Update failed tasks if timed out
  IF p_timed_out THEN
    IF p_user_id = session_record.user1_id THEN
      current_failed_tasks := COALESCE(session_record.user1_failed_tasks, 0) + 1;
      UPDATE public.card_deck_game_sessions
      SET user1_failed_tasks = current_failed_tasks
      WHERE id = p_session_id;
    ELSE
      current_failed_tasks := COALESCE(session_record.user2_failed_tasks, 0) + 1;
      UPDATE public.card_deck_game_sessions
      SET user2_failed_tasks = current_failed_tasks
      WHERE id = p_session_id;
    END IF;
    
    -- Check if game should end due to too many failed tasks
    IF current_failed_tasks >= max_failed_tasks THEN
      UPDATE public.card_deck_game_sessions
      SET 
        status = 'completed',
        winner_id = partner_id,
        win_reason = 'max_failed_tasks',
        completed_at = now(),
        current_turn = NULL,
        current_card_id = NULL
      WHERE id = p_session_id;
      RETURN;
    END IF;
  END IF;
  
  -- Switch turn and clear current card
  UPDATE public.card_deck_game_sessions
  SET 
    current_turn = partner_id,
    current_card_id = NULL,
    current_card_revealed = false,
    current_card_completed = true,
    current_card_responded_at = CASE WHEN NOT p_timed_out THEN now() ELSE NULL END,
    last_response_text = p_response_text,
    last_response_photo_url = p_response_photo_url,
    last_response_photo_caption = p_response_photo_caption,
    last_response_author_id = p_user_id,
    last_response_timestamp = now(),
    last_response_seen = false,
    last_activity_at = now()
  WHERE id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.skip_card_turn(p_session_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
  partner_id uuid;
  current_skips integer := 0;
  updated_skipped_cards jsonb;
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
    current_skips := COALESCE(session_record.user1_skips_remaining, 0);
  ELSE
    current_skips := COALESCE(session_record.user2_skips_remaining, 0);
  END IF;
  
  IF current_skips <= 0 THEN
    RETURN json_build_object('error', 'No skips remaining');
  END IF;
  
  -- Determine partner ID
  partner_id := CASE 
    WHEN session_record.user1_id = p_user_id THEN session_record.user2_id 
    ELSE session_record.user1_id 
  END;
  
  -- Update skipped cards
  updated_skipped_cards := COALESCE(session_record.skipped_cards::jsonb, '[]'::jsonb);
  IF session_record.current_card_id IS NOT NULL THEN
    updated_skipped_cards := updated_skipped_cards || to_jsonb(session_record.current_card_id);
  END IF;
  
  -- Update session
  IF p_user_id = session_record.user1_id THEN
    UPDATE public.card_deck_game_sessions
    SET 
      user1_skips_remaining = current_skips - 1,
      current_turn = partner_id,
      current_card_id = NULL,
      current_card_revealed = false,
      skipped_cards = updated_skipped_cards,
      last_activity_at = now()
    WHERE id = p_session_id;
  ELSE
    UPDATE public.card_deck_game_sessions
    SET 
      user2_skips_remaining = current_skips - 1,
      current_turn = partner_id,
      current_card_id = NULL,
      current_card_revealed = false,
      skipped_cards = updated_skipped_cards,
      last_activity_at = now()
    WHERE id = p_session_id;
  END IF;
  
  result := json_build_object(
    'success', true,
    'skips_remaining', current_skips - 1
  );
  
  RETURN result;
END;
$$;