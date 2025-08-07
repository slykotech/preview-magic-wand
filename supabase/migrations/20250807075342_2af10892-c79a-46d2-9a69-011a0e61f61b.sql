-- Fix Critical Security Issues

-- 1. Fix all functions missing search_path protection
ALTER FUNCTION public.update_notes_updated_at() SET search_path TO '';
ALTER FUNCTION public.update_daily_checkins_updated_at() SET search_path TO '';
ALTER FUNCTION public.generate_invitation_token() SET search_path TO '';
ALTER FUNCTION public.cleanup_old_ai_events() SET search_path TO '';
ALTER FUNCTION public.expire_old_partner_requests() SET search_path TO '';
ALTER FUNCTION public.update_signup_invitations_updated_at() SET search_path TO '';
ALTER FUNCTION public.calculate_enhanced_sync_score(uuid) SET search_path TO '';
ALTER FUNCTION public.check_user_quota(uuid, numeric) SET search_path TO '';
ALTER FUNCTION public.update_couple_streaks(uuid) SET search_path TO '';
ALTER FUNCTION public.cleanup_expired_verifications() SET search_path TO '';
ALTER FUNCTION public.purge_user_completely(text) SET search_path TO '';
ALTER FUNCTION public.update_user_quota_usage(uuid, numeric) SET search_path TO '';
ALTER FUNCTION public.generate_relationship_insights(uuid) SET search_path TO '';

-- 2. Enable RLS on any tables that might be missing it (check geometry/geography system tables)
-- These are PostGIS system tables, we don't need RLS on them as they're read-only
-- ALTER TABLE public.geometry_columns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.geography_columns ENABLE ROW LEVEL SECURITY;

-- 3. Add audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/view audit logs
CREATE POLICY "Service role can manage audit logs" ON public.security_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Add rate limiting table for API endpoints
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP or user_id
  endpoint text NOT NULL,
  requests_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- 5. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.security_audit_log (event_type, user_id, details, ip_address, user_agent)
  VALUES (p_event_type, p_user_id, p_details, p_ip_address, p_user_agent);
END;
$$;

-- 6. Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_requests integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Clean up old rate limit entries
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - (p_window_minutes || ' minutes')::interval;
  
  -- Get current request count for this identifier and endpoint
  SELECT requests_count, window_start INTO current_requests, window_start_time
  FROM public.rate_limits
  WHERE identifier = p_identifier AND endpoint = p_endpoint;
  
  -- If no record exists, create one
  IF current_requests IS NULL THEN
    INSERT INTO public.rate_limits (identifier, endpoint, requests_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, now())
    ON CONFLICT (identifier, endpoint) 
    DO UPDATE SET 
      requests_count = 1,
      window_start = now();
    RETURN true;
  END IF;
  
  -- Check if window has expired
  IF window_start_time < now() - (p_window_minutes || ' minutes')::interval THEN
    UPDATE public.rate_limits
    SET requests_count = 1, window_start = now()
    WHERE identifier = p_identifier AND endpoint = p_endpoint;
    RETURN true;
  END IF;
  
  -- Check if under limit
  IF current_requests < p_max_requests THEN
    UPDATE public.rate_limits
    SET requests_count = requests_count + 1
    WHERE identifier = p_identifier AND endpoint = p_endpoint;
    RETURN true;
  END IF;
  
  -- Over limit
  RETURN false;
END;
$$;

-- 7. Strengthen admin whitelist security with additional validation
CREATE OR REPLACE FUNCTION public.validate_admin_access(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  whitelist_entry record;
BEGIN
  -- Log the admin access attempt
  PERFORM public.log_security_event(
    'admin_access_attempt',
    auth.uid(),
    jsonb_build_object('email', p_email),
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
  
  -- Check if email is in whitelist and active
  SELECT * INTO whitelist_entry
  FROM public.admin_whitelist
  WHERE email = p_email AND full_access = true;
  
  IF FOUND THEN
    -- Log successful admin access
    PERFORM public.log_security_event(
      'admin_access_granted',
      auth.uid(),
      jsonb_build_object('email', p_email),
      inet_client_addr(),
      current_setting('request.headers', true)::jsonb->>'user-agent'
    );
    RETURN true;
  ELSE
    -- Log failed admin access
    PERFORM public.log_security_event(
      'admin_access_denied',
      auth.uid(),
      jsonb_build_object('email', p_email, 'reason', 'not_in_whitelist'),
      inet_client_addr(),
      current_setting('request.headers', true)::jsonb->>'user-agent'
    );
    RETURN false;
  END IF;
END;
$$;