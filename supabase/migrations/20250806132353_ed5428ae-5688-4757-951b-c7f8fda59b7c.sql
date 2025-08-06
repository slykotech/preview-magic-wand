-- Remove any remaining foreign key constraints that might be causing issues
ALTER TABLE card_responses DROP CONSTRAINT IF EXISTS fk_card_responses_card;
ALTER TABLE card_responses DROP CONSTRAINT IF EXISTS card_responses_card_id_fkey;

-- Set replica identity to full for complete row data (if not already set)
ALTER TABLE card_responses REPLICA IDENTITY FULL;

-- Create a better RLS policy for viewing responses across game types
DROP POLICY IF EXISTS "Couple members can view card responses for their sessions" ON card_responses;

CREATE POLICY "Couple members can view all card responses for their games" 
ON card_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM card_deck_game_sessions cdgs
    JOIN couples c ON cdgs.couple_id = c.id
    WHERE cdgs.id = card_responses.session_id 
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM game_sessions gs
    JOIN couples c ON gs.couple_id = c.id
    WHERE gs.id = card_responses.session_id 
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);