-- Add trial handling to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_days_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method_collected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS billing_issue_type TEXT,
ADD COLUMN IF NOT EXISTS billing_issue_resolved BOOLEAN DEFAULT true;

-- Create subscription events table for tracking trial events
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'trial_started', 'trial_ending', 'trial_converted', 'payment_failed', etc.
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription events
CREATE POLICY "Users can view their own subscription events" 
ON public.subscription_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription events" 
ON public.subscription_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON public.subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial ON public.subscriptions(trial_end_date) WHERE is_trial = true;