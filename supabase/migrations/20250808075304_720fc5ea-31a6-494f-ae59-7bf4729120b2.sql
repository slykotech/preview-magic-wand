-- Add column to track rematch session for automatic redirection
ALTER TABLE public.card_deck_game_sessions 
ADD COLUMN rematch_session_id UUID;