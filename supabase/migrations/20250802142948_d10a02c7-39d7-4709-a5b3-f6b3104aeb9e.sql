-- Create function to update user quota usage
CREATE OR REPLACE FUNCTION update_user_quota_usage(p_user_id UUID, p_cost_increase DECIMAL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;