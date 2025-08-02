-- Create API usage tracking tables
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  api_source TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  cost_estimate DECIMAL(10,4) DEFAULT 0,
  request_params JSONB,
  response_size INTEGER,
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user API quotas table
CREATE TABLE IF NOT EXISTS public.user_api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id),
  daily_requests_limit INTEGER DEFAULT 10,
  daily_requests_used INTEGER DEFAULT 0,
  monthly_cost_limit DECIMAL(10,2) DEFAULT 5.00,
  monthly_cost_used DECIMAL(10,2) DEFAULT 0,
  quota_reset_date DATE DEFAULT CURRENT_DATE,
  monthly_reset_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create API cost configuration table
CREATE TABLE IF NOT EXISTS public.api_cost_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_source TEXT UNIQUE NOT NULL,
  cost_per_request DECIMAL(10,4) NOT NULL,
  free_tier_limit INTEGER DEFAULT 0,
  rate_limit_per_hour INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default cost configurations
INSERT INTO public.api_cost_config (api_source, cost_per_request, free_tier_limit, rate_limit_per_hour) VALUES
('google_places', 0.017, 0, 20),
('ticketmaster', 0.025, 1000, 50),
('eventbrite', 0.01, 50, 100),
('seatgeek', 0.005, 1000, 100),
('predicthq', 0.02, 0, 30)
ON CONFLICT (api_source) DO NOTHING;

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_cost_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own API usage logs" ON public.api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own quotas" ON public.user_api_quotas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotas" ON public.user_api_quotas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "API cost config is viewable by authenticated users" ON public.api_cost_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create function to reset daily quotas
CREATE OR REPLACE FUNCTION reset_daily_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_api_quotas 
  SET daily_requests_used = 0,
      quota_reset_date = CURRENT_DATE
  WHERE quota_reset_date < CURRENT_DATE;
END;
$$;

-- Create function to reset monthly quotas
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_api_quotas 
  SET monthly_cost_used = 0,
      monthly_reset_date = CURRENT_DATE + INTERVAL '1 month'
  WHERE monthly_reset_date < CURRENT_DATE;
END;
$$;

-- Create function to check user quota
CREATE OR REPLACE FUNCTION check_user_quota(p_user_id UUID, p_estimated_cost DECIMAL DEFAULT 0)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quota_record user_api_quotas%ROWTYPE;
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_created ON public.api_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_source ON public.api_usage_logs(api_source);
CREATE INDEX IF NOT EXISTS idx_user_quotas_reset_dates ON public.user_api_quotas(quota_reset_date, monthly_reset_date);

-- Add triggers for updated_at
CREATE TRIGGER update_user_api_quotas_updated_at
  BEFORE UPDATE ON public.user_api_quotas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_cost_config_updated_at
  BEFORE UPDATE ON public.api_cost_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();