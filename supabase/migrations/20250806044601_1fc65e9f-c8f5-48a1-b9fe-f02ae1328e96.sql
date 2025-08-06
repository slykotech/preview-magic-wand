-- Create couple_card_games table
CREATE TABLE public.couple_card_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  game_type TEXT NOT NULL DEFAULT 'couples_cards',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card_categories table
CREATE TABLE public.card_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create couple_cards table
CREATE TABLE public.couple_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL,
  category_id UUID NOT NULL,
  question TEXT NOT NULL,
  difficulty_level TEXT NOT NULL DEFAULT 'beginner',
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  couple_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card_game_sessions table
CREATE TABLE public.card_game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL,
  game_id UUID NOT NULL,
  session_mode TEXT NOT NULL DEFAULT 'shuffle', -- 'shuffle' or 'category'
  selected_categories UUID[] DEFAULT '{}',
  current_card_id UUID,
  answered_cards UUID[] DEFAULT '{}',
  current_player_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  session_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create card_responses table
CREATE TABLE public.card_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  card_id UUID NOT NULL,
  user_id UUID NOT NULL,
  response_text TEXT,
  emoji_reaction TEXT,
  is_meaningful BOOLEAN DEFAULT false,
  response_time_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card_nudges table
CREATE TABLE public.card_nudges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  message TEXT DEFAULT '👋 Hey, your turn in the card game!',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.couple_card_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_nudges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for couple_card_games
CREATE POLICY "Card games are viewable by authenticated users" 
ON public.couple_card_games 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for card_categories
CREATE POLICY "Card categories are viewable by authenticated users" 
ON public.card_categories 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for couple_cards
CREATE POLICY "Cards are viewable by authenticated users" 
ON public.couple_cards 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create custom cards for their couple" 
ON public.couple_cards 
FOR INSERT 
WITH CHECK (
  is_custom = true 
  AND auth.uid() = created_by 
  AND EXISTS (
    SELECT 1 FROM couples 
    WHERE id = couple_cards.couple_id 
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

-- RLS Policies for card_game_sessions
CREATE POLICY "Couple members can view their card game sessions" 
ON public.card_game_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE id = card_game_sessions.couple_id 
  AND (user1_id = auth.uid() OR user2_id = auth.uid())
));

CREATE POLICY "Couple members can create card game sessions" 
ON public.card_game_sessions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM couples 
  WHERE id = card_game_sessions.couple_id 
  AND (user1_id = auth.uid() OR user2_id = auth.uid())
));

CREATE POLICY "Couple members can update their card game sessions" 
ON public.card_game_sessions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE id = card_game_sessions.couple_id 
  AND (user1_id = auth.uid() OR user2_id = auth.uid())
));

-- RLS Policies for card_responses
CREATE POLICY "Couple members can view card responses for their sessions" 
ON public.card_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM card_game_sessions cgs
  JOIN couples c ON cgs.couple_id = c.id
  WHERE cgs.id = card_responses.session_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Users can create their own card responses" 
ON public.card_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card responses" 
ON public.card_responses 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for card_nudges
CREATE POLICY "Couple members can view nudges for their sessions" 
ON public.card_nudges 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM card_game_sessions cgs
  JOIN couples c ON cgs.couple_id = c.id
  WHERE cgs.id = card_nudges.session_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Users can create nudges" 
ON public.card_nudges 
FOR INSERT 
WITH CHECK (auth.uid() = from_user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_card_game_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_card_game_sessions_updated_at
BEFORE UPDATE ON public.card_game_sessions
FOR EACH ROW
EXECUTE FUNCTION update_card_game_sessions_updated_at();

CREATE TRIGGER update_couple_card_games_updated_at
BEFORE UPDATE ON public.couple_card_games
FOR EACH ROW
EXECUTE FUNCTION public.update_notes_updated_at();

-- Insert default card categories
INSERT INTO public.card_categories (name, emoji, color, description) VALUES
('Romantic', '💞', 'pink', 'Sweet and romantic questions to deepen your love'),
('Flirty', '🔥', 'red', 'Fun and flirty questions to spark chemistry'),
('Fun', '😆', 'yellow', 'Light-hearted questions for laughter and joy'),
('Deep Questions', '🧠', 'purple', 'Thoughtful questions for meaningful conversations'),
('Communication Boosters', '💬', 'blue', 'Questions to improve your communication'),
('Conflict Resolvers', '💔', 'orange', 'Questions to work through challenges together'),
('Compatibility', '🧩', 'green', 'Questions to explore your compatibility'),
('Future Planning', '🤝', 'teal', 'Questions about your shared future and dreams');

-- Insert default card game
INSERT INTO public.couple_card_games (name, description, game_type) VALUES
('Couples Card Deck', '500+ meaningful questions to spark intimate conversations', 'couples_cards');