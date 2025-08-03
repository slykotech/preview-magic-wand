-- Create card games infrastructure tables

-- Main games table to define available games
CREATE TABLE public.card_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  game_type TEXT NOT NULL, -- 'identity_dreams' or 'love_language_lab'
  max_players INTEGER NOT NULL DEFAULT 2,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 30,
  difficulty_level TEXT NOT NULL DEFAULT 'beginner', -- beginner, intermediate, advanced
  lgbtq_inclusive BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Game cards table for storing prompts and questions
CREATE TABLE public.game_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL,
  card_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL, -- 'identity', 'dreams', 'professional', 'love_language', 'challenge'
  difficulty_level TEXT NOT NULL DEFAULT 'beginner',
  requires_voice_response BOOLEAN NOT NULL DEFAULT false,
  requires_action BOOLEAN NOT NULL DEFAULT false,
  time_limit_seconds INTEGER DEFAULT 300, -- 5 minutes default
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Game sessions for tracking active gameplay between couples
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL,
  game_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, paused, abandoned
  current_card_id UUID,
  player_turn UUID, -- which partner's turn it is
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_cards_played INTEGER NOT NULL DEFAULT 0,
  session_data JSONB DEFAULT '{}', -- store game-specific state
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Card responses for storing partner answers and interactions
CREATE TABLE public.card_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  card_id UUID NOT NULL,
  user_id UUID NOT NULL,
  response_text TEXT,
  response_audio_url TEXT,
  response_video_url TEXT,
  partner_rating INTEGER, -- 1-5 rating from partner
  meaningful_response BOOLEAN DEFAULT false, -- flagged for saving to memories
  response_time_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Game achievements for relationship milestones
CREATE TABLE public.game_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL,
  achievement_type TEXT NOT NULL, -- 'first_game', 'game_streak', 'deep_conversation', etc.
  achievement_name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_score_bonus INTEGER DEFAULT 0
);

-- Add foreign key constraints
ALTER TABLE public.game_cards 
ADD CONSTRAINT fk_game_cards_game 
FOREIGN KEY (game_id) REFERENCES public.card_games(id) ON DELETE CASCADE;

ALTER TABLE public.game_sessions 
ADD CONSTRAINT fk_game_sessions_couple 
FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE;

ALTER TABLE public.game_sessions 
ADD CONSTRAINT fk_game_sessions_game 
FOREIGN KEY (game_id) REFERENCES public.card_games(id) ON DELETE CASCADE;

ALTER TABLE public.game_sessions 
ADD CONSTRAINT fk_game_sessions_current_card 
FOREIGN KEY (current_card_id) REFERENCES public.game_cards(id) ON DELETE SET NULL;

ALTER TABLE public.card_responses 
ADD CONSTRAINT fk_card_responses_session 
FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.card_responses 
ADD CONSTRAINT fk_card_responses_card 
FOREIGN KEY (card_id) REFERENCES public.game_cards(id) ON DELETE CASCADE;

ALTER TABLE public.game_achievements 
ADD CONSTRAINT fk_game_achievements_couple 
FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.card_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for card_games (public read access)
CREATE POLICY "Card games are viewable by authenticated users" 
ON public.card_games 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for game_cards (public read access)
CREATE POLICY "Game cards are viewable by authenticated users" 
ON public.game_cards 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for game_sessions
CREATE POLICY "Couple members can create game sessions" 
ON public.game_sessions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM couples 
  WHERE id = couple_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
));

CREATE POLICY "Couple members can view their game sessions" 
ON public.game_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE id = couple_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
));

CREATE POLICY "Couple members can update their game sessions" 
ON public.game_sessions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE id = couple_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
));

-- RLS Policies for card_responses
CREATE POLICY "Users can create their own card responses" 
ON public.card_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Couple members can view card responses for their sessions" 
ON public.card_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM game_sessions gs
  JOIN couples c ON gs.couple_id = c.id
  WHERE gs.id = session_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Users can update their own card responses" 
ON public.card_responses 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for game_achievements
CREATE POLICY "Couple members can view their achievements" 
ON public.game_achievements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE id = couple_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
));

CREATE POLICY "System can create achievements" 
ON public.game_achievements 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM couples 
  WHERE id = couple_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
));

-- Create trigger for updating updated_at timestamps
CREATE TRIGGER update_card_games_updated_at
BEFORE UPDATE ON public.card_games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at
BEFORE UPDATE ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial game data
INSERT INTO public.card_games (name, description, game_type, estimated_duration_minutes, difficulty_level) VALUES
('Identity & Dreams Canvas', 'Explore authentic self-expression and future aspirations through thoughtful prompts designed for LGBTQ+ couples to deepen understanding and professional support.', 'identity_dreams', 45, 'intermediate'),
('Love Language Laboratory', 'Discover and practice love languages through interactive challenges and real-world actions that strengthen emotional connection and communication.', 'love_language_lab', 30, 'beginner');

-- Insert sample cards for Identity & Dreams Canvas
INSERT INTO public.game_cards (game_id, card_number, title, prompt, category, difficulty_level) 
SELECT 
  (SELECT id FROM public.card_games WHERE game_type = 'identity_dreams'),
  ROW_NUMBER() OVER (),
  title,
  prompt,
  category,
  'intermediate'
FROM (VALUES
  ('Authentic Self', 'What part of your identity are you most proud of, and how has it shaped your approach to relationships?', 'identity'),
  ('Professional Dreams', 'Describe a professional goal where you''d want your partner''s support. How can we champion each other''s careers?', 'professional'),
  ('Coming Out Stories', 'Share a meaningful moment in your coming out journey. What did you learn about yourself or others?', 'identity'),
  ('Workplace Belonging', 'How do you navigate being authentically yourself in professional settings? What support do you need?', 'professional'),
  ('Future Vision', 'If we could build our ideal life together in 10 years, what would it look like professionally and personally?', 'dreams'),
  ('Identity Evolution', 'How has your understanding of your identity evolved, and how has your partner supported that growth?', 'identity'),
  ('Career Allies', 'Describe a time when someone was a true ally to you professionally. How can we be that for each other?', 'professional'),
  ('Dream Supporter', 'What''s a dream you''ve never shared? How can your partner help make it reality?', 'dreams'),
  ('Challenging Moments', 'Tell about a time you faced discrimination or bias. How did it affect you and what did you learn?', 'identity'),
  ('Professional Values', 'What values do you want to embody in your career, and how do they align with our relationship values?', 'professional')
) AS cards(title, prompt, category);

-- Insert sample cards for Love Language Laboratory
INSERT INTO public.game_cards (game_id, card_number, title, prompt, category, difficulty_level, requires_action) 
SELECT 
  (SELECT id FROM public.card_games WHERE game_type = 'love_language_lab'),
  ROW_NUMBER() OVER (),
  title,
  prompt,
  category,
  'beginner',
  requires_action
FROM (VALUES
  ('Words Challenge', 'Write your partner a note expressing something you admire about their character. Read it aloud.', 'love_language', true),
  ('Touch Experiment', 'Discover your partner''s favorite type of physical affection through gentle exploration and communication.', 'love_language', true),
  ('Service Practice', 'Plan and complete a task that would genuinely help your partner this week. Discuss how it felt to give and receive.', 'love_language', true),
  ('Gift Discovery', 'Create something meaningful (not expensive) that represents your relationship. Explain its significance.', 'love_language', true),
  ('Quality Time Design', 'Plan a 2-hour activity focused entirely on each other with no distractions. What made it special?', 'love_language', true),
  ('Appreciation Styles', 'Share three different ways you like to receive appreciation. Practice giving appreciation in your partner''s preferred style.', 'love_language', false),
  ('Comfort Languages', 'Discuss how you each prefer to be comforted during difficult times. Practice supporting each other.', 'love_language', true),
  ('Celebration Rituals', 'Create a new way to celebrate each other''s wins, both big and small. Test it with a recent achievement.', 'love_language', true),
  ('Daily Connection', 'Design a daily ritual that incorporates both your love languages. Commit to trying it for a week.', 'love_language', true),
  ('Love Evolution', 'Reflect on how the ways you show and receive love have changed throughout your relationship.', 'love_language', false)
) AS cards(title, prompt, category, requires_action);