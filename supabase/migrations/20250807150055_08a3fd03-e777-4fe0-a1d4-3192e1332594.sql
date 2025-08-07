-- Create missing tables for RevenueCat integration

-- Create entitlements table
CREATE TABLE public.entitlements (
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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_entitlement UNIQUE(user_id, identifier)
);

-- Create purchase history table
CREATE TABLE public.purchase_history (
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

-- Add indexes
CREATE INDEX idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX idx_entitlements_active ON public.entitlements(is_active) WHERE is_active = true;
CREATE INDEX idx_purchase_history_user_id ON public.purchase_history(user_id);
CREATE INDEX idx_purchase_history_transaction_id ON public.purchase_history(transaction_id);

-- Enable RLS and create policies
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_signatures ENABLE ROW LEVEL SECURITY;

-- Subscribers policies
CREATE POLICY "Users can manage their own subscriber record" 
ON public.subscribers 
FOR ALL 
USING (auth.uid() = user_id);

-- Entitlements policies
CREATE POLICY "Users can view their own entitlements" 
ON public.entitlements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage entitlements" 
ON public.entitlements 
FOR ALL 
USING (auth.role() = 'service_role');

-- Purchase history policies
CREATE POLICY "Users can view their own purchase history" 
ON public.purchase_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage purchase history" 
ON public.purchase_history 
FOR ALL 
USING (auth.role() = 'service_role');

-- Webhook signatures policies
CREATE POLICY "Service role can manage webhook signatures" 
ON public.webhook_signatures 
FOR ALL 
USING (auth.role() = 'service_role');