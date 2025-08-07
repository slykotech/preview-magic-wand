-- Add RLS policies and functions to fix security issues

-- RLS Policies for subscription_events
CREATE POLICY "Users can view own subscription events" ON public.subscription_events
FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for partner_subscriptions
CREATE POLICY "Users can view own partner subscriptions" ON public.partner_subscriptions
FOR SELECT USING (auth.uid() = premium_user_id OR auth.uid() = partner_user_id);

CREATE POLICY "Premium users can manage partner access" ON public.partner_subscriptions
FOR ALL USING (auth.uid() = premium_user_id);

-- RLS Policies for partner_invitations
CREATE POLICY "Users can view own invitations" ON public.partner_invitations
FOR ALL USING (auth.uid() = premium_user_id);

-- RLS Policies for device_sessions
CREATE POLICY "Users can manage own device sessions" ON public.device_sessions
FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for webhook_signatures (admin only)
CREATE POLICY "Only service role can access webhook signatures" ON public.webhook_signatures
FOR ALL USING (auth.role() = 'service_role');

-- Enhanced function to get premium access details
CREATE OR REPLACE FUNCTION public.get_premium_access_details(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSON;
  subscription_record public.subscriptions%ROWTYPE;
  partner_access_record public.partner_subscriptions%ROWTYPE;
BEGIN
  -- Check direct subscription
  SELECT * INTO subscription_record
  FROM public.subscriptions
  WHERE user_id = p_user_id
  AND status IN ('trial', 'active')
  ORDER BY created_at DESC
  LIMIT 1;

  IF subscription_record.id IS NOT NULL THEN
    result := json_build_object(
      'has_access', true,
      'access_type', 'own_subscription',
      'status', subscription_record.status,
      'plan_type', subscription_record.plan_type,
      'trial_end_date', subscription_record.trial_end_date,
      'current_period_end', subscription_record.current_period_end,
      'subscription_id', subscription_record.id,
      'billing_issue', COALESCE(subscription_record.billing_issue, false),
      'grace_period_end', subscription_record.grace_period_end
    );
    RETURN result;
  END IF;

  -- Check partner access
  SELECT ps.* INTO partner_access_record
  FROM public.partner_subscriptions ps
  JOIN public.subscriptions s ON ps.subscription_id = s.id
  WHERE ps.partner_user_id = p_user_id
  AND ps.is_active = true
  AND s.status IN ('trial', 'active')
  ORDER BY ps.created_at DESC
  LIMIT 1;

  IF partner_access_record.id IS NOT NULL THEN
    SELECT * INTO subscription_record
    FROM public.subscriptions
    WHERE id = partner_access_record.subscription_id;

    result := json_build_object(
      'has_access', true,
      'access_type', 'partner_linked',
      'status', subscription_record.status,
      'plan_type', 'family',
      'trial_end_date', subscription_record.trial_end_date,
      'current_period_end', subscription_record.current_period_end,
      'subscription_id', subscription_record.id,
      'granted_by', partner_access_record.premium_user_id,
      'billing_issue', COALESCE(subscription_record.billing_issue, false),
      'grace_period_end', subscription_record.grace_period_end
    );
    RETURN result;
  END IF;

  -- No access found
  result := json_build_object('has_access', false);
  RETURN result;
END;
$$;

-- Function to sync subscription status across devices
CREATE OR REPLACE FUNCTION public.sync_subscription_status(
  p_user_id UUID,
  p_revenue_cat_status JSONB DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_status TEXT;
  revenue_cat_active BOOLEAN := false;
  status_changed BOOLEAN := false;
  result JSON;
BEGIN
  -- Extract RevenueCat status if provided
  IF p_revenue_cat_status IS NOT NULL THEN
    revenue_cat_active := COALESCE((p_revenue_cat_status->>'hasActiveSubscription')::boolean, false);
  END IF;

  -- Get current subscription status
  SELECT status INTO current_status
  FROM public.subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Update device session
  IF p_device_id IS NOT NULL THEN
    INSERT INTO public.device_sessions (user_id, device_id, last_active_at, subscription_synced_at)
    VALUES (p_user_id, p_device_id, now(), now())
    ON CONFLICT (user_id, device_id)
    DO UPDATE SET
      last_active_at = now(),
      subscription_synced_at = now(),
      revenue_cat_app_user_id = COALESCE(
        (p_revenue_cat_status->'customerInfo'->>'originalAppUserId')::text,
        device_sessions.revenue_cat_app_user_id
      );
  END IF;

  -- Sync logic: if RevenueCat shows active but our DB shows expired/cancelled, update it
  IF revenue_cat_active AND current_status IN ('expired', 'cancelled') THEN
    UPDATE public.subscriptions
    SET 
      status = 'active',
      last_synced_at = now()
    WHERE user_id = p_user_id;
    
    status_changed := true;
  END IF;

  result := json_build_object(
    'status_changed', status_changed,
    'current_status', current_status,
    'revenue_cat_active', revenue_cat_active,
    'synced_at', now()
  );

  RETURN result;
END;
$$;

-- Function to check billing status
CREATE OR REPLACE FUNCTION public.check_billing_status(
  p_user_id UUID,
  p_subscription_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  subscription_record public.subscriptions%ROWTYPE;
  billing_issue_detected BOOLEAN := false;
  action_required BOOLEAN := false;
  result JSON;
BEGIN
  -- Get subscription record
  IF p_subscription_id IS NOT NULL THEN
    SELECT * INTO subscription_record
    FROM public.subscriptions
    WHERE id = p_subscription_id AND user_id = p_user_id;
  ELSE
    SELECT * INTO subscription_record
    FROM public.subscriptions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF subscription_record.id IS NULL THEN
    RETURN json_build_object('error', 'Subscription not found');
  END IF;

  -- Check for billing issues
  IF subscription_record.billing_issue = true THEN
    billing_issue_detected := true;
    
    -- Check if action is required (grace period ending soon)
    IF subscription_record.grace_period_end IS NOT NULL 
       AND subscription_record.grace_period_end <= (now() + INTERVAL '2 days') THEN
      action_required := true;
    END IF;
  END IF;

  result := json_build_object(
    'billing_issue', billing_issue_detected,
    'action_required', action_required,
    'grace_period_end', subscription_record.grace_period_end,
    'status', subscription_record.status
  );

  RETURN result;
END;
$$;

-- Function to handle partner invitation acceptance
CREATE OR REPLACE FUNCTION public.accept_partner_invitation(
  p_invitation_token TEXT,
  p_accepting_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invitation_record public.partner_invitations%ROWTYPE;
  subscription_record public.subscriptions%ROWTYPE;
  result JSON;
BEGIN
  -- Get invitation
  SELECT * INTO invitation_record
  FROM public.partner_invitations
  WHERE invitation_token = p_invitation_token
  AND status = 'pending'
  AND expires_at > now();

  IF invitation_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Get the premium user's subscription
  SELECT * INTO subscription_record
  FROM public.subscriptions
  WHERE user_id = invitation_record.premium_user_id
  AND status IN ('trial', 'active')
  ORDER BY created_at DESC
  LIMIT 1;

  IF subscription_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Premium subscription not found or inactive');
  END IF;

  -- Create partner subscription
  INSERT INTO public.partner_subscriptions (
    premium_user_id,
    partner_user_id,
    subscription_id,
    access_type
  ) VALUES (
    invitation_record.premium_user_id,
    p_accepting_user_id,
    subscription_record.id,
    'partner_linked'
  )
  ON CONFLICT (premium_user_id, partner_user_id)
  DO UPDATE SET
    is_active = true,
    granted_at = now(),
    revoked_at = NULL,
    revoke_reason = NULL;

  -- Update invitation status
  UPDATE public.partner_invitations
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by_user_id = p_accepting_user_id
  WHERE id = invitation_record.id;

  -- Create notification for both users
  INSERT INTO public.subscription_notifications (user_id, notification_type, title, message) VALUES
  (invitation_record.premium_user_id, 'partner_joined', 'Partner Joined!', 'Your partner has accepted the invitation and now has premium access.'),
  (p_accepting_user_id, 'premium_access_granted', 'Premium Access Granted!', 'You now have premium access through your partner''s subscription.');

  result := json_build_object(
    'success', true,
    'premium_user_id', invitation_record.premium_user_id,
    'access_type', 'partner_linked'
  );

  RETURN result;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON public.subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_partner_user ON public.partner_subscriptions(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_premium_user ON public.partner_subscriptions(premium_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_token ON public.partner_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_device ON public.device_sessions(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_webhook_signatures_webhook_id ON public.webhook_signatures(webhook_id);

-- Update existing triggers
CREATE OR REPLACE FUNCTION public.update_partner_subscriptions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_partner_invitations_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_partner_subscriptions_updated_at
    BEFORE UPDATE ON public.partner_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_partner_subscriptions_updated_at();

CREATE TRIGGER update_partner_invitations_updated_at
    BEFORE UPDATE ON public.partner_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_partner_invitations_updated_at();