-- Create admin whitelist table
CREATE TABLE public.admin_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable RLS on admin_whitelist
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage whitelist
CREATE POLICY "Service role can manage admin whitelist"
ON public.admin_whitelist
FOR ALL 
USING (auth.role() = 'service_role');

-- Allow authenticated users to check if they're whitelisted
CREATE POLICY "Users can check their own whitelist status"
ON public.admin_whitelist
FOR SELECT
USING (auth.jwt()->>'email' = email);

-- Insert the specific email into whitelist
INSERT INTO public.admin_whitelist (email, full_access, notes)
VALUES ('mrbeast280320@gmail.com', true, 'Admin access - full features unlocked');

-- Create function to check if user is whitelisted
CREATE OR REPLACE FUNCTION public.is_user_whitelisted(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_whitelist 
    WHERE email = user_email AND full_access = true
  );
END;
$$;

-- Update the has_premium_access function to include whitelisted users
CREATE OR REPLACE FUNCTION public.has_premium_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  has_own_subscription BOOLEAN := false;
  has_partner_access BOOLEAN := false;
  user_email TEXT;
  is_whitelisted BOOLEAN := false;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = p_user_id;
  
  -- Check if user is whitelisted (highest priority)
  IF user_email IS NOT NULL THEN
    SELECT public.is_user_whitelisted(user_email) INTO is_whitelisted;
    IF is_whitelisted THEN
      RETURN true;
    END IF;
  END IF;
  
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