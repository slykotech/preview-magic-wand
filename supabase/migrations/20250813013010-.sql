-- Card Deck Game RPC Functions

-- Function to start a new card deck game session
CREATE OR REPLACE FUNCTION start_card_deck_game(
  p_couple_id UUID,
  p_user1_id UUID,
  p_user2_id UUID,
  p_game_mode TEXT DEFAULT 'classic'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Function to draw a card for the current player
CREATE OR REPLACE FUNCTION draw_card_for_session(
  p_session_id UUID,
  p_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Function to complete a turn and switch to partner
CREATE OR REPLACE FUNCTION complete_card_turn(
  p_session_id UUID,
  p_user_id UUID,
  p_response_text TEXT DEFAULT NULL,
  p_response_photo_url TEXT DEFAULT NULL,
  p_response_photo_caption TEXT DEFAULT NULL,
  p_response_time_seconds INTEGER DEFAULT NULL,
  p_timed_out BOOLEAN DEFAULT FALSE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = ''
AS $$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
  partner_id UUID;
  current_failed_tasks INTEGER;
  max_failed INTEGER;
  result JSON;
BEGIN
  -- Get session
  SELECT * INTO session_record
  FROM public.card_deck_game_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  -- Check if it's user's turn
  IF session_record.current_turn != p_user_id THEN
    RETURN json_build_object('error', 'Not your turn');
  END IF;
  
  -- Get partner ID
  partner_id := CASE 
    WHEN session_record.user1_id = p_user_id THEN session_record.user2_id
    ELSE session_record.user1_id
  END;
  
  -- Get current failed tasks count
  current_failed_tasks := CASE
    WHEN session_record.user1_id = p_user_id THEN COALESCE(session_record.user1_failed_tasks, 0)
    ELSE COALESCE(session_record.user2_failed_tasks, 0)
  END;
  
  max_failed := COALESCE(session_record.max_failed_tasks, 3);
  
  -- If timed out, increment failed tasks
  IF p_timed_out THEN
    current_failed_tasks := current_failed_tasks + 1;
  END IF;
  
  -- Store response if provided
  IF session_record.current_card_id IS NOT NULL AND (p_response_text IS NOT NULL OR p_response_photo_url IS NOT NULL) THEN
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
  
  -- Check if game should end
  IF current_failed_tasks >= max_failed THEN
    -- Game ends, partner wins
    UPDATE public.card_deck_game_sessions
    SET 
      status = 'completed',
      winner_id = partner_id,
      win_reason = 'Partner failed too many tasks',
      completed_at = now(),
      user1_failed_tasks = CASE WHEN user1_id = p_user_id THEN current_failed_tasks ELSE user1_failed_tasks END,
      user2_failed_tasks = CASE WHEN user2_id = p_user_id THEN current_failed_tasks ELSE user2_failed_tasks END,
      last_activity_at = now()
    WHERE id = p_session_id;
    
    result := json_build_object(
      'game_ended', true,
      'winner_id', partner_id,
      'reason', 'too_many_failed_tasks'
    );
  ELSE
    -- Continue game, switch turns
    UPDATE public.card_deck_game_sessions
    SET 
      current_turn = partner_id,
      current_card_id = NULL,
      current_card_revealed = false,
      current_card_completed = true,
      current_card_response = p_response_text,
      last_response_text = p_response_text,
      last_response_photo_url = p_response_photo_url,
      last_response_photo_caption = p_response_photo_caption,
      last_response_author_id = p_user_id,
      last_response_timestamp = now(),
      last_response_seen = false,
      user1_failed_tasks = CASE WHEN user1_id = p_user_id THEN current_failed_tasks ELSE user1_failed_tasks END,
      user2_failed_tasks = CASE WHEN user2_id = p_user_id THEN current_failed_tasks ELSE user2_failed_tasks END,
      last_activity_at = now()
    WHERE id = p_session_id;
    
    result := json_build_object(
      'turn_completed', true,
      'next_turn', partner_id,
      'failed_tasks', current_failed_tasks
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Function to skip a card
CREATE OR REPLACE FUNCTION skip_card_turn(
  p_session_id UUID,
  p_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
  partner_id UUID;
  current_skips INTEGER;
  max_skips INTEGER;
  skipped_cards_array JSONB;
  result JSON;
BEGIN
  -- Get session
  SELECT * INTO session_record
  FROM public.card_deck_game_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  -- Check if it's user's turn
  IF session_record.current_turn != p_user_id THEN
    RETURN json_build_object('error', 'Not your turn');
  END IF;
  
  -- Get current skips remaining
  current_skips := CASE
    WHEN session_record.user1_id = p_user_id THEN COALESCE(session_record.user1_skips_remaining, 3)
    ELSE COALESCE(session_record.user2_skips_remaining, 3)
  END;
  
  max_skips := COALESCE(session_record.max_skips, 3);
  
  IF current_skips <= 0 THEN
    RETURN json_build_object('error', 'No skips remaining');
  END IF;
  
  -- Get partner ID
  partner_id := CASE 
    WHEN session_record.user1_id = p_user_id THEN session_record.user2_id
    ELSE session_record.user1_id
  END;
  
  -- Add current card to skipped cards
  skipped_cards_array := COALESCE(session_record.skipped_cards::jsonb, '[]'::jsonb);
  IF session_record.current_card_id IS NOT NULL THEN
    skipped_cards_array := skipped_cards_array || to_jsonb(session_record.current_card_id);
  END IF;
  
  -- Update session
  UPDATE public.card_deck_game_sessions
  SET 
    current_turn = partner_id,
    current_card_id = NULL,
    current_card_revealed = false,
    skipped_cards = skipped_cards_array,
    user1_skips_remaining = CASE WHEN user1_id = p_user_id THEN current_skips - 1 ELSE user1_skips_remaining END,
    user2_skips_remaining = CASE WHEN user2_id = p_user_id THEN current_skips - 1 ELSE user2_skips_remaining END,
    last_activity_at = now()
  WHERE id = p_session_id;
  
  result := json_build_object(
    'card_skipped', true,
    'next_turn', partner_id,
    'skips_remaining', current_skips - 1
  );
  
  RETURN result;
END;
$$;

-- Function to reveal a card
CREATE OR REPLACE FUNCTION reveal_card(
  p_session_id UUID,
  p_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_record public.card_deck_game_sessions%ROWTYPE;
  result JSON;
BEGIN
  -- Get session
  SELECT * INTO session_record
  FROM public.card_deck_game_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  -- Check if it's user's turn
  IF session_record.current_turn != p_user_id THEN
    RETURN json_build_object('error', 'Not your turn');
  END IF;
  
  -- Update session to mark card as revealed
  UPDATE public.card_deck_game_sessions
  SET 
    current_card_revealed = true,
    current_card_started_at = COALESCE(current_card_started_at, now()),
    last_activity_at = now()
  WHERE id = p_session_id;
  
  result := json_build_object(
    'card_revealed', true
  );
  
  RETURN result;
END;
$$;