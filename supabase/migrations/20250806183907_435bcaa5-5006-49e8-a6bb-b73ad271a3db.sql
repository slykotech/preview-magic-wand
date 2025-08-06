-- Drop the existing function first to avoid conflicts
DROP FUNCTION IF EXISTS public.get_premium_access_details(UUID);

-- Add new columns for enhanced subscription management
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS billing_issue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS revenue_cat_customer_id TEXT,
ADD COLUMN IF NOT EXISTS revenue_cat_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS revenue_cat_original_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS store TEXT,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Add action_required column to subscription notifications
ALTER TABLE public.subscription_notifications 
ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false;

-- Add RevenueCat customer ID to profiles for webhook mapping
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS revenue_cat_customer_id TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_revenue_cat_customer_id 
ON public.profiles(revenue_cat_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_last_synced 
ON public.subscriptions(last_synced_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_issue 
ON public.subscriptions(billing_issue, grace_period_end) 
WHERE billing_issue = true;

-- Enhanced function to sync subscription status across devices
CREATE OR REPLACE FUNCTION public.sync_subscription_status(
  p_user_id UUID,
  p_revenue_cat_status JSONB DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_subscription RECORD;
  status_changed BOOLEAN := false;
  new_status TEXT;
BEGIN
  -- Get current subscription
  SELECT * INTO current_subscription
  FROM public.subscriptions 
  WHERE user_id = p_user_id;
  
  -- If no subscription exists, return early
  IF current_subscription IS NULL THEN
    RETURN jsonb_build_object(
      'status_changed', false,
      'message', 'No subscription found'
    );
  END IF;
  
  -- Determine new status based on RevenueCat data
  IF p_revenue_cat_status IS NOT NULL THEN
    IF (p_revenue_cat_status->>'hasActiveSubscription')::boolean = true THEN
      new_status := 'active';
    ELSE
      -- Check if subscription should be expired
      IF current_subscription.current_period_end < now() THEN
        new_status := 'expired';
      ELSE
        new_status := current_subscription.status;
      END IF;
    END IF;
  ELSE
    -- Check local expiration
    IF current_subscription.current_period_end < now() AND current_subscription.status = 'active' THEN
      new_status := 'expired';
    ELSE
      new_status := current_subscription.status;
    END IF;
  END IF;
  
  -- Update if status changed
  IF new_status != current_subscription.status THEN
    UPDATE public.subscriptions 
    SET status = new_status,
        last_synced_at = now(),
        device_id = COALESCE(p_device_id, device_id)
    WHERE user_id = p_user_id;
    
    status_changed := true;
    
    -- Create sync notification if significant change
    IF new_status IN ('expired', 'cancelled') THEN
      INSERT INTO public.subscription_notifications (
        user_id,
        notification_type,
        title,
        message
      ) VALUES (
        p_user_id,
        'status_sync',
        'Subscription Status Updated',
        'Your subscription status has been synchronized: ' || new_status
      );
    END IF;
  ELSE
    -- Update sync timestamp even if no status change
    UPDATE public.subscriptions 
    SET last_synced_at = now(),
        device_id = COALESCE(p_device_id, device_id)
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'status_changed', status_changed,
    'old_status', current_subscription.status,
    'new_status', new_status,
    'last_synced_at', now()
  );
END;
$$;

-- Enhanced function to check billing status
CREATE OR REPLACE FUNCTION public.check_billing_status(
  p_user_id UUID,
  p_subscription_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  subscription_record RECORD;
  grace_days_remaining INTEGER;
  action_required BOOLEAN := false;
BEGIN
  -- Get subscription details
  SELECT * INTO subscription_record
  FROM public.subscriptions 
  WHERE id = p_subscription_id AND user_id = p_user_id;
  
  IF subscription_record IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Subscription not found'
    );
  END IF;
  
  -- Check for billing issues
  IF subscription_record.billing_issue = true THEN
    -- Calculate grace period remaining
    IF subscription_record.grace_period_end IS NOT NULL THEN
      grace_days_remaining := EXTRACT(days FROM subscription_record.grace_period_end - now());
      
      -- Action required if grace period is ending soon
      IF grace_days_remaining <= 3 THEN
        action_required := true;
      END IF;
      
      RETURN jsonb_build_object(
        'billing_issue', true,
        'grace_period_end', subscription_record.grace_period_end,
        'grace_days_remaining', GREATEST(grace_days_remaining, 0),
        'action_required', action_required
      );
    END IF;
  END IF;
  
  -- No billing issues
  RETURN jsonb_build_object(
    'billing_issue', false,
    'action_required', false
  );
END;
$$;

-- Recreate the enhanced function to get premium access details with billing status
CREATE OR REPLACE FUNCTION public.get_premium_access_details(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  own_subscription RECORD;
  partner_access RECORD;
BEGIN
  -- Check user's own subscription
  SELECT s.*, 
         CASE 
           WHEN s.billing_issue = true AND s.grace_period_end > now() THEN true
           WHEN s.status IN ('trial', 'active') AND 
                (s.trial_end_date IS NULL OR s.trial_end_date > now()) AND
                (s.current_period_end IS NULL OR s.current_period_end > now()) THEN true
           ELSE false
         END as has_access
  INTO own_subscription
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;
  
  IF own_subscription.has_access THEN
    RETURN jsonb_build_object(
      'has_access', true,
      'access_type', 'own_subscription',
      'status', own_subscription.status,
      'plan_type', own_subscription.plan_type,
      'trial_end_date', own_subscription.trial_end_date,
      'current_period_end', own_subscription.current_period_end,
      'subscription_id', own_subscription.id,
      'billing_issue', COALESCE(own_subscription.billing_issue, false),
      'grace_period_end', own_subscription.grace_period_end
    );
  END IF;
  
  -- Check partner access
  SELECT ps.*, s.status as subscription_status, s.plan_type, s.current_period_end, s.billing_issue
  INTO partner_access
  FROM public.partner_subscriptions ps
  JOIN public.subscriptions s ON ps.subscription_id = s.id
  WHERE ps.partner_user_id = p_user_id 
    AND ps.is_active = true 
    AND ps.revoked_at IS NULL
    AND s.status IN ('trial', 'active')
    AND (s.trial_end_date IS NULL OR s.trial_end_date > now())
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
  LIMIT 1;
  
  IF partner_access.subscription_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'has_access', true,
      'access_type', 'partner_linked',
      'status', partner_access.subscription_status,
      'plan_type', partner_access.plan_type,
      'current_period_end', partner_access.current_period_end,
      'subscription_id', partner_access.subscription_id,
      'granted_by', partner_access.premium_user_id,
      'billing_issue', COALESCE(partner_access.billing_issue, false)
    );
  END IF;
  
  -- No access found
  RETURN jsonb_build_object(
    'has_access', false
  );
END;
$$;