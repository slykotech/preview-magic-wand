-- Fix function conflict and enhance subscription system

-- Drop existing function that conflicts
DROP FUNCTION IF EXISTS public.get_premium_access_details(uuid);

-- Add missing columns to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS revenue_cat_original_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS revenue_cat_environment TEXT DEFAULT 'production',
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method_collected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_family_share BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS takehome_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS presented_offering_id TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Create subscription events table for analytics
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  revenue_cat_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Create partner subscriptions table
CREATE TABLE IF NOT EXISTS public.partner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  premium_user_id UUID NOT NULL,
  partner_user_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL DEFAULT 'partner_linked',
  is_active BOOLEAN DEFAULT TRUE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(premium_user_id, partner_user_id)
);

-- Create partner invitations table
CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  premium_user_id UUID NOT NULL,
  invited_email TEXT NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE DEFAULT generate_invitation_token(),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create device sessions table for cross-platform sync
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  device_type TEXT,
  platform TEXT,
  app_version TEXT,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  revenue_cat_app_user_id TEXT,
  subscription_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Create webhook signatures table for security
CREATE TABLE IF NOT EXISTS public.webhook_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT NOT NULL,
  signature TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  verified BOOLEAN DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'revenuecat'
);

-- Enable RLS on all new tables
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_signatures ENABLE ROW LEVEL SECURITY;