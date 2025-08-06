-- Add columns to subscriptions table to store plan selection details
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS selected_plan_name TEXT,
ADD COLUMN IF NOT EXISTS plan_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS plan_period TEXT,
ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS discount_code TEXT;