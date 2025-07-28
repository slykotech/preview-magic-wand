-- Add missing columns and tables for full functionality

-- Add profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add relationship field to daily_checkins for tracking relationship mood
ALTER TABLE public.daily_checkins ADD COLUMN IF NOT EXISTS relationship_feeling TEXT;

-- Add gratitude field to daily_checkins 
ALTER TABLE public.daily_checkins ADD COLUMN IF NOT EXISTS gratitude TEXT;

-- Create sync_scores table for relationship health tracking
CREATE TABLE IF NOT EXISTS public.sync_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  calculated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  factors JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(couple_id, calculated_date)
);

-- Enable RLS on sync_scores
ALTER TABLE public.sync_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for sync_scores
CREATE POLICY "Couple members can view their sync scores"
ON public.sync_scores
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = sync_scores.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

CREATE POLICY "System can insert sync scores"
ON public.sync_scores
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = sync_scores.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

-- Create function to calculate sync score
CREATE OR REPLACE FUNCTION public.calculate_sync_score(p_couple_id UUID)
RETURNS INTEGER AS $$
DECLARE
  recent_checkins INTEGER;
  mood_compatibility INTEGER;
  base_score INTEGER := 60;
  final_score INTEGER;
BEGIN
  -- Count recent check-ins (last 7 days)
  SELECT COUNT(*) INTO recent_checkins
  FROM daily_checkins 
  WHERE couple_id = p_couple_id 
  AND checkin_date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Basic mood compatibility (simplified)
  mood_compatibility := LEAST(recent_checkins * 5, 30);
  
  -- Calculate final score
  final_score := base_score + mood_compatibility;
  final_score := GREATEST(LEAST(final_score, 100), 0);
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Add update trigger to sync_scores
CREATE TRIGGER update_sync_scores_updated_at
  BEFORE UPDATE ON public.sync_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create relationship insights table
CREATE TABLE IF NOT EXISTS public.relationship_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on relationship_insights
ALTER TABLE public.relationship_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for relationship_insights
CREATE POLICY "Couple members can view their insights"
ON public.relationship_insights
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = relationship_insights.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

CREATE POLICY "Couple members can update their insights"
ON public.relationship_insights
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = relationship_insights.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

-- Add some sample insights function
CREATE OR REPLACE FUNCTION public.generate_relationship_insights(p_couple_id UUID)
RETURNS VOID AS $$
DECLARE
  recent_checkins INTEGER;
  insight_text TEXT;
BEGIN
  -- Count recent check-ins
  SELECT COUNT(*) INTO recent_checkins
  FROM daily_checkins 
  WHERE couple_id = p_couple_id 
  AND checkin_date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Generate insights based on activity
  IF recent_checkins >= 5 THEN
    insight_text := 'You and your partner have been consistently checking in! This shows great commitment to your relationship.';
  ELSIF recent_checkins >= 2 THEN
    insight_text := 'Good progress on daily check-ins! Try to make it a daily habit for even stronger connection.';
  ELSE
    insight_text := 'Regular check-ins can significantly improve relationship satisfaction. Try to check in together daily!';
  END IF;
  
  -- Insert insight if it doesn't exist
  INSERT INTO relationship_insights (couple_id, insight_type, title, description, priority)
  VALUES (p_couple_id, 'checkin_frequency', 'Communication Insight', insight_text, 2)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create couple preferences table
CREATE TABLE IF NOT EXISTS public.couple_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL UNIQUE,
  notification_time TIME DEFAULT '20:00:00',
  reminder_frequency TEXT DEFAULT 'daily' CHECK (reminder_frequency IN ('daily', 'weekly', 'custom')),
  love_languages JSONB DEFAULT '[]',
  relationship_goals JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on couple_preferences
ALTER TABLE public.couple_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for couple_preferences
CREATE POLICY "Couple members can manage their preferences"
ON public.couple_preferences
FOR ALL
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = couple_preferences.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

-- Add update trigger to couple_preferences
CREATE TRIGGER update_couple_preferences_updated_at
  BEFORE UPDATE ON public.couple_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();