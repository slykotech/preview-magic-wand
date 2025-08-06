-- Create subscription management tables
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, cancelled, expired
  plan_type TEXT NOT NULL DEFAULT 'premium', -- premium, family
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  auto_charge_date TIMESTAMPTZ,
  card_last_four TEXT,
  card_brand TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create partner subscriptions for shared access
CREATE TABLE public.partner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  premium_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL DEFAULT 'partner-linked', -- partner-linked, family-member
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_user_id) -- Each partner can only be linked to one premium account
);

-- Create subscription notifications table
CREATE TABLE public.subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- trial_start, trial_ending, trial_ended, charge_upcoming, charge_processed, cancelled
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for partner subscriptions
CREATE POLICY "Users can view partner subscriptions they're involved in" ON public.partner_subscriptions
  FOR SELECT USING (auth.uid() = premium_user_id OR auth.uid() = partner_user_id);

CREATE POLICY "Premium users can manage their partner subscriptions" ON public.partner_subscriptions
  FOR ALL USING (auth.uid() = premium_user_id);

CREATE POLICY "System can manage partner subscriptions" ON public.partner_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for subscription notifications
CREATE POLICY "Users can view their own notifications" ON public.subscription_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.subscription_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can manage notifications" ON public.subscription_notifications
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to check premium access
CREATE OR REPLACE FUNCTION public.has_premium_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_own_subscription BOOLEAN := false;
  has_partner_access BOOLEAN := false;
BEGIN
  -- Check if user has their own active subscription
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = p_user_id 
    AND status IN ('trial', 'active')
    AND (trial_end_date IS NULL OR trial_end_date > now())
  ) INTO has_own_subscription;
  
  IF has_own_subscription THEN
    RETURN true;
  END IF;
  
  -- Check if user has partner access
  SELECT EXISTS(
    SELECT 1 FROM public.partner_subscriptions ps
    JOIN public.subscriptions s ON ps.subscription_id = s.id
    WHERE ps.partner_user_id = p_user_id 
    AND ps.is_active = true
    AND ps.revoked_at IS NULL
    AND s.status IN ('trial', 'active')
    AND (s.trial_end_date IS NULL OR s.trial_end_date > now())
  ) INTO has_partner_access;
  
  RETURN has_partner_access;
END;
$$;

-- Create function to get premium access details
CREATE OR REPLACE FUNCTION public.get_premium_access_details(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  own_subscription RECORD;
  partner_access RECORD;
BEGIN
  -- Check for own subscription first
  SELECT * INTO own_subscription
  FROM public.subscriptions 
  WHERE user_id = p_user_id 
  AND status IN ('trial', 'active')
  AND (trial_end_date IS NULL OR trial_end_date > now());
  
  IF FOUND THEN
    result := json_build_object(
      'has_access', true,
      'access_type', 'own_subscription',
      'status', own_subscription.status,
      'plan_type', own_subscription.plan_type,
      'trial_end_date', own_subscription.trial_end_date,
      'current_period_end', own_subscription.current_period_end,
      'subscription_id', own_subscription.id
    );
    RETURN result;
  END IF;
  
  -- Check for partner access
  SELECT ps.*, s.status, s.plan_type, s.trial_end_date, s.current_period_end
  INTO partner_access
  FROM public.partner_subscriptions ps
  JOIN public.subscriptions s ON ps.subscription_id = s.id
  WHERE ps.partner_user_id = p_user_id 
  AND ps.is_active = true
  AND ps.revoked_at IS NULL
  AND s.status IN ('trial', 'active')
  AND (s.trial_end_date IS NULL OR s.trial_end_date > now());
  
  IF FOUND THEN
    result := json_build_object(
      'has_access', true,
      'access_type', 'partner_linked',
      'status', partner_access.status,
      'plan_type', partner_access.plan_type,
      'trial_end_date', partner_access.trial_end_date,
      'current_period_end', partner_access.current_period_end,
      'subscription_id', partner_access.subscription_id,
      'granted_by', partner_access.premium_user_id
    );
    RETURN result;
  END IF;
  
  -- No access
  result := json_build_object('has_access', false);
  RETURN result;
END;
$$;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();