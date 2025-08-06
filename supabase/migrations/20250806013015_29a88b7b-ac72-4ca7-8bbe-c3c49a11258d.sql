-- Enable RLS on spatial_ref_sys table (PostGIS system table)
-- This table is automatically created by PostGIS but RLS needs to be enabled
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow authenticated users to read spatial reference systems
CREATE POLICY "spatial_ref_sys_read_policy" ON public.spatial_ref_sys
FOR SELECT TO authenticated
USING (true);

-- Fix search path for existing functions that don't have it set
-- This addresses the security warnings about mutable search paths

-- Fix generate_relationship_insights function
CREATE OR REPLACE FUNCTION public.generate_relationship_insights(p_couple_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  recent_checkins INTEGER;
  insight_text TEXT;
BEGIN
  -- Count recent check-ins
  SELECT COUNT(*) INTO recent_checkins
  FROM public.daily_checkins 
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
  
  -- Insert or update insight
  INSERT INTO public.relationship_insights (couple_id, insight_type, title, description, priority)
  VALUES (p_couple_id, 'checkin_frequency', 'Communication Insight', insight_text, 2)
  ON CONFLICT (couple_id, insight_type) 
  DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = now();
END;
$function$;