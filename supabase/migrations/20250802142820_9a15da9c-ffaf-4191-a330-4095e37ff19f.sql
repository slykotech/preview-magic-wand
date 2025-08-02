-- Fix security warnings by setting search_path for functions
-- Fix function search path issues for new functions

-- Fix reset_daily_quotas function
CREATE OR REPLACE FUNCTION reset_daily_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.user_api_quotas 
  SET daily_requests_used = 0,
      quota_reset_date = CURRENT_DATE
  WHERE quota_reset_date < CURRENT_DATE;
END;
$$;

-- Fix reset_monthly_quotas function
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.user_api_quotas 
  SET monthly_cost_used = 0,
      monthly_reset_date = CURRENT_DATE + INTERVAL '1 month'
  WHERE monthly_reset_date < CURRENT_DATE;
END;
$$;

-- Fix check_user_quota function
CREATE OR REPLACE FUNCTION check_user_quota(p_user_id UUID, p_estimated_cost DECIMAL DEFAULT 0)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  quota_record public.user_api_quotas%ROWTYPE;
  result JSON;
BEGIN
  -- Get or create user quota record
  INSERT INTO public.user_api_quotas (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO quota_record 
  FROM public.user_api_quotas 
  WHERE user_id = p_user_id;
  
  -- Reset quotas if needed
  IF quota_record.quota_reset_date < CURRENT_DATE THEN
    UPDATE public.user_api_quotas 
    SET daily_requests_used = 0,
        quota_reset_date = CURRENT_DATE
    WHERE user_id = p_user_id;
    quota_record.daily_requests_used := 0;
  END IF;
  
  IF quota_record.monthly_reset_date < CURRENT_DATE THEN
    UPDATE public.user_api_quotas 
    SET monthly_cost_used = 0,
        monthly_reset_date = CURRENT_DATE + INTERVAL '1 month'
    WHERE user_id = p_user_id;
    quota_record.monthly_cost_used := 0;
  END IF;
  
  -- Check limits
  result := json_build_object(
    'can_proceed', (
      quota_record.daily_requests_used < quota_record.daily_requests_limit AND
      (quota_record.monthly_cost_used + p_estimated_cost) <= quota_record.monthly_cost_limit
    ),
    'daily_remaining', quota_record.daily_requests_limit - quota_record.daily_requests_used,
    'monthly_cost_remaining', quota_record.monthly_cost_limit - quota_record.monthly_cost_used,
    'daily_limit', quota_record.daily_requests_limit,
    'monthly_limit', quota_record.monthly_cost_limit,
    'daily_used', quota_record.daily_requests_used,
    'monthly_used', quota_record.monthly_cost_used
  );
  
  RETURN result;
END;
$$;