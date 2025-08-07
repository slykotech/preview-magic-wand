-- Enhance RevenueCat subscription system with additional tables and improvements

-- Add subscriber table for better user subscription management
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revenue_cat_user_id TEXT NOT NULL UNIQUE,
  original_app_user_id TEXT,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  platform TEXT, -- 'ios', 'android', 'web'
  app_version TEXT,
  attribution_data JSONB DEFAULT '{}',
  custom_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_subscriber UNIQUE(user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscribers_revenue_cat_user_id ON public.subscribers(revenue_cat_user_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers(user_id);

-- Add webhook signatures table for security auditing
CREATE TABLE IF NOT EXISTS public.webhook_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  signature TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL, -- 'revenuecat', 'stripe', etc.
  payload_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add entitlements table to track specific feature access
CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL, -- 'premium', 'family', etc.
  product_identifier TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  will_renew BOOLEAN NOT NULL DEFAULT false,
  period_type TEXT, -- 'trial', 'intro', 'normal'
  latest_purchase_date TIMESTAMP WITH TIME ZONE,
  original_purchase_date TIMESTAMP WITH TIME ZONE,
  expiration_date TIMESTAMP WITH TIME ZONE,
  store TEXT, -- 'app_store', 'play_store', 'stripe'
  is_sandbox BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_entitlement UNIQUE(user_id, identifier)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_active ON public.entitlements(is_active) WHERE is_active = true;

-- Add purchase history table for detailed transaction tracking
CREATE TABLE IF NOT EXISTS public.purchase_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  original_transaction_id TEXT,
  product_id TEXT NOT NULL,
  store TEXT NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revenue_cat_event_id TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  country_code TEXT,
  is_family_share BOOLEAN DEFAULT false,
  is_restore BOOLEAN DEFAULT false,
  environment TEXT DEFAULT 'production',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON public.purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_transaction_id ON public.purchase_history(transaction_id);

-- Update existing subscriptions table with better constraints and defaults
ALTER TABLE public.subscriptions 
  ALTER COLUMN revenue_cat_environment SET DEFAULT 'production',
  ALTER COLUMN currency SET DEFAULT 'USD',
  ALTER COLUMN is_trial SET DEFAULT false,
  ALTER COLUMN payment_method_collected SET DEFAULT false,
  ALTER COLUMN billing_issue SET DEFAULT false,
  ALTER COLUMN billing_issue_resolved SET DEFAULT true,
  ALTER COLUMN is_family_share SET DEFAULT false;

-- Add price field to subscriptions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscriptions' 
                 AND column_name = 'price' 
                 AND table_schema = 'public') THEN
    ALTER TABLE public.subscriptions ADD COLUMN price DECIMAL(10,2);
  END IF;
END $$;

-- Add next_billing_date field if not exists  
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscriptions' 
                 AND column_name = 'next_billing_date' 
                 AND table_schema = 'public') THEN
    ALTER TABLE public.subscriptions ADD COLUMN next_billing_date TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add billing_period field if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscriptions' 
                 AND column_name = 'billing_period' 
                 AND table_schema = 'public') THEN
    ALTER TABLE public.subscriptions ADD COLUMN billing_period TEXT DEFAULT 'monthly';
  END IF;
END $$;

-- RLS Policies for new tables

-- Subscribers table policies
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriber record" 
ON public.subscribers 
FOR ALL 
USING (auth.uid() = user_id);

-- Entitlements table policies  
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entitlements" 
ON public.entitlements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage entitlements" 
ON public.entitlements 
FOR ALL 
USING (auth.role() = 'service_role');

-- Purchase history policies
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchase history" 
ON public.purchase_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage purchase history" 
ON public.purchase_history 
FOR ALL 
USING (auth.role() = 'service_role');

-- Webhook signatures policies (admin only)
ALTER TABLE public.webhook_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook signatures" 
ON public.webhook_signatures 
FOR ALL 
USING (auth.role() = 'service_role');

-- Functions for RevenueCat integration

-- Function to sync RevenueCat customer info
CREATE OR REPLACE FUNCTION public.sync_revenue_cat_customer(
  p_user_id UUID,
  p_revenue_cat_user_id TEXT,
  p_customer_info JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update or create subscriber record
  INSERT INTO public.subscribers (
    user_id, 
    revenue_cat_user_id, 
    last_seen,
    custom_attributes
  ) VALUES (
    p_user_id,
    p_revenue_cat_user_id,
    now(),
    COALESCE(p_customer_info -> 'subscriber_attributes', '{}')
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    revenue_cat_user_id = EXCLUDED.revenue_cat_user_id,
    last_seen = now(),
    custom_attributes = COALESCE(p_customer_info -> 'subscriber_attributes', '{}'),
    updated_at = now();

  -- Update entitlements from customer info
  IF p_customer_info ? 'entitlements' THEN
    -- Clear existing entitlements
    UPDATE public.entitlements 
    SET is_active = false, updated_at = now()
    WHERE user_id = p_user_id;

    -- Insert/update active entitlements
    INSERT INTO public.entitlements (
      user_id,
      identifier,
      product_identifier,
      is_active,
      will_renew,
      period_type,
      latest_purchase_date,
      original_purchase_date,
      expiration_date,
      store,
      is_sandbox
    )
    SELECT 
      p_user_id,
      entitlement.key,
      entitlement.value ->> 'product_identifier',
      true,
      COALESCE((entitlement.value ->> 'will_renew')::boolean, false),
      entitlement.value ->> 'period_type',
      to_timestamp((entitlement.value ->> 'latest_purchase_date_ms')::bigint / 1000),
      to_timestamp((entitlement.value ->> 'original_purchase_date_ms')::bigint / 1000),
      to_timestamp((entitlement.value ->> 'expiration_date_ms')::bigint / 1000),
      entitlement.value ->> 'store',
      COALESCE((p_customer_info ->> 'is_sandbox')::boolean, false)
    FROM jsonb_each(p_customer_info -> 'entitlements' -> 'active') AS entitlement
    ON CONFLICT (user_id, identifier)
    DO UPDATE SET
      product_identifier = EXCLUDED.product_identifier,
      is_active = EXCLUDED.is_active,
      will_renew = EXCLUDED.will_renew,
      period_type = EXCLUDED.period_type,
      latest_purchase_date = EXCLUDED.latest_purchase_date,
      original_purchase_date = EXCLUDED.original_purchase_date,
      expiration_date = EXCLUDED.expiration_date,
      store = EXCLUDED.store,
      is_sandbox = EXCLUDED.is_sandbox,
      updated_at = now();
  END IF;
END;
$$;

-- Function to get user's premium access details (updated for RevenueCat)
CREATE OR REPLACE FUNCTION public.get_premium_access_details(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSON;
  subscription_record RECORD;
  entitlement_record RECORD;
  partner_access RECORD;
BEGIN
  -- Check for active entitlements first (RevenueCat way)
  SELECT * INTO entitlement_record
  FROM public.entitlements
  WHERE user_id = p_user_id 
    AND is_active = true 
    AND (expiration_date IS NULL OR expiration_date > now())
  LIMIT 1;

  -- Check subscription table as fallback
  SELECT * INTO subscription_record
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status IN ('trial', 'active')
    AND (current_period_end IS NULL OR current_period_end > now())
  LIMIT 1;

  -- Check partner access
  SELECT ps.*, s.status as partner_status, s.current_period_end as partner_period_end
  INTO partner_access
  FROM public.partner_subscriptions ps
  JOIN public.subscriptions s ON ps.subscription_id = s.id
  WHERE ps.partner_user_id = p_user_id 
    AND ps.is_active = true
    AND s.status IN ('trial', 'active')
    AND (s.current_period_end IS NULL OR s.current_period_end > now());

  -- Build result
  IF entitlement_record.id IS NOT NULL THEN
    result := json_build_object(
      'has_access', true,
      'access_type', 'own_subscription',
      'status', CASE 
        WHEN entitlement_record.period_type = 'TRIAL' THEN 'trial'
        ELSE 'active'
      END,
      'plan_type', 'premium',
      'expiration_date', entitlement_record.expiration_date,
      'will_renew', entitlement_record.will_renew,
      'store', entitlement_record.store
    );
  ELSIF subscription_record.id IS NOT NULL THEN
    result := json_build_object(
      'has_access', true,
      'access_type', 'own_subscription',
      'status', subscription_record.status,
      'plan_type', subscription_record.plan_type,
      'trial_end_date', subscription_record.trial_end_date,
      'current_period_end', subscription_record.current_period_end,
      'subscription_id', subscription_record.id
    );
  ELSIF partner_access.id IS NOT NULL THEN
    result := json_build_object(
      'has_access', true,
      'access_type', 'partner_linked',
      'status', partner_access.partner_status,
      'plan_type', 'premium',
      'current_period_end', partner_access.partner_period_end,
      'granted_by', partner_access.premium_user_id
    );
  ELSE
    result := json_build_object('has_access', false);
  END IF;

  RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.subscribers TO authenticated;
GRANT ALL ON public.entitlements TO authenticated;
GRANT ALL ON public.purchase_history TO authenticated;
GRANT ALL ON public.webhook_signatures TO service_role;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;