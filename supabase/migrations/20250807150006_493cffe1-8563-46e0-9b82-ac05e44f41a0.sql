-- Complete the enhanced RevenueCat subscription system setup
-- This migration ensures all tables and policies are properly set up

-- Enable RLS on existing tables and add missing policies
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_signatures ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (these will only be created if they don't exist)
DO $$
BEGIN
  -- Subscribers policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscribers' AND policyname = 'Users can manage their own subscriber record') THEN
    CREATE POLICY "Users can manage their own subscriber record" 
    ON public.subscribers 
    FOR ALL 
    USING (auth.uid() = user_id);
  END IF;

  -- Entitlements policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'entitlements' AND policyname = 'Users can view their own entitlements') THEN
    CREATE POLICY "Users can view their own entitlements" 
    ON public.entitlements 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'entitlements' AND policyname = 'Service role can manage entitlements') THEN
    CREATE POLICY "Service role can manage entitlements" 
    ON public.entitlements 
    FOR ALL 
    USING (auth.role() = 'service_role');
  END IF;

  -- Purchase history policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_history' AND policyname = 'Users can view their own purchase history') THEN
    CREATE POLICY "Users can view their own purchase history" 
    ON public.purchase_history 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_history' AND policyname = 'Service role can manage purchase history') THEN
    CREATE POLICY "Service role can manage purchase history" 
    ON public.purchase_history 
    FOR ALL 
    USING (auth.role() = 'service_role');
  END IF;

  -- Webhook signatures policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_signatures' AND policyname = 'Service role can manage webhook signatures') THEN
    CREATE POLICY "Service role can manage webhook signatures" 
    ON public.webhook_signatures 
    FOR ALL 
    USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Create sync function for RevenueCat customer info
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

-- Create function to get user's premium access details with RevenueCat support
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