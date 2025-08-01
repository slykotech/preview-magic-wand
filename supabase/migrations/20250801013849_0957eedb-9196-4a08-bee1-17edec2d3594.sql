-- Enhanced sync score system migration

-- Create historical sync scores table to track progress over time
CREATE TABLE public.historical_sync_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  calculated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checkin_points INTEGER DEFAULT 0,
  story_points INTEGER DEFAULT 0,
  communication_points INTEGER DEFAULT 0,
  milestone_points INTEGER DEFAULT 0,
  streak_bonus INTEGER DEFAULT 0,
  factors JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create couple activity log to track all relationship activities
CREATE TABLE public.couple_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'checkin', 'story', 'message', 'memory', 'date_completion'
  activity_data JSONB DEFAULT '{}',
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to couples table for relationship tracking
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS checkin_streak INTEGER DEFAULT 0;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS story_streak INTEGER DEFAULT 0;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS total_relationship_days INTEGER DEFAULT 0;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS disconnection_count INTEGER DEFAULT 0;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS last_sync_score INTEGER DEFAULT 60;

-- Add new columns to sync_scores table for detailed breakdown
ALTER TABLE public.sync_scores ADD COLUMN IF NOT EXISTS checkin_points INTEGER DEFAULT 0;
ALTER TABLE public.sync_scores ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0;
ALTER TABLE public.sync_scores ADD COLUMN IF NOT EXISTS communication_points INTEGER DEFAULT 0;
ALTER TABLE public.sync_scores ADD COLUMN IF NOT EXISTS milestone_points INTEGER DEFAULT 0;
ALTER TABLE public.sync_scores ADD COLUMN IF NOT EXISTS streak_bonus INTEGER DEFAULT 0;
ALTER TABLE public.sync_scores ADD COLUMN IF NOT EXISTS previous_score INTEGER;

-- Create indexes for performance
CREATE INDEX idx_historical_sync_scores_couple_date ON public.historical_sync_scores(couple_id, calculated_date);
CREATE INDEX idx_couple_activity_log_couple_date ON public.couple_activity_log(couple_id, created_at);
CREATE INDEX idx_couple_activity_log_type ON public.couple_activity_log(activity_type);

-- Enable RLS on new tables
ALTER TABLE public.historical_sync_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for historical_sync_scores
CREATE POLICY "Couple members can view their historical sync scores" 
ON public.historical_sync_scores 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = historical_sync_scores.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

CREATE POLICY "System can insert historical sync scores" 
ON public.historical_sync_scores 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = historical_sync_scores.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

-- Create RLS policies for couple_activity_log
CREATE POLICY "Couple members can view their activity log" 
ON public.couple_activity_log 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = couple_activity_log.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

CREATE POLICY "Users can create activity log entries" 
ON public.couple_activity_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = couple_activity_log.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

-- Create enhanced sync score calculation function
CREATE OR REPLACE FUNCTION public.calculate_enhanced_sync_score(p_couple_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  checkin_points INTEGER := 0;
  story_points INTEGER := 0;
  communication_points INTEGER := 0;
  milestone_points INTEGER := 0;
  streak_bonus INTEGER := 0;
  final_score INTEGER := 0;
  
  -- Variables for calculations
  recent_checkins_both INTEGER := 0;
  recent_checkins_single INTEGER := 0;
  recent_stories_both INTEGER := 0;
  recent_stories_single INTEGER := 0;
  current_checkin_streak INTEGER := 0;
  current_story_streak INTEGER := 0;
  story_interactions INTEGER := 0;
  recent_messages INTEGER := 0;
  recent_memories INTEGER := 0;
  recent_dates INTEGER := 0;
BEGIN
  -- Calculate daily check-ins (last 7 days) - max 40 points
  -- Count days where both partners checked in
  SELECT COUNT(DISTINCT dc1.checkin_date) INTO recent_checkins_both
  FROM daily_checkins dc1
  JOIN daily_checkins dc2 ON dc1.couple_id = dc2.couple_id 
    AND dc1.checkin_date = dc2.checkin_date 
    AND dc1.user_id != dc2.user_id
  WHERE dc1.couple_id = p_couple_id 
    AND dc1.checkin_date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Count days where only one partner checked in
  SELECT COUNT(DISTINCT checkin_date) INTO recent_checkins_single
  FROM daily_checkins dc1
  WHERE dc1.couple_id = p_couple_id 
    AND dc1.checkin_date >= CURRENT_DATE - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM daily_checkins dc2 
      WHERE dc2.couple_id = dc1.couple_id 
        AND dc2.checkin_date = dc1.checkin_date 
        AND dc2.user_id != dc1.user_id
    );
  
  -- Calculate check-in points
  checkin_points := (recent_checkins_both * 8) + (recent_checkins_single * 4);
  checkin_points := LEAST(checkin_points, 30); -- Cap at 30 base points
  
  -- Get current check-in streak from couples table
  SELECT COALESCE(checkin_streak, 0) INTO current_checkin_streak
  FROM couples WHERE id = p_couple_id;
  
  -- Calculate story sharing (last 7 days) - max 30 points
  -- Count days where both partners shared stories
  SELECT COUNT(DISTINCT DATE(s1.created_at)) INTO recent_stories_both
  FROM stories s1
  JOIN stories s2 ON s1.couple_id = s2.couple_id 
    AND DATE(s1.created_at) = DATE(s2.created_at)
    AND s1.user_id != s2.user_id
  WHERE s1.couple_id = p_couple_id 
    AND s1.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Count days where only one partner shared story
  SELECT COUNT(DISTINCT DATE(created_at)) INTO recent_stories_single
  FROM stories s1
  WHERE s1.couple_id = p_couple_id 
    AND s1.created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM stories s2 
      WHERE s2.couple_id = s1.couple_id 
        AND DATE(s2.created_at) = DATE(s1.created_at)
        AND s2.user_id != s1.user_id
    );
  
  -- Count story interactions (views + responses)
  SELECT COUNT(*) INTO story_interactions
  FROM (
    SELECT sv.story_id FROM story_views sv
    JOIN stories s ON sv.story_id = s.id
    WHERE s.couple_id = p_couple_id 
      AND sv.viewed_at >= CURRENT_DATE - INTERVAL '7 days'
    UNION ALL
    SELECT sr.story_id FROM story_responses sr
    JOIN stories s ON sr.story_id = s.id
    WHERE s.couple_id = p_couple_id 
      AND sr.created_at >= CURRENT_DATE - INTERVAL '7 days'
  ) interactions;
  
  -- Calculate story points
  story_points := (recent_stories_both * 6) + (recent_stories_single * 3);
  story_points := story_points + LEAST(story_interactions, 10); -- Add interaction bonus
  story_points := LEAST(story_points, 30); -- Cap at 30 points
  
  -- Calculate communication quality (last 7 days) - max 20 points
  SELECT COUNT(*) INTO recent_messages
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE c.couple_id = p_couple_id 
    AND m.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Basic communication scoring
  communication_points := LEAST(recent_messages * 2, 20);
  
  -- Calculate relationship milestones (last 7 days) - max 10 points
  SELECT COUNT(*) INTO recent_memories
  FROM memories 
  WHERE couple_id = p_couple_id 
    AND created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO recent_dates
  FROM date_ideas 
  WHERE couple_id = p_couple_id 
    AND is_completed = true
    AND completed_date >= CURRENT_DATE - INTERVAL '7 days';
  
  milestone_points := LEAST((recent_memories * 3) + (recent_dates * 5), 10);
  
  -- Calculate streak bonus (max 10 points)
  SELECT COALESCE(story_streak, 0) INTO current_story_streak
  FROM couples WHERE id = p_couple_id;
  
  streak_bonus := LEAST(current_checkin_streak + current_story_streak, 10);
  
  -- Calculate final score
  final_score := checkin_points + story_points + communication_points + milestone_points + streak_bonus;
  final_score := GREATEST(LEAST(final_score, 100), 0);
  
  -- Store detailed breakdown in sync_scores table
  INSERT INTO sync_scores (
    couple_id, 
    score, 
    checkin_points, 
    story_points, 
    communication_points, 
    milestone_points, 
    streak_bonus,
    factors
  ) VALUES (
    p_couple_id,
    final_score,
    checkin_points,
    story_points,
    communication_points,
    milestone_points,
    streak_bonus,
    jsonb_build_object(
      'recent_checkins_both', recent_checkins_both,
      'recent_checkins_single', recent_checkins_single,
      'recent_stories_both', recent_stories_both,
      'recent_stories_single', recent_stories_single,
      'story_interactions', story_interactions,
      'recent_messages', recent_messages,
      'recent_memories', recent_memories,
      'recent_dates', recent_dates,
      'checkin_streak', current_checkin_streak,
      'story_streak', current_story_streak
    )
  )
  ON CONFLICT (couple_id, calculated_date) 
  DO UPDATE SET
    score = EXCLUDED.score,
    checkin_points = EXCLUDED.checkin_points,
    story_points = EXCLUDED.story_points,
    communication_points = EXCLUDED.communication_points,
    milestone_points = EXCLUDED.milestone_points,
    streak_bonus = EXCLUDED.streak_bonus,
    factors = EXCLUDED.factors,
    updated_at = now();
  
  -- Store in historical scores
  INSERT INTO historical_sync_scores (
    couple_id,
    score,
    checkin_points,
    story_points,
    communication_points,
    milestone_points,
    streak_bonus,
    factors
  ) VALUES (
    p_couple_id,
    final_score,
    checkin_points,
    story_points,
    communication_points,
    milestone_points,
    streak_bonus,
    jsonb_build_object(
      'calculation_details', 'Enhanced algorithm v2.0',
      'breakdown', jsonb_build_object(
        'checkins', jsonb_build_object('both', recent_checkins_both, 'single', recent_checkins_single),
        'stories', jsonb_build_object('both', recent_stories_both, 'single', recent_stories_single, 'interactions', story_interactions),
        'communication', jsonb_build_object('messages', recent_messages),
        'milestones', jsonb_build_object('memories', recent_memories, 'dates', recent_dates),
        'streaks', jsonb_build_object('checkin', current_checkin_streak, 'story', current_story_streak)
      )
    )
  )
  ON CONFLICT (couple_id, calculated_date)
  DO UPDATE SET
    score = EXCLUDED.score,
    checkin_points = EXCLUDED.checkin_points,
    story_points = EXCLUDED.story_points,
    communication_points = EXCLUDED.communication_points,
    milestone_points = EXCLUDED.milestone_points,
    streak_bonus = EXCLUDED.streak_bonus,
    factors = EXCLUDED.factors;
  
  -- Update couple's last sync score
  UPDATE couples 
  SET last_sync_score = final_score,
      last_activity_date = CURRENT_DATE
  WHERE id = p_couple_id;
  
  RETURN final_score;
END;
$function$;

-- Create function to update activity streaks
CREATE OR REPLACE FUNCTION public.update_couple_streaks(p_couple_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  last_checkin_date DATE;
  last_story_date DATE;
  new_checkin_streak INTEGER := 0;
  new_story_streak INTEGER := 0;
BEGIN
  -- Calculate check-in streak
  -- Find the most recent date where both partners checked in
  SELECT MAX(dc1.checkin_date) INTO last_checkin_date
  FROM daily_checkins dc1
  WHERE dc1.couple_id = p_couple_id
    AND EXISTS (
      SELECT 1 FROM daily_checkins dc2 
      WHERE dc2.couple_id = dc1.couple_id 
        AND dc2.checkin_date = dc1.checkin_date 
        AND dc2.user_id != dc1.user_id
    );
  
  -- Count consecutive days back from the most recent check-in
  IF last_checkin_date IS NOT NULL THEN
    WITH RECURSIVE streak_days AS (
      -- Base case: start from the most recent check-in date
      SELECT last_checkin_date as check_date, 1 as streak_count
      
      UNION ALL
      
      -- Recursive case: check previous days
      SELECT 
        sd.check_date - INTERVAL '1 day',
        sd.streak_count + 1
      FROM streak_days sd
      WHERE sd.check_date - INTERVAL '1 day' >= CURRENT_DATE - INTERVAL '30 days' -- Limit to 30 days
        AND EXISTS (
          SELECT 1 FROM daily_checkins dc1
          WHERE dc1.couple_id = p_couple_id
            AND dc1.checkin_date = (sd.check_date - INTERVAL '1 day')::date
            AND EXISTS (
              SELECT 1 FROM daily_checkins dc2 
              WHERE dc2.couple_id = dc1.couple_id 
                AND dc2.checkin_date = dc1.checkin_date 
                AND dc2.user_id != dc1.user_id
            )
        )
    )
    SELECT MAX(streak_count) INTO new_checkin_streak FROM streak_days;
  END IF;
  
  -- Calculate story streak (similar logic for stories)
  SELECT MAX(DATE(s1.created_at)) INTO last_story_date
  FROM stories s1
  WHERE s1.couple_id = p_couple_id
    AND EXISTS (
      SELECT 1 FROM stories s2 
      WHERE s2.couple_id = s1.couple_id 
        AND DATE(s2.created_at) = DATE(s1.created_at)
        AND s2.user_id != s1.user_id
    );
  
  IF last_story_date IS NOT NULL THEN
    WITH RECURSIVE story_streak_days AS (
      SELECT last_story_date as story_date, 1 as streak_count
      
      UNION ALL
      
      SELECT 
        sd.story_date - INTERVAL '1 day',
        sd.streak_count + 1
      FROM story_streak_days sd
      WHERE sd.story_date - INTERVAL '1 day' >= CURRENT_DATE - INTERVAL '30 days'
        AND EXISTS (
          SELECT 1 FROM stories s1
          WHERE s1.couple_id = p_couple_id
            AND DATE(s1.created_at) = (sd.story_date - INTERVAL '1 day')::date
            AND EXISTS (
              SELECT 1 FROM stories s2 
              WHERE s2.couple_id = s1.couple_id 
                AND DATE(s2.created_at) = DATE(s1.created_at)
                AND s2.user_id != s1.user_id
            )
        )
    )
    SELECT MAX(streak_count) INTO new_story_streak FROM story_streak_days;
  END IF;
  
  -- Update couple streaks
  UPDATE couples 
  SET checkin_streak = COALESCE(new_checkin_streak, 0),
      story_streak = COALESCE(new_story_streak, 0)
  WHERE id = p_couple_id;
END;
$function$;

-- Create function to log couple activities
CREATE OR REPLACE FUNCTION public.log_couple_activity(
  p_couple_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_activity_data JSONB DEFAULT '{}',
  p_points_awarded INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO couple_activity_log (
    couple_id,
    user_id,
    activity_type,
    activity_data,
    points_awarded
  ) VALUES (
    p_couple_id,
    p_user_id,
    p_activity_type,
    p_activity_data,
    p_points_awarded
  );
END;
$function$;