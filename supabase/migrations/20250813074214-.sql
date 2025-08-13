-- Fix game status validation to handle rematch_started status

-- Update the draw_card_for_session function to handle rematch_started status
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
  -- Get session info with row lock to prevent race conditions
  SELECT * INTO session_record 
  FROM public.card_deck_game_sessions 
  WHERE id = p_session_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  -- Check if session is active or rematch_started (both should work)
  IF session_record.status NOT IN ('active', 'rematch_started') THEN
    RETURN json_build_object('error', 'Game is not active');
  END IF;
  
  -- Auto-convert rematch_started to active when first card is drawn
  IF session_record.status = 'rematch_started' THEN
    UPDATE public.card_deck_game_sessions 
    SET status = 'active',
        last_activity_at = now()
    WHERE id = p_session_id;
    session_record.status := 'active';
  END IF;
  
  -- Check if it's the user's turn
  IF session_record.current_turn != p_user_id THEN
    RETURN json_build_object('error', 'Not your turn');
  END IF;
  
  -- If there's already a current card that hasn't been completed, return it
  IF session_record.current_card_id IS NOT NULL AND session_record.current_card_completed = false THEN
    SELECT * INTO card_record 
    FROM public.deck_cards 
    WHERE id = session_record.current_card_id;
    
    IF FOUND THEN
      RETURN json_build_object(
        'success', true,
        'card', json_build_object(
          'id', card_record.id,
          'category', card_record.category,
          'subcategory', card_record.subcategory,
          'prompt', card_record.prompt,
          'timer_seconds', card_record.timer_seconds,
          'timer_category', card_record.timer_category,
          'difficulty_level', card_record.difficulty_level,
          'intimacy_level', card_record.intimacy_level,
          'requires_action', card_record.requires_action,
          'requires_physical_presence', card_record.requires_physical_presence,
          'mood_tags', card_record.mood_tags,
          'relationship_stage', card_record.relationship_stage,
          'response_type', card_record.response_type
        ),
        'session_updated', false
      );
    END IF;
  END IF;
  
  -- Get played cards array safely
  updated_played_cards := COALESCE(session_record.played_cards, '[]'::jsonb);
  
  -- Get available cards (not in played_cards and active)
  SELECT array_agg(id) INTO available_cards
  FROM public.deck_cards 
  WHERE is_active = true 
    AND (
      jsonb_array_length(updated_played_cards) = 0 
      OR id NOT IN (
        SELECT (jsonb_array_elements_text(updated_played_cards))::uuid
      )
    );
  
  -- Check if we have cards available
  IF available_cards IS NULL OR array_length(available_cards, 1) = 0 THEN
    -- No more cards, end the game
    UPDATE public.card_deck_game_sessions 
    SET status = 'completed',
        completed_at = now(),
        win_reason = 'deck_empty'
    WHERE id = p_session_id;
    
    RETURN json_build_object('error', 'No more cards available');
  END IF;
  
  -- Select random card
  selected_card_id := available_cards[1 + floor(random() * array_length(available_cards, 1))::int];
  
  -- Get card details
  SELECT * INTO card_record 
  FROM public.deck_cards 
  WHERE id = selected_card_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Selected card not found');
  END IF;
  
  -- Update session with new card
  UPDATE public.card_deck_game_sessions 
  SET current_card_id = selected_card_id,
      current_card_revealed = false,
      current_card_completed = false,
      current_card_started_at = now(),
      last_activity_at = now()
  WHERE id = p_session_id;
  
  -- Update card usage count
  UPDATE public.deck_cards 
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = selected_card_id;
  
  result := json_build_object(
    'success', true,
    'card', json_build_object(
      'id', card_record.id,
      'category', card_record.category,
      'subcategory', card_record.subcategory,
      'prompt', card_record.prompt,
      'timer_seconds', card_record.timer_seconds,
      'timer_category', card_record.timer_category,
      'difficulty_level', card_record.difficulty_level,
      'intimacy_level', card_record.intimacy_level,
      'requires_action', card_record.requires_action,
      'requires_physical_presence', card_record.requires_physical_presence,
      'mood_tags', card_record.mood_tags,
      'relationship_stage', card_record.relationship_stage,
      'response_type', card_record.response_type
    ),
    'session_updated', true
  );
  
  RETURN result;
END;
$function$;

-- Update complete_card_turn function to handle rematch_started status
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
  max_failed integer;
  updated_played_cards JSONB;
  result json;
BEGIN
  -- Get session info with row lock
  SELECT * INTO session_record 
  FROM public.card_deck_game_sessions 
  WHERE id = p_session_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  -- Check if session is active or rematch_started (both should work)
  IF session_record.status NOT IN ('active', 'rematch_started') THEN
    RETURN json_build_object('error', 'Game is not active');
  END IF;
  
  -- Auto-convert rematch_started to active
  IF session_record.status = 'rematch_started' THEN
    UPDATE public.card_deck_game_sessions 
    SET status = 'active'
    WHERE id = p_session_id;
  END IF;
  
  -- Check if it's the user's turn
  IF session_record.current_turn != p_user_id THEN
    RETURN json_build_object('error', 'Not your turn');
  END IF;
  
  -- Check if there's a current card
  IF session_record.current_card_id IS NULL THEN
    RETURN json_build_object('error', 'No current card to complete');
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
      time_taken_seconds,
      completed_on_time,
      response_type
    ) VALUES (
      p_session_id,
      session_record.current_card_id,
      p_user_id,
      p_response_text,
      p_response_photo_url,
      p_response_photo_caption,
      p_response_time_seconds,
      NOT p_timed_out,
      CASE 
        WHEN p_response_photo_url IS NOT NULL THEN 'photo'::text
        ELSE 'text'::text
      END
    );
  END IF;
  
  -- Add current card to played cards
  updated_played_cards := COALESCE(session_record.played_cards, '[]'::jsonb);
  updated_played_cards := updated_played_cards || jsonb_build_array(session_record.current_card_id);
  
  -- Handle failed task if timed out
  IF p_timed_out THEN
    IF p_user_id = session_record.user1_id THEN
      failed_tasks_count := COALESCE(session_record.user1_failed_tasks, 0) + 1;
      max_failed := COALESCE(session_record.max_failed_tasks, 3);
      
      -- Check if game should end due to failed tasks
      IF failed_tasks_count >= max_failed THEN
        UPDATE public.card_deck_game_sessions 
        SET status = 'completed',
            completed_at = now(),
            winner_id = partner_id,
            win_reason = 'too_many_failed_tasks',
            user1_failed_tasks = failed_tasks_count,
            played_cards = updated_played_cards,
            current_card_id = NULL,
            current_card_completed = true,
            last_activity_at = now()
        WHERE id = p_session_id;
        
        RETURN json_build_object('success', true, 'game_ended', true, 'reason', 'too_many_failed_tasks');
      END IF;
      
      -- Update failed tasks and switch turns
      UPDATE public.card_deck_game_sessions 
      SET current_turn = partner_id,
          current_card_id = NULL,
          current_card_completed = true,
          user1_failed_tasks = failed_tasks_count,
          played_cards = updated_played_cards,
          total_cards_played = total_cards_played + 1,
          last_activity_at = now()
      WHERE id = p_session_id;
    ELSE
      failed_tasks_count := COALESCE(session_record.user2_failed_tasks, 0) + 1;
      max_failed := COALESCE(session_record.max_failed_tasks, 3);
      
      -- Check if game should end due to failed tasks
      IF failed_tasks_count >= max_failed THEN
        UPDATE public.card_deck_game_sessions 
        SET status = 'completed',
            completed_at = now(),
            winner_id = partner_id,
            win_reason = 'too_many_failed_tasks',
            user2_failed_tasks = failed_tasks_count,
            played_cards = updated_played_cards,
            current_card_id = NULL,
            current_card_completed = true,
            last_activity_at = now()
        WHERE id = p_session_id;
        
        RETURN json_build_object('success', true, 'game_ended', true, 'reason', 'too_many_failed_tasks');
      END IF;
      
      -- Update failed tasks and switch turns
      UPDATE public.card_deck_game_sessions 
      SET current_turn = partner_id,
          current_card_id = NULL,
          current_card_completed = true,
          user2_failed_tasks = failed_tasks_count,
          played_cards = updated_played_cards,
          total_cards_played = total_cards_played + 1,
          last_activity_at = now()
      WHERE id = p_session_id;
    END IF;
  ELSE
    -- Normal completion - switch turns
    UPDATE public.card_deck_game_sessions 
    SET current_turn = partner_id,
        current_card_id = NULL,
        current_card_completed = true,
        played_cards = updated_played_cards,
        total_cards_played = total_cards_played + 1,
        last_response_text = p_response_text,
        last_response_photo_url = p_response_photo_url,
        last_response_photo_caption = p_response_photo_caption,
        last_response_author_id = p_user_id,
        last_response_timestamp = now(),
        last_response_seen = false,
        last_activity_at = now()
    WHERE id = p_session_id;
  END IF;
  
  result := json_build_object(
    'success', true,
    'cards_played', jsonb_array_length(updated_played_cards),
    'partner_turn', true
  );
  
  RETURN result;
END;
$function$;

-- Update skip_card_turn function to handle rematch_started status
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
  updated_skipped_cards JSONB;
  updated_played_cards JSONB;
  result json;
BEGIN
  -- Get session info with row lock
  SELECT * INTO session_record 
  FROM public.card_deck_game_sessions 
  WHERE id = p_session_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  -- Check if session is active or rematch_started (both should work)
  IF session_record.status NOT IN ('active', 'rematch_started') THEN
    RETURN json_build_object('error', 'Game is not active');
  END IF;
  
  -- Auto-convert rematch_started to active
  IF session_record.status = 'rematch_started' THEN
    UPDATE public.card_deck_game_sessions 
    SET status = 'active'
    WHERE id = p_session_id;
  END IF;
  
  -- Check if it's the user's turn
  IF session_record.current_turn != p_user_id THEN
    RETURN json_build_object('error', 'Not your turn');
  END IF;
  
  -- Check if there's a current card
  IF session_record.current_card_id IS NULL THEN
    RETURN json_build_object('error', 'No current card to skip');
  END IF;
  
  -- Check skips remaining
  IF p_user_id = session_record.user1_id THEN
    skips_remaining := COALESCE(session_record.user1_skips_remaining, 0);
  ELSE
    skips_remaining := COALESCE(session_record.user2_skips_remaining, 0);
  END IF;
  
  IF skips_remaining <= 0 THEN
    RETURN json_build_object('error', 'No skips remaining');
  END IF;
  
  -- Determine partner
  partner_id := CASE 
    WHEN session_record.user1_id = p_user_id THEN session_record.user2_id
    ELSE session_record.user1_id
  END;
  
  -- Add current card to skipped cards
  updated_skipped_cards := COALESCE(session_record.skipped_cards, '[]'::jsonb);
  updated_skipped_cards := updated_skipped_cards || jsonb_build_array(session_record.current_card_id);
  
  -- Add to played cards too (so it doesn't get drawn again)
  updated_played_cards := COALESCE(session_record.played_cards, '[]'::jsonb);
  updated_played_cards := updated_played_cards || jsonb_build_array(session_record.current_card_id);
  
  -- Update session and decrease skips
  IF p_user_id = session_record.user1_id THEN
    UPDATE public.card_deck_game_sessions 
    SET current_turn = partner_id,
        current_card_id = NULL,
        current_card_completed = true,
        user1_skips_remaining = user1_skips_remaining - 1,
        skipped_cards = updated_skipped_cards,
        played_cards = updated_played_cards,
        total_cards_played = total_cards_played + 1,
        last_activity_at = now()
    WHERE id = p_session_id;
    
    skips_remaining := skips_remaining - 1;
  ELSE
    UPDATE public.card_deck_game_sessions 
    SET current_turn = partner_id,
        current_card_id = NULL,
        current_card_completed = true,
        user2_skips_remaining = user2_skips_remaining - 1,
        skipped_cards = updated_skipped_cards,
        played_cards = updated_played_cards,
        total_cards_played = total_cards_played + 1,
        last_activity_at = now()
    WHERE id = p_session_id;
    
    skips_remaining := skips_remaining - 1;
  END IF;
  
  result := json_build_object(
    'success', true,
    'skips_remaining', skips_remaining,
    'partner_turn', true
  );
  
  RETURN result;
END;
$function$;