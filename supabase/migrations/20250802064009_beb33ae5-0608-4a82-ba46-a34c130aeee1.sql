-- Add invitation_context column to pending_verifications table
ALTER TABLE public.pending_verifications 
ADD COLUMN invitation_context TEXT;