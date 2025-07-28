-- Remove the different_users constraint that prevents demo setup
ALTER TABLE public.couples DROP CONSTRAINT IF EXISTS different_users;

-- Allow same user to be both partners for demo purposes
-- This enables solo testing of the app features