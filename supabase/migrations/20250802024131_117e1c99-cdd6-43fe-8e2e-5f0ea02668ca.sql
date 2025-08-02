-- Fix the update_couple_streaks function to handle type casting properly
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
          (sd.check_date - INTERVAL '1 day')::date,
          sd.streak_count + 1
        FROM streak_days sd
        WHERE (sd.check_date - INTERVAL '1 day')::date >= (CURRENT_DATE - INTERVAL '30 days')::date -- Limit to 30 days
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
          (sd.story_date - INTERVAL '1 day')::date,
          sd.streak_count + 1
        FROM story_streak_days sd
        WHERE (sd.story_date - INTERVAL '1 day')::date >= (CURRENT_DATE - INTERVAL '30 days')::date
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
$function$