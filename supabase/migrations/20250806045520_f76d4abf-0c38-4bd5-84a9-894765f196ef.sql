-- Create couple_cards table for card deck games
CREATE TABLE IF NOT EXISTS public.couple_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty_level TEXT NOT NULL DEFAULT 'beginner',
  requires_action BOOLEAN NOT NULL DEFAULT false,
  requires_voice_response BOOLEAN NOT NULL DEFAULT false,
  time_limit_seconds INTEGER DEFAULT 300,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for couple_cards
ALTER TABLE public.couple_cards ENABLE ROW LEVEL SECURITY;

-- Create policy for couple_cards (readable by authenticated users)
CREATE POLICY "Couple cards are viewable by authenticated users" 
ON public.couple_cards 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Insert sample card data
INSERT INTO public.couple_cards (title, prompt, category, difficulty_level, requires_action, time_limit_seconds) VALUES
-- Romantic Cards
('Your First Date Memory', 'What do you remember most about our first date? Share your most vivid memory and what you were thinking about me that day.', 'Romantic', 'beginner', false, 300),
('Love Language Discovery', 'What makes you feel most loved when I do it? Describe the little things I do that make your heart skip a beat.', 'Romantic', 'beginner', false, 300),
('Future Dreams Together', 'Where do you see us in 5 years? Paint me a picture of our life together and what adventures we''ll have.', 'Romantic', 'intermediate', false, 600),
('Appreciation Moment', 'Tell me 3 things you appreciate about me today and why they matter to you.', 'Romantic', 'beginner', false, 300),
('Perfect Date Fantasy', 'If money and time weren''t a factor, what would our perfect date look like? Describe it in detail.', 'Romantic', 'intermediate', false, 450),

-- Flirty Cards  
('Secret Crush Confession', 'What was your first thought when you realized you had a crush on me? Be honest and detailed!', 'Flirty', 'beginner', false, 300),
('Compliment Game', 'Give me the most creative compliment you can think of. Make me blush!', 'Flirty', 'beginner', false, 240),
('Attraction Story', 'What physical feature of mine caught your attention first? Tell me the story of that moment.', 'Flirty', 'intermediate', false, 300),
('Sweet Confession', 'If you had to describe your feelings for me using only song lyrics, what would you say?', 'Flirty', 'intermediate', false, 360),
('Romantic Gesture', 'What''s the most romantic thing I''ve ever done for you? How did it make you feel?', 'Flirty', 'beginner', false, 300),

-- Fun Cards
('Childhood Embarrassment', 'Share your most embarrassing childhood story. I promise not to judge... much!', 'Fun', 'beginner', false, 360),
('Superpower Wishes', 'If you could have any superpower for a day, what would it be and how would you use it with me?', 'Fun', 'beginner', false, 300),
('Food Adventure', 'What''s the weirdest food combination you actually enjoy? Would you make me try it?', 'Fun', 'beginner', false, 240),
('Time Travel Question', 'If you could travel to any time period together, where would we go and what would we do?', 'Fun', 'intermediate', false, 400),
('Silly Fear Confession', 'What''s your silliest fear? How can I help you overcome it or make you feel better about it?', 'Fun', 'beginner', false, 300),

-- Deep Talk Cards
('Life Philosophy', 'What''s your personal philosophy on life? How has it shaped who you are today?', 'Deep Talk', 'advanced', false, 600),
('Greatest Life Lesson', 'What''s the most important lesson life has taught you so far? How did you learn it?', 'Deep Talk', 'intermediate', false, 480),
('Family Values', 'What family traditions or values do you want us to carry forward in our relationship?', 'Deep Talk', 'advanced', false, 600),
('Personal Growth', 'In what way have I helped you grow as a person? Be specific about the changes you''ve noticed.', 'Deep Talk', 'intermediate', false, 480),
('Life Purpose', 'What do you feel is your purpose in life? How do I fit into that vision?', 'Deep Talk', 'advanced', false, 720),

-- Communication Cards
('Conflict Resolution', 'How can we better handle disagreements? What approach works best for you?', 'Communication', 'intermediate', false, 480),
('Love Expression', 'How do you prefer me to express my love for you? What makes you feel most appreciated?', 'Communication', 'beginner', false, 360),
('Emotional Needs', 'What do you need from me when you''re feeling stressed or overwhelmed?', 'Communication', 'intermediate', false, 400),
('Feedback Session', 'Is there something I do that you''d like me to do more of? And something you''d like me to do differently?', 'Communication', 'intermediate', false, 480),
('Quality Time', 'What does quality time mean to you? How can we make our time together more meaningful?', 'Communication', 'beginner', false, 360),

-- Action Required Cards
('Photo Recreation', 'Find a photo from our early relationship and recreate it right now! Show me how we''ve grown.', 'Fun', 'beginner', true, 600),
('Love Letter Writing', 'Write a short love letter to your future self about our relationship today. Read it aloud.', 'Romantic', 'intermediate', true, 900),
('Gratitude Dance', 'Stand up and do a silly dance that represents how grateful you are for our relationship!', 'Fun', 'beginner', true, 300),
('Memory Box', 'Find three items in this room that remind you of special moments we''ve shared. Explain each one.', 'Romantic', 'intermediate', true, 720),
('Compliment Mirror', 'Look in a mirror and give yourself a compliment, then tell me why I should love that quality about you too.', 'Communication', 'intermediate', true, 480);

-- Create indexes for better performance
CREATE INDEX idx_couple_cards_category ON public.couple_cards(category);
CREATE INDEX idx_couple_cards_difficulty ON public.couple_cards(difficulty_level);
CREATE INDEX idx_couple_cards_active ON public.couple_cards(is_active);