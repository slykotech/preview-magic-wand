-- Create a couple relationship for the user (assuming they want to test with a partner)
-- For testing purposes, we'll create a couple with a placeholder partner ID
-- In a real app, users would invite their partners

-- First, let's check if user exists in profiles
INSERT INTO public.profiles (user_id, first_name, last_name)
VALUES ('32d62c79-d055-4cc5-b251-8c704051b72d', 'Pranay', 'Bhumagouni')
ON CONFLICT (user_id) DO NOTHING;

-- Create a dummy partner for testing
INSERT INTO public.profiles (user_id, first_name, last_name)
VALUES ('dummy-partner-uuid', 'Partner', 'Test')
ON CONFLICT (user_id) DO NOTHING;

-- Create couple relationship
INSERT INTO public.couples (user1_id, user2_id, relationship_start_date, status)
VALUES (
  '32d62c79-d055-4cc5-b251-8c704051b72d', 
  'dummy-partner-uuid',
  CURRENT_DATE,
  'active'
)
ON CONFLICT DO NOTHING;