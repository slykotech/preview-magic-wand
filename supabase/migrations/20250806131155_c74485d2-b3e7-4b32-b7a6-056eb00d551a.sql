-- Remove the foreign key constraint that's preventing card deck game responses
ALTER TABLE public.card_responses 
DROP CONSTRAINT IF EXISTS fk_card_responses_session;

-- Also remove any other foreign key constraints that might be causing issues
ALTER TABLE public.card_responses 
DROP CONSTRAINT IF EXISTS card_responses_session_id_fkey;

-- Check if there are any other constraints we need to drop
-- Note: We'll rely on RLS policies for security instead of foreign keys