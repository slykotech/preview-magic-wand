-- Update the calculate_enhanced_sync_score function to add more milestone/communication points and streak penalties
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
  streak_penalty INTEGER := 0;
  final_score INTEGER := 0;
  
  -- Variables for calculations
  recent_checkins_both INTEGER := 0;
  recent_checkins_single INTEGER := 0;
  recent_stories_both INTEGER := 0;
  recent_stories_single INTEGER := 0;
  current_checkin_streak INTEGER := 0;
  current_story_streak INTEGER := 0;
  previous_checkin_streak INTEGER := 0;
  previous_story_streak INTEGER := 0;
  story_interactions INTEGER := 0;
  recent_messages INTEGER := 0;
  recent_memories INTEGER := 0;
  recent_dates INTEGER := 0;
  
  -- New variables for penalty system
  days_both_missed_checkin INTEGER := 0;
  days_both_missed_story INTEGER := 0;
BEGIN
  -- Get previous streaks before updating
  SELECT COALESCE(checkin_streak, 0), COALESCE(story_streak, 0) 
  INTO previous_checkin_streak, previous_story_streak
  FROM couples WHERE id = p_couple_id;
  
  -- Update streaks first
  PERFORM update_couple_streaks(p_couple_id);
  
  -- Get current streaks after update
  SELECT COALESCE(checkin_streak, 0), COALESCE(story_streak, 0) 
  INTO current_checkin_streak, current_story_streak
  FROM couples WHERE id = p_couple_id;
  
  -- Calculate daily check-ins (last 7 days)
  -- Count days where both partners checked in (+3 points each - increased from 2)
  SELECT COUNT(DISTINCT dc1.checkin_date) INTO recent_checkins_both
  FROM daily_checkins dc1
  JOIN daily_checkins dc2 ON dc1.couple_id = dc2.couple_id 
    AND dc1.checkin_date = dc2.checkin_date 
    AND dc1.user_id != dc2.user_id
  WHERE dc1.couple_id = p_couple_id 
    AND dc1.checkin_date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Count days where only one partner checked in (-2 points - increased penalty)
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
  
  -- Count days where both missed check-in (-3 points each - increased penalty)
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
  
  -- Calculate check-in points: +3 for both, -2 for single, -3 for none
  checkin_points := (recent_checkins_both * 3) - (recent_checkins_single * 2) - (days_both_missed_checkin * 3);
  checkin_points := GREATEST(checkin_points, -21); -- Floor at -21 (worst case: all 7 days missed)
  checkin_points := LEAST(checkin_points, 21); -- Cap at 21 (best case: all 7 days both checked in)
  
  -- Calculate story sharing (last 7 days) - similar logic with increased points
  -- Count days where both partners shared stories (+3 points each - increased from 2)
  SELECT COUNT(DISTINCT DATE(s1.created_at)) INTO recent_stories_both
  FROM stories s1
  JOIN stories s2 ON s1.couple_id = s2.couple_id 
    AND DATE(s1.created_at) = DATE(s2.created_at)
    AND s1.user_id != s2.user_id
  WHERE s1.couple_id = p_couple_id 
    AND s1.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Count days where only one partner shared story (-2 points - increased penalty)
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
  
  -- Count days where both missed stories (-3 points each - increased penalty)
  WITH all_recent_days AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '7 days',
      CURRENT_DATE - INTERVAL '1 day',
      INTERVAL '1 day'
    )::date AS day_date
  ),
  story_days AS (
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
  
  -- Calculate story points: +3 for both, -2 for single, -3 for none  
  story_points := (recent_stories_both * 3) - (recent_stories_single * 2) - (days_both_missed_story * 3);
  story_points := GREATEST(story_points, -21); -- Floor at -21
  story_points := LEAST(story_points, 21); -- Cap at 21
  
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
  story_points := story_points + LEAST(story_interactions, 8); -- Max 8 bonus points (increased from 5)
  
  -- Calculate communication quality (last 7 days) - increased max points
  SELECT COUNT(*) INTO recent_messages
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE c.couple_id = p_couple_id 
    AND m.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Communication scoring: 1 point per message, max 30 (increased from 20)
  communication_points := LEAST(recent_messages, 30);
  
  -- Calculate relationship milestones (last 7 days) - increased max points
  SELECT COUNT(*) INTO recent_memories
  FROM memories 
  WHERE couple_id = p_couple_id 
    AND created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO recent_dates
  FROM date_ideas 
  WHERE couple_id = p_couple_id 
    AND is_completed = true
    AND completed_date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Memory: +8 each, Completed dates: +15 each, max 25 total (increased from 15)
  milestone_points := LEAST((recent_memories * 8) + (recent_dates * 15), 25);
  
  -- Calculate streak bonus and penalties
  -- Streak bonus: 2 points per day of streak, max 20 (increased from 10)
  streak_bonus := LEAST((current_checkin_streak + current_story_streak) * 2, 20);
  
  -- Streak penalty: if streak breaks, lose points based on how long the streak was
  streak_penalty := 0;
  IF previous_checkin_streak > current_checkin_streak AND previous_checkin_streak > 0 THEN
    streak_penalty := streak_penalty + LEAST(previous_checkin_streak, 10); -- Max 10 penalty points
  END IF;
  
  IF previous_story_streak > current_story_streak AND previous_story_streak > 0 THEN
    streak_penalty := streak_penalty + LEAST(previous_story_streak, 10); -- Max 10 penalty points
  END IF;
  
  -- Calculate final score: Start from 0% base, apply modifiers
  -- Base: 0 points
  -- Check-ins: -21 to +21 points
  -- Stories: -21 to +29 points (including interactions bonus)
  -- Communication: 0 to +30 points (increased)
  -- Milestones: 0 to +25 points (increased)
  -- Streak bonus: 0 to +20 points (increased)
  -- Streak penalty: 0 to -20 points (new)
  final_score := 0 + checkin_points + story_points + communication_points + milestone_points + streak_bonus - streak_penalty;
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
      'streak_penalty', streak_penalty,
      'previous_checkin_streak', previous_checkin_streak,
      'previous_story_streak', previous_story_streak,
      'base_score', 0
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
      'calculation_details', 'Enhanced algorithm v4.0 - 0% base with increased milestone/communication points and streak penalties',
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
        'communication', jsonb_build_object('messages', recent_messages, 'points', communication_points),
        'milestones', jsonb_build_object('memories', recent_memories, 'dates', recent_dates, 'points', milestone_points),
        'streaks', jsonb_build_object(
          'checkin_current', current_checkin_streak, 
          'story_current', current_story_streak,
          'checkin_previous', previous_checkin_streak,
          'story_previous', previous_story_streak,
          'bonus', streak_bonus,
          'penalty', streak_penalty
        )
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