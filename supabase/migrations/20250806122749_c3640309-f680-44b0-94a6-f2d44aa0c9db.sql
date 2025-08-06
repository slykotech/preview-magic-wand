-- Add missing columns to profiles table for onboarding data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS relationship_type text,
ADD COLUMN IF NOT EXISTS relationship_goals jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subscription_plan text;