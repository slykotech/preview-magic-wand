-- Add partner request system tables
CREATE TABLE public.partner_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_email TEXT NOT NULL,
  requested_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, requested_email)
);

-- Enable RLS
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;

-- Policies for partner requests
CREATE POLICY "Users can view requests sent to them or by them" 
ON public.partner_requests 
FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = requested_user_id OR auth.email() = requested_email);

CREATE POLICY "Users can create partner requests" 
ON public.partner_requests 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update requests sent to them" 
ON public.partner_requests 
FOR UPDATE 
USING (auth.uid() = requested_user_id OR auth.email() = requested_email);

-- Create function to automatically expire old requests
CREATE OR REPLACE FUNCTION public.expire_old_partner_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.partner_requests 
  SET status = 'expired' 
  WHERE status = 'pending' 
  AND expires_at < now();
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_partner_requests_updated_at
BEFORE UPDATE ON public.partner_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();