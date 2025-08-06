-- Enable RLS on subscriptions table if not already enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Partner access to subscriptions" ON public.subscriptions;

-- Create RLS policies for subscriptions table
CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for system operations)
CREATE POLICY "Service role can manage all subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (auth.role() = 'service_role');

-- Allow partner access through partner_subscriptions
CREATE POLICY "Partner access to subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.partner_subscriptions ps 
    WHERE ps.subscription_id = id 
    AND ps.partner_user_id = auth.uid() 
    AND ps.is_active = true 
    AND ps.revoked_at IS NULL
  )
);