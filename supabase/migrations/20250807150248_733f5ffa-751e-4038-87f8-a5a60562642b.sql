-- Enable RLS only on user tables (not system tables)
-- This fixes security issues while avoiding system table conflicts

-- List of tables that should have RLS but might be missing it
DO $$
DECLARE
    user_tables TEXT[] := ARRAY[
        'admin_whitelist',
        'ai_coach_messages', 
        'ai_coach_sessions',
        'ai_coach_usage',
        'ai_generation_jobs',
        'api_cost_config',
        'api_usage_logs',
        'api_usage_tracking',
        'card_deck_game_sessions',
        'card_games',
        'card_responses',
        'cities',
        'conversations',
        'couple_activity_log',
        'couple_preferences',
        'couples',
        'daily_checkins',
        'date_ideas',
        'deck_cards',
        'device_sessions',
        'event_fetch_jobs',
        'events',
        'feedback_submissions',
        'game_achievements',
        'game_cards',
        'game_sessions',
        'historical_sync_scores',
        'important_dates',
        'love_grants',
        'memories',
        'messages',
        'partner_requests',
        'partner_subscriptions',
        'pending_verifications',
        'place_details',
        'profiles',
        'relationship_insights',
        'signup_invitations',
        'stories',
        'story_responses',
        'story_views',
        'subscription_events',
        'subscription_notifications',
        'subscriptions',
        'sync_scores',
        'user_api_quotas',
        'entitlements',
        'purchase_history',
        'subscribers',
        'webhook_signatures'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY user_tables
    LOOP
        -- Check if table exists and enable RLS
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);
            RAISE NOTICE 'Enabled RLS on table: %', table_name;
        END IF;
    END LOOP;
END $$;

-- Update function with proper search path
CREATE OR REPLACE FUNCTION public.get_premium_access_details(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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