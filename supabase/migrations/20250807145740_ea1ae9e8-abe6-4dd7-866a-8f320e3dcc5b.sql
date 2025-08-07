-- Enhanced RevenueCat subscription system - Step by step approach

-- First, create the subscriber table without the unique constraint on revenue_cat_user_id
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revenue_cat_user_id TEXT NOT NULL,
  original_app_user_id TEXT,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  platform TEXT,
  app_version TEXT,
  attribution_data JSONB DEFAULT '{}',
  custom_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraints after table creation
DO $$
BEGIN
  -- Add unique constraint on user_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_subscriber' 
    AND table_name = 'subscribers'
  ) THEN
    ALTER TABLE public.subscribers ADD CONSTRAINT unique_user_subscriber UNIQUE(user_id);
  END IF;
  
  -- Add unique constraint on revenue_cat_user_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_revenue_cat_user' 
    AND table_name = 'subscribers'
  ) THEN
    ALTER TABLE public.subscribers ADD CONSTRAINT unique_revenue_cat_user UNIQUE(revenue_cat_user_id);
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscribers_revenue_cat_user_id ON public.subscribers(revenue_cat_user_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers(user_id);

-- Add webhook signatures table
CREATE TABLE IF NOT EXISTS public.webhook_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  signature TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL,
  payload_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add entitlements table
CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  product_identifier TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  will_renew BOOLEAN NOT NULL DEFAULT false,
  period_type TEXT,
  latest_purchase_date TIMESTAMP WITH TIME ZONE,
  original_purchase_date TIMESTAMP WITH TIME ZONE,
  expiration_date TIMESTAMP WITH TIME ZONE,
  store TEXT,
  is_sandbox BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for entitlements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_entitlement' 
    AND table_name = 'entitlements'
  ) THEN
    ALTER TABLE public.entitlements ADD CONSTRAINT unique_user_entitlement UNIQUE(user_id, identifier);
  END IF;
END $$;

-- Add indexes for entitlements
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_active ON public.entitlements(is_active) WHERE is_active = true;

-- Add purchase history table
CREATE TABLE IF NOT EXISTS public.purchase_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  original_transaction_id TEXT,
  product_id TEXT NOT NULL,
  store TEXT NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revenue_cat_event_id TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  country_code TEXT,
  is_family_share BOOLEAN DEFAULT false,
  is_restore BOOLEAN DEFAULT false,
  environment TEXT DEFAULT 'production',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for purchase history
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON public.purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_transaction_id ON public.purchase_history(transaction_id);

-- Add missing fields to existing subscriptions table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscriptions' 
                 AND column_name = 'next_billing_date' 
                 AND table_schema = 'public') THEN
    ALTER TABLE public.subscriptions ADD COLUMN next_billing_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscriptions' 
                 AND column_name = 'billing_period' 
                 AND table_schema = 'public') THEN
    ALTER TABLE public.subscriptions ADD COLUMN billing_period TEXT DEFAULT 'monthly';
  END IF;
END $$;