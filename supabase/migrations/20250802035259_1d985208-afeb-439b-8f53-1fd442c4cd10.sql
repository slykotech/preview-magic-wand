-- Create pending_verifications table for email verification flow
CREATE TABLE public.pending_verifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    verification_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    
    -- Indexes for performance
    UNIQUE(email, status) -- Only one pending verification per email
);

-- Create index for token lookups
CREATE INDEX idx_pending_verifications_token ON public.pending_verifications(verification_token);
CREATE INDEX idx_pending_verifications_email_status ON public.pending_verifications(email, status);

-- Enable RLS
ALTER TABLE public.pending_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending_verifications
CREATE POLICY "Users can view their own verification records" 
ON public.pending_verifications 
FOR SELECT 
USING (auth.email() = email);

-- Service role can manage all verification records (for edge functions)
CREATE POLICY "Service role can manage all verification records" 
ON public.pending_verifications 
FOR ALL 
USING (auth.role() = 'service_role');

-- Add trigger to automatically cleanup expired verifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.pending_verifications 
  SET status = 'expired' 
  WHERE status = 'pending' 
    AND expires_at < now();
END;
$$;

-- Create trigger to update expired verifications periodically
-- This will be called by a cron job or manually
-- For now, we'll rely on the edge function to check expiration