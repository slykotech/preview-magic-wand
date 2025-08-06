-- Enable RLS on deck_cards table and create proper policies
ALTER TABLE deck_cards ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read active cards
CREATE POLICY "Anyone can view active cards" 
ON deck_cards 
FOR SELECT 
USING (is_active = true);

-- Also check and fix card_deck_game_sessions RLS if needed
DROP POLICY IF EXISTS "Couple members can view their sessions" ON card_deck_game_sessions;
CREATE POLICY "Couple members can view their sessions" 
ON card_deck_game_sessions 
FOR SELECT 
USING ((auth.uid() = user1_id) OR (auth.uid() = user2_id));

DROP POLICY IF EXISTS "Couple members can update their sessions" ON card_deck_game_sessions;
CREATE POLICY "Couple members can update their sessions" 
ON card_deck_game_sessions 
FOR UPDATE 
USING ((auth.uid() = user1_id) OR (auth.uid() = user2_id));

DROP POLICY IF EXISTS "Couple members can create sessions" ON card_deck_game_sessions;
CREATE POLICY "Couple members can create sessions" 
ON card_deck_game_sessions 
FOR INSERT 
WITH CHECK ((auth.uid() = user1_id) OR (auth.uid() = user2_id));