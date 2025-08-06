-- Drop the couple_cards table and related data
DROP TABLE IF EXISTS public.couple_cards CASCADE;

-- Remove any card responses related to couple cards
DELETE FROM public.card_responses WHERE card_id NOT IN (
  SELECT id FROM public.game_cards
);

-- Remove any game sessions that were using couple card games
DELETE FROM public.game_sessions WHERE game_id IS NULL;