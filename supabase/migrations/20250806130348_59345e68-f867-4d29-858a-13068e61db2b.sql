-- Fix RLS policies for card_responses table to work with card deck games

-- Drop the existing incorrect policy
DROP POLICY IF EXISTS "Couple members can view card responses for their sessions" ON public.card_responses;

-- Create a new policy that works with both game_sessions and card_deck_game_sessions
CREATE POLICY "Couple members can view card responses for their sessions" ON public.card_responses
FOR SELECT USING (
  -- Check if this is a regular game session
  (EXISTS (
    SELECT 1
    FROM (game_sessions gs JOIN couples c ON (gs.couple_id = c.id))
    WHERE gs.id = card_responses.session_id 
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ))
  OR
  -- Check if this is a card deck game session
  (EXISTS (
    SELECT 1
    FROM (card_deck_game_sessions cdgs JOIN couples c ON (cdgs.couple_id = c.id))
    WHERE cdgs.id = card_responses.session_id 
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ))
);

-- Also ensure we have the right policy for card deck game sessions
-- Users in card deck games can insert responses for their sessions
CREATE POLICY "Card deck game members can create responses" ON public.card_responses
FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  AND (EXISTS (
    SELECT 1
    FROM (card_deck_game_sessions cdgs JOIN couples c ON (cdgs.couple_id = c.id))
    WHERE cdgs.id = card_responses.session_id 
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ))
);