-- Create relationship_insights table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.relationship_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relationship_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their couple's insights" ON public.relationship_insights
FOR SELECT USING (
  couple_id IN (
    SELECT id FROM public.couples 
    WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  )
);

CREATE POLICY "System can insert insights" ON public.relationship_insights
FOR INSERT WITH CHECK (true);

-- Add unique constraint to prevent duplicate insights
CREATE UNIQUE INDEX IF NOT EXISTS idx_relationship_insights_unique 
ON public.relationship_insights (couple_id, insight_type);

-- Fix the generate_relationship_insights function
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