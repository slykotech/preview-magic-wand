-- Add response functionality to love_grants table
ALTER TABLE public.love_grants 
ADD COLUMN IF NOT EXISTS partner_response text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS responded_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT NULL;

-- Update status enum to include more states
-- Note: PostgreSQL doesn't allow direct enum modification, so we handle this in the application logic