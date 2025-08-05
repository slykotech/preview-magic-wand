-- Create table for game cards
CREATE TABLE public.game_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL,
  time_limit_seconds INTEGER DEFAULT 300,
  requires_action BOOLEAN DEFAULT false,
  game_type TEXT NOT NULL DEFAULT 'couples_card_game',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_cards ENABLE ROW LEVEL SECURITY;

-- Create policy for reading game cards (public read access)
CREATE POLICY "Game cards are viewable by everyone" 
ON public.game_cards 
FOR SELECT 
USING (true);

-- Create table for truth or dare prompts
CREATE TABLE public.truth_dare_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('truth', 'dare')),
  category TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 3),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.truth_dare_prompts ENABLE ROW LEVEL SECURITY;

-- Create policy for reading truth or dare prompts (public read access)
CREATE POLICY "Truth or dare prompts are viewable by everyone" 
ON public.truth_dare_prompts 
FOR SELECT 
USING (true);

-- Insert sample game cards
INSERT INTO public.game_cards (title, prompt, category, time_limit_seconds, requires_action) VALUES
-- Romantic cards
('Love Languages', 'What are your top 2 love languages and how do you most like to receive love?', 'romantic', 300, false),
('First Kiss Memory', 'Describe our first kiss in detail. What were you thinking and feeling?', 'romantic', 400, false),
('Perfect Date', 'Plan our perfect date together. Where would we go and what would we do?', 'romantic', 600, false),
('Love Letter', 'Write a short love letter to your partner expressing what they mean to you.', 'romantic', 500, true),

-- Flirty cards
('Compliment Game', 'Give your partner 3 specific compliments about their appearance today.', 'flirty', 200, false),
('Secret Crush', 'What did you first notice about me that made you attracted to me?', 'flirty', 300, false),
('Flirty Text', 'Send me the flirtiest text you can think of right now.', 'flirty', 300, true),
('Kiss Challenge', 'Describe your favorite way to be kissed by me.', 'flirty', 250, false),

-- Funny cards
('Silly Voices', 'Do your best impression of me when I wake up in the morning.', 'funny', 200, true),
('Dance Off', 'Show me your silliest dance moves for 30 seconds.', 'funny', 180, true),
('Funny Story', 'Tell me about the most embarrassing thing that happened to you this week.', 'funny', 400, false),
('Would You Rather', 'Would you rather have to sing everything you say for a day or only communicate through interpretive dance?', 'funny', 300, false),

-- Deep Talk cards
('Life Goals', 'What is one dream you have that you have never told anyone about?', 'deep_talk', 500, false),
('Childhood Memory', 'Share a childhood memory that shaped who you are today.', 'deep_talk', 600, false),
('Biggest Fear', 'What is your biggest fear about our relationship and how can we address it together?', 'deep_talk', 700, false),
('Personal Growth', 'How have you grown as a person since we have been together?', 'deep_talk', 500, false),

-- Communication cards
('Love Appreciation', 'What is one thing I do that makes you feel most loved and appreciated?', 'communication', 400, false),
('Conflict Resolution', 'How do you prefer to resolve disagreements? What works best for you?', 'communication', 500, false),
('Support Needs', 'When you are stressed, what is the best way I can support you?', 'communication', 400, false),
('Quality Time', 'What does quality time together look like to you?', 'communication', 350, false),

-- Conflict Resolution cards
('Forgiveness', 'Is there anything from our past that you need to forgive me for?', 'conflict_resolution', 600, false),
('Understanding', 'What is one thing about me that you wish you understood better?', 'conflict_resolution', 500, false),
('Growth Together', 'How can we better support each other through difficult times?', 'conflict_resolution', 600, false),
('Healing', 'What can we do to strengthen our relationship after a disagreement?', 'conflict_resolution', 500, false),

-- Compatibility cards
('Values Alignment', 'What core values do we share that make us compatible?', 'compatibility', 400, false),
('Differences', 'What is one way we are different that actually strengthens our relationship?', 'compatibility', 400, false),
('Lifestyle Match', 'How well do our lifestyle preferences align? Where do we complement each other?', 'compatibility', 500, false),
('Relationship Style', 'What relationship dynamic works best for us?', 'compatibility', 400, false),

-- Future Planning cards
('Life Vision', 'Describe what you want our life to look like in 5 years.', 'future_planning', 600, false),
('Dream Home', 'What would our dream home look like and where would it be?', 'future_planning', 500, false),
('Adventures', 'What is the biggest adventure you want us to go on together?', 'future_planning', 400, false),
('Legacy', 'What kind of legacy do you want us to create together?', 'future_planning', 600, false);

-- Insert sample truth or dare prompts
INSERT INTO public.truth_dare_prompts (prompt, type, category, difficulty) VALUES
-- Truth prompts
('What is your biggest secret that you have never told me?', 'truth', 'deep', 3),
('What was your first impression of me?', 'truth', 'romantic', 1),
('What is your biggest turn-on about me?', 'truth', 'flirty', 2),
('What is the silliest thing you believed as a child?', 'truth', 'funny', 1),
('What is one thing you would change about our relationship?', 'truth', 'deep', 3),
('What is your favorite memory of us together?', 'truth', 'romantic', 1),
('What is one thing about me that surprised you?', 'truth', 'romantic', 2),
('What is your most embarrassing dating story?', 'truth', 'funny', 2),
('What do you think our biggest strength as a couple is?', 'truth', 'deep', 2),
('What is something you find irresistibly attractive about me?', 'truth', 'flirty', 2),

-- Dare prompts
('Give me a 30-second back rub', 'dare', 'romantic', 1),
('Send me a selfie with a kissy face', 'dare', 'flirty', 1),
('Do 10 jumping jacks while saying "I love you"', 'dare', 'funny', 1),
('Write "I love [partner name]" on your hand and show me', 'dare', 'romantic', 1),
('Dance to our favorite song for 1 minute', 'dare', 'romantic', 2),
('Do your best impression of a celebrity', 'dare', 'funny', 2),
('Tell me 5 things you love about me in a silly voice', 'dare', 'flirty', 2),
('Take a photo of yourself doing a superhero pose', 'dare', 'funny', 1),
('Serenade me with a made-up song about our relationship', 'dare', 'romantic', 3),
('Do a fashion show with 3 different outfits from your closet', 'dare', 'funny', 3);