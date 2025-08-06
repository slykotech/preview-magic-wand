-- Create couple card games table
CREATE TABLE public.couple_card_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card categories table
CREATE TABLE public.card_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#F59E0B',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create couple cards table with 500+ questions
CREATE TABLE public.couple_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.card_categories(id),
  question TEXT NOT NULL,
  difficulty_level TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NULL,
  couple_id UUID NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card game sessions table
CREATE TABLE public.card_game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id),
  game_id UUID NOT NULL REFERENCES public.couple_card_games(id),
  selected_categories UUID[] NOT NULL DEFAULT '{}',
  shuffle_mode BOOLEAN NOT NULL DEFAULT true,
  current_player_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  cards_played INTEGER NOT NULL DEFAULT 0,
  current_card_id UUID NULL REFERENCES public.couple_cards(id),
  used_card_ids UUID[] NOT NULL DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card responses table
CREATE TABLE public.card_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.card_game_sessions(id),
  card_id UUID NOT NULL REFERENCES public.couple_cards(id),
  user_id UUID NOT NULL,
  response_text TEXT,
  response_audio_url TEXT,
  response_time_seconds INTEGER,
  is_meaningful BOOLEAN DEFAULT false,
  partner_rating INTEGER CHECK (partner_rating BETWEEN 1 AND 5),
  reactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card nudges table
CREATE TABLE public.card_nudges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.card_game_sessions(id),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  message TEXT NOT NULL DEFAULT 'Hey, your turn in the card game! 👋',
  is_read BOOLEAN NOT NULL DEFAULT false,
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
CREATE POLICY "Games are viewable by authenticated users" ON public.couple_card_games
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for card_categories
CREATE POLICY "Categories are viewable by authenticated users" ON public.card_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for couple_cards
CREATE POLICY "Cards are viewable by authenticated users" ON public.couple_cards
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create custom cards for their couple" ON public.couple_cards
  FOR INSERT WITH CHECK (
    is_custom = true AND 
    auth.uid() = created_by AND 
    EXISTS (
      SELECT 1 FROM public.couples 
      WHERE id = couple_cards.couple_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can update their custom cards" ON public.couple_cards
  FOR UPDATE USING (
    is_custom = true AND 
    EXISTS (
      SELECT 1 FROM public.couples 
      WHERE id = couple_cards.couple_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- RLS Policies for card_game_sessions
CREATE POLICY "Couple members can view their card game sessions" ON public.card_game_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couples 
      WHERE id = card_game_sessions.couple_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can create card game sessions" ON public.card_game_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couples 
      WHERE id = card_game_sessions.couple_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can update their card game sessions" ON public.card_game_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.couples 
      WHERE id = card_game_sessions.couple_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- RLS Policies for card_responses
CREATE POLICY "Couple members can view card responses for their sessions" ON public.card_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.card_game_sessions cgs
      JOIN public.couples c ON cgs.couple_id = c.id
      WHERE cgs.id = card_responses.session_id 
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create their own card responses" ON public.card_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card responses" ON public.card_responses
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for card_nudges
CREATE POLICY "Users can view nudges sent to them or by them" ON public.card_nudges
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create nudges" ON public.card_nudges
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update nudges sent to them" ON public.card_nudges
  FOR UPDATE USING (auth.uid() = to_user_id);

-- Insert default card categories
INSERT INTO public.card_categories (name, emoji, color, description) VALUES
  ('Romantic', '💞', '#EC4899', 'Sweet and romantic questions to deepen your love'),
  ('Flirty', '🔥', '#F59E0B', 'Playful and flirty questions to spark passion'),
  ('Fun', '😆', '#10B981', 'Light-hearted and entertaining questions'),
  ('Deep Questions', '🧠', '#8B5CF6', 'Thought-provoking questions for meaningful conversations'),
  ('Communication', '💬', '#06B6D4', 'Questions to improve communication and understanding'),
  ('Conflict Resolution', '💔', '#EF4444', 'Questions to resolve conflicts and grow stronger'),
  ('Compatibility', '🧩', '#F97316', 'Questions to explore your compatibility'),
  ('Future Planning', '🤝', '#6366F1', 'Questions about your future together');

-- Insert a default card game
INSERT INTO public.couple_card_games (name, description) VALUES
  ('Love Cards', 'The ultimate card game for couples to connect, communicate, and grow together');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_card_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for card_game_sessions
CREATE TRIGGER update_card_game_sessions_updated_at
  BEFORE UPDATE ON public.card_game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_card_sessions_updated_at();

-- Create trigger for card_responses
CREATE TRIGGER update_card_responses_updated_at
  BEFORE UPDATE ON public.card_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_card_sessions_updated_at();