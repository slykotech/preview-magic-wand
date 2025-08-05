-- CRITICAL SECURITY FIXES

-- 1. Enable RLS on scraping_logs table
ALTER TABLE public.scraping_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for scraping_logs (admin only access)
CREATE POLICY "Only admins can view scraping logs" 
ON public.scraping_logs 
FOR SELECT 
USING (auth.role() = 'service_role'::text);

-- 2. Fix database functions missing SET search_path TO ''
-- Update functions that are missing proper search path restrictions

CREATE OR REPLACE FUNCTION public.log_couple_activity(p_couple_id uuid, p_user_id uuid, p_activity_type text, p_activity_data jsonb DEFAULT '{}'::jsonb, p_points_awarded integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.couple_activity_log (
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

CREATE OR REPLACE FUNCTION public.reset_daily_quotas()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.user_api_quotas 
  SET daily_requests_used = 0,
      quota_reset_date = CURRENT_DATE
  WHERE quota_reset_date < CURRENT_DATE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.user_api_quotas 
  SET monthly_cost_used = 0,
      monthly_reset_date = CURRENT_DATE + INTERVAL '1 month'
  WHERE monthly_reset_date < CURRENT_DATE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_quota_usage(p_user_id uuid, p_cost_increase numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Update user's daily request count and monthly cost
  UPDATE public.user_api_quotas 
  SET daily_requests_used = daily_requests_used + 1,
      monthly_cost_used = monthly_cost_used + p_cost_increase,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_api_quotas (
      user_id, 
      daily_requests_used, 
      monthly_cost_used
    ) VALUES (
      p_user_id, 
      1, 
      p_cost_increase
    );
  END IF;
END;
$function$;

-- 3. Add security audit log table for tracking sensitive operations
CREATE TABLE public.security_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action_type text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can manage audit logs
CREATE POLICY "Service role can manage audit logs" 
ON public.security_audit_log 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- 4. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_user_id,
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_details
  );
END;
$function$;

-- 5. Add password hashing function for pending verifications
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Use pgcrypto extension for secure password hashing
  RETURN crypt(password, gen_salt('bf', 12));
END;
$function$;

-- 6. Add function to verify hashed passwords
CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN hash = crypt(password, hash);
END;
$function$;