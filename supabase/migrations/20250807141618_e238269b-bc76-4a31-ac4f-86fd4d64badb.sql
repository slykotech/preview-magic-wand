-- Fix function conflicts and add remaining policies/functions

-- Drop conflicting functions
DROP FUNCTION IF EXISTS public.sync_subscription_status(uuid,jsonb,text);
DROP FUNCTION IF EXISTS public.check_billing_status(uuid,uuid);
DROP FUNCTION IF EXISTS public.accept_partner_invitation(text,uuid);

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON public.subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_partner_user ON public.partner_subscriptions(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_premium_user ON public.partner_subscriptions(premium_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_token ON public.partner_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_device ON public.device_sessions(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_webhook_signatures_webhook_id ON public.webhook_signatures(webhook_id);