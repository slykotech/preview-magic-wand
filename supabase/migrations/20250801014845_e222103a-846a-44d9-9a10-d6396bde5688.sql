-- Update enhanced sync score calculation to start from 0%
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
  checkin_points := LEAST(checkin_points, 40); -- Cap at 40 points
  
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
  
  -- Calculate final score starting from 0%
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
      'calculation_details', 'Enhanced algorithm v2.0 - starts from 0%',
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