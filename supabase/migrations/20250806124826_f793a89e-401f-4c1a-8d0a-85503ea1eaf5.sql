-- Update the get_premium_access_details function to include whitelisted emails
CREATE OR REPLACE FUNCTION public.get_premium_access_details(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  own_subscription RECORD;
  partner_access RECORD;
  user_email TEXT;
  whitelisted_emails TEXT[] := ARRAY[
    'mrbeast280320@gmail.com',
    'varun@slyko.tech', 
    'yalagalasuryasekhar@gmail.com',
    'surya@slyko.tech',
    'pranay@slyko.tech'
  ];
BEGIN
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = p_user_id;
  
  -- Check if user email is whitelisted
  IF user_email = ANY(whitelisted_emails) THEN
    result := json_build_object(
      'has_access', true,
      'access_type', 'whitelisted',
      'status', 'active',
      'plan_type', 'premium'
    );
    RETURN result;
  END IF;
  
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
$function$;