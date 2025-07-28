-- Create enum for mood types
CREATE TYPE public.mood_type AS ENUM (
  'excited', 'happy', 'content', 'anxious', 'sad', 'stressed'
);

-- Create enum for relationship status
CREATE TYPE public.relationship_status AS ENUM (
  'dating', 'engaged', 'married', 'partnered'
);

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create couples table
CREATE TABLE public.couples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_status public.relationship_status DEFAULT 'dating',
  anniversary_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_couple UNIQUE(user1_id, user2_id),
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Create daily_checkins table
CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood public.mood_type NOT NULL,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_daily_checkin UNIQUE(user_id, couple_id, checkin_date)
);

-- Create ai_coach_sessions table
CREATE TABLE public.ai_coach_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Session',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_coach_messages table
CREATE TABLE public.ai_coach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_coach_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memories table
CREATE TABLE public.memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  memory_date DATE,
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create date_ideas table
CREATE TABLE public.date_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  estimated_cost TEXT,
  estimated_duration TEXT,
  location TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_date DATE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_ideas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for couples
CREATE POLICY "Users can view their own couples" 
ON public.couples 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create couples where they are a member" 
ON public.couples 
FOR INSERT 
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own couples" 
ON public.couples 
FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create RLS policies for daily_checkins
CREATE POLICY "Users can view checkins for their couples" 
ON public.daily_checkins 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.couples 
    WHERE couples.id = daily_checkins.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can create their own checkins" 
ON public.daily_checkins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkins" 
ON public.daily_checkins 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for AI coach sessions
CREATE POLICY "Users can view their own AI coach sessions" 
ON public.ai_coach_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI coach sessions" 
ON public.ai_coach_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI coach sessions" 
ON public.ai_coach_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for AI coach messages
CREATE POLICY "Users can view messages for their sessions" 
ON public.ai_coach_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.ai_coach_sessions 
    WHERE ai_coach_sessions.id = ai_coach_messages.session_id 
    AND ai_coach_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages for their sessions" 
ON public.ai_coach_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_coach_sessions 
    WHERE ai_coach_sessions.id = ai_coach_messages.session_id 
    AND ai_coach_sessions.user_id = auth.uid()
  )
);

-- Create RLS policies for memories
CREATE POLICY "Couple members can view their memories" 
ON public.memories 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.couples 
    WHERE couples.id = memories.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can create memories" 
ON public.memories 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.couples 
    WHERE couples.id = memories.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can update memories" 
ON public.memories 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.couples 
    WHERE couples.id = memories.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

-- Create RLS policies for date_ideas
CREATE POLICY "Couple members can view their date ideas" 
ON public.date_ideas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.couples 
    WHERE couples.id = date_ideas.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can create date ideas" 
ON public.date_ideas 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.couples 
    WHERE couples.id = date_ideas.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can update date ideas" 
ON public.date_ideas 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.couples 
    WHERE couples.id = date_ideas.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_couples_updated_at
  BEFORE UPDATE ON public.couples
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_checkins_updated_at
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_coach_sessions_updated_at
  BEFORE UPDATE ON public.ai_coach_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_date_ideas_updated_at
  BEFORE UPDATE ON public.date_ideas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();