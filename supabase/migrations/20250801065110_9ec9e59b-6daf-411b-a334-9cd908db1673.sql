-- Fix the streak calculation logic and scoring system
-- Update couple streaks calculation function
CREATE OR REPLACE FUNCTION public.update_couple_streaks(p_couple_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  last_checkin_date DATE;
  last_story_date DATE;
  new_checkin_streak INTEGER := 0;
  new_story_streak INTEGER := 0;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Calculate check-in streak
  -- Find the most recent date where both partners checked in
  WITH both_checkins AS (
    SELECT checkin_date
    FROM daily_checkins dc1
    WHERE dc1.couple_id = p_couple_id
      AND EXISTS (
        SELECT 1 FROM daily_checkins dc2 
        WHERE dc2.couple_id = dc1.couple_id 
          AND dc2.checkin_date = dc1.checkin_date 
          AND dc2.user_id != dc1.user_id
      )
    ORDER BY checkin_date DESC
  )
  SELECT checkin_date INTO last_checkin_date FROM both_checkins LIMIT 1;
  
  -- Count consecutive days back from the most recent check-in (or today/yesterday)
  IF last_checkin_date IS NOT NULL THEN
    -- Check if the streak is current (today or yesterday)
    IF last_checkin_date >= yesterday_date THEN
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
    ELSE
      -- Streak is broken (last check-in was before yesterday)
      new_checkin_streak := 0;
    END IF;
  END IF;
  
  -- Calculate story streak (similar logic for stories)
  WITH both_stories AS (
    SELECT DATE(created_at) as story_date
    FROM stories s1
    WHERE s1.couple_id = p_couple_id
      AND EXISTS (
        SELECT 1 FROM stories s2 
        WHERE s2.couple_id = s1.couple_id 
          AND DATE(s2.created_at) = DATE(s1.created_at)
          AND s2.user_id != s1.user_id
      )
    ORDER BY story_date DESC
  )
  SELECT story_date INTO last_story_date FROM both_stories LIMIT 1;
  
  IF last_story_date IS NOT NULL THEN
    -- Check if the streak is current (today or yesterday)
    IF last_story_date >= yesterday_date THEN
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
    ELSE
      -- Streak is broken (last story was before yesterday)
      new_story_streak := 0;
    END IF;
  END IF;
  
  -- Update couple streaks
  UPDATE couples 
  SET checkin_streak = COALESCE(new_checkin_streak, 0),
      story_streak = COALESCE(new_story_streak, 0)
  WHERE id = p_couple_id;
END;
$function$;

-- Update the enhanced sync score calculation with new logic
CREATE OR REPLACE FUNCTION public.calculate_enhanced_sync_score(p_couple_id uuid)
 RETURNS integer
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
  
  -- New variables for penalty system
  days_both_missed_checkin INTEGER := 0;
  days_both_missed_story INTEGER := 0;
  days_one_missed_checkin INTEGER := 0;
  days_one_missed_story INTEGER := 0;
BEGIN
  -- Update streaks first
  PERFORM update_couple_streaks(p_couple_id);
  
  -- Calculate daily check-ins (last 7 days) - max 40 points
  -- Count days where both partners checked in (+2 points each)
  SELECT COUNT(DISTINCT dc1.checkin_date) INTO recent_checkins_both
  FROM daily_checkins dc1
  JOIN daily_checkins dc2 ON dc1.couple_id = dc2.couple_id 
    AND dc1.checkin_date = dc2.checkin_date 
    AND dc1.user_id != dc2.user_id
  WHERE dc1.couple_id = p_couple_id 
    AND dc1.checkin_date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Count days where only one partner checked in (-1 point)
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
  
  -- Count days where both missed check-in (-2 points each)
  WITH all_recent_days AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '7 days',
      CURRENT_DATE - INTERVAL '1 day',
      INTERVAL '1 day'
    )::date AS day_date
  ),
  checkin_days AS (
    SELECT DISTINCT checkin_date 
    FROM daily_checkins 
    WHERE couple_id = p_couple_id 
      AND checkin_date >= CURRENT_DATE - INTERVAL '7 days'
  )
  SELECT COUNT(*) INTO days_both_missed_checkin
  FROM all_recent_days ard
  WHERE NOT EXISTS (
    SELECT 1 FROM checkin_days cd 
    WHERE cd.checkin_date = ard.day_date
  );
  
  -- Calculate check-in points: +2 for both, -1 for single, -2 for none
  checkin_points := (recent_checkins_both * 2) - (recent_checkins_single * 1) - (days_both_missed_checkin * 2);
  checkin_points := GREATEST(checkin_points, -14); -- Floor at -14 (worst case: all 7 days missed)
  checkin_points := LEAST(checkin_points, 14); -- Cap at 14 (best case: all 7 days both checked in)
  
  -- Get current check-in streak from couples table
  SELECT COALESCE(checkin_streak, 0) INTO current_checkin_streak
  FROM couples WHERE id = p_couple_id;
  
  -- Calculate story sharing (last 7 days) - similar logic
  -- Count days where both partners shared stories (+2 points each)
  SELECT COUNT(DISTINCT DATE(s1.created_at)) INTO recent_stories_both
  FROM stories s1
  JOIN stories s2 ON s1.couple_id = s2.couple_id 
    AND DATE(s1.created_at) = DATE(s2.created_at)
    AND s1.user_id != s2.user_id
  WHERE s1.couple_id = p_couple_id 
    AND s1.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Count days where only one partner shared story (-1 point)
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
  
  -- Count days where both missed stories (-2 points each)
  WITH story_days AS (
    SELECT DISTINCT DATE(created_at) as story_date
    FROM stories 
    WHERE couple_id = p_couple_id 
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  )
  SELECT COUNT(*) INTO days_both_missed_story
  FROM all_recent_days ard
  WHERE NOT EXISTS (
    SELECT 1 FROM story_days sd 
    WHERE sd.story_date = ard.day_date
  );
  
  -- Calculate story points: +2 for both, -1 for single, -2 for none  
  story_points := (recent_stories_both * 2) - (recent_stories_single * 1) - (days_both_missed_story * 2);
  story_points := GREATEST(story_points, -14); -- Floor at -14
  story_points := LEAST(story_points, 14); -- Cap at 14
  
  -- Count story interactions (views + responses) for bonus
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
  
  -- Add interaction bonus to story points
  story_points := story_points + LEAST(story_interactions, 5); -- Max 5 bonus points
  
  -- Calculate communication quality (last 7 days) - max 20 points
  SELECT COUNT(*) INTO recent_messages
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE c.couple_id = p_couple_id 
    AND m.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Communication scoring: 1 point per 2 messages, max 20
  communication_points := LEAST(recent_messages / 2, 20);
  
  -- Calculate relationship milestones (last 7 days) - max 15 points
  SELECT COUNT(*) INTO recent_memories
  FROM memories 
  WHERE couple_id = p_couple_id 
    AND created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO recent_dates
  FROM date_ideas 
  WHERE couple_id = p_couple_id 
    AND is_completed = true
    AND completed_date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Memory: +5 each, Completed dates: +10 each, max 15 total
  milestone_points := LEAST((recent_memories * 5) + (recent_dates * 10), 15);
  
  -- Calculate streak bonus (max 10 points)
  SELECT COALESCE(story_streak, 0) INTO current_story_streak
  FROM couples WHERE id = p_couple_id;
  
  -- Streak bonus: 1 point per day of streak, max 10
  streak_bonus := LEAST(current_checkin_streak + current_story_streak, 10);
  
  -- Calculate final score: Start from 50% base, apply modifiers
  -- Base: 50 points
  -- Check-ins: -14 to +14 points
  -- Stories: -14 to +14 points  
  -- Communication: 0 to +20 points
  -- Milestones: 0 to +15 points
  -- Streak bonus: 0 to +10 points
  -- Total range: 50 + (-28 to +73) = 22 to 123, capped at 0-100
  final_score := 50 + checkin_points + story_points + communication_points + milestone_points + streak_bonus;
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
      'days_both_missed_checkin', days_both_missed_checkin,
      'recent_stories_both', recent_stories_both,
      'recent_stories_single', recent_stories_single,
      'days_both_missed_story', days_both_missed_story,
      'story_interactions', story_interactions,
      'recent_messages', recent_messages,
      'recent_memories', recent_memories,
      'recent_dates', recent_dates,
      'checkin_streak', current_checkin_streak,
      'story_streak', current_story_streak,
      'base_score', 50
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
      'calculation_details', 'Enhanced algorithm v3.0 - starts from 50% base with penalties/rewards',
      'breakdown', jsonb_build_object(
        'checkins', jsonb_build_object(
          'both', recent_checkins_both, 
          'single', recent_checkins_single,
          'missed', days_both_missed_checkin
        ),
        'stories', jsonb_build_object(
          'both', recent_stories_both, 
          'single', recent_stories_single, 
          'missed', days_both_missed_story,
          'interactions', story_interactions
        ),
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