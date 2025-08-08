-- Security fixes: Add SET search_path to all functions without it

-- Fix update_notes_updated_at function
CREATE OR REPLACE FUNCTION public.update_notes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_daily_checkins_updated_at function
CREATE OR REPLACE FUNCTION public.update_daily_checkins_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix generate_invitation_token function
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$function$;

-- Fix update_signup_invitations_updated_at function
CREATE OR REPLACE FUNCTION public.update_signup_invitations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Fix purge_user_completely function
CREATE OR REPLACE FUNCTION public.purge_user_completely(user_email text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  result JSON;
BEGIN
  -- Clean up pending verifications
  DELETE FROM public.pending_verifications WHERE email = user_email;
  
  -- Clean up any orphaned profile records
  DELETE FROM public.profiles WHERE user_id NOT IN (
    SELECT id FROM auth.users
  );
  
  -- Return success
  result := json_build_object(
    'success', true,
    'message', 'User data purged successfully',
    'email', user_email
  );
  
  RETURN result;
END;
$function$;

-- Fix generate_relationship_insights function
CREATE OR REPLACE FUNCTION public.generate_relationship_insights(p_couple_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

-- Enable RLS on any tables that might be missing it (PostGIS tables are causing the RLS error)
-- We'll skip the PostGIS tables as they are system tables

-- Fix profiles table RLS policy - restrict visibility to couple members only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Couple members can view each other's profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.couples 
    WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    AND (user1_id = profiles.user_id OR user2_id = profiles.user_id)
  )
);

-- Add password hashing support for pending verifications
-- First, add a column to track if password is already hashed
ALTER TABLE public.pending_verifications 
ADD COLUMN IF NOT EXISTS password_is_hashed boolean DEFAULT false;

-- Update existing plain text passwords by setting them as expired for security
UPDATE public.pending_verifications 
SET status = 'expired', 
    expires_at = now() - INTERVAL '1 day'
WHERE password_is_hashed = false OR password_is_hashed IS NULL;

-- Add index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_pending_verifications_email_status 
ON public.pending_verifications(email, status);

-- Add index for better performance on token lookups
CREATE INDEX IF NOT EXISTS idx_pending_verifications_token 
ON public.pending_verifications(verification_token);

-- Create function to validate email format
CREATE OR REPLACE FUNCTION public.validate_email_format(email_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN email_input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$function$;