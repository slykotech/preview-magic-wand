-- Create RPC functions for unified game management
CREATE OR REPLACE FUNCTION public.reveal_game_card(p_session_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Update card reveal state atomically
  UPDATE public.card_deck_game_sessions
  SET 
    current_card_revealed = true,
    current_card_started_at = now(),
    last_activity_at = now()
  WHERE id = p_session_id 
    AND current_turn = p_user_id;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session or not your turn';
  END IF;
END;
$function$;

-- Enable realtime for all game tables
ALTER TABLE public.card_deck_game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.tic_toe_heart_games REPLICA IDENTITY FULL;
ALTER TABLE public.love_grants REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DO $$
BEGIN
  -- Add tables to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'card_deck_game_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.card_deck_game_sessions;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'tic_toe_heart_games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tic_toe_heart_games;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'love_grants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.love_grants;
  END IF;
END
$$;