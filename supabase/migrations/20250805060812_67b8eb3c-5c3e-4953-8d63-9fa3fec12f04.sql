-- Create relationship_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.relationship_status AS ENUM ('dating', 'engaged', 'married', 'complicated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update couples table with proper constraints (allowing demo connections)
ALTER TABLE public.couples DROP CONSTRAINT IF EXISTS unique_couple;

-- Add unique constraint that allows demo connections
CREATE UNIQUE INDEX IF NOT EXISTS idx_couples_unique_pair ON public.couples 
(LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- Ensure partner_requests table has all required columns and constraints
ALTER TABLE public.partner_requests DROP CONSTRAINT IF EXISTS unique_requester_email;
ALTER TABLE public.partner_requests DROP CONSTRAINT IF EXISTS valid_status;

-- Add proper constraints to partner_requests
ALTER TABLE public.partner_requests 
ADD CONSTRAINT unique_requester_email UNIQUE(requester_id, requested_email),
ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired'));

-- Create index for better performance on couples lookup
CREATE INDEX IF NOT EXISTS idx_couples_user1 ON public.couples(user1_id);
CREATE INDEX IF NOT EXISTS idx_couples_user2 ON public.couples(user2_id);

-- Create index for partner requests
CREATE INDEX IF NOT EXISTS idx_partner_requests_requester ON public.partner_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_partner_requests_email ON public.partner_requests(requested_email);
CREATE INDEX IF NOT EXISTS idx_partner_requests_status ON public.partner_requests(status);

-- Function to prevent multiple connections (allowing demo mode)
CREATE OR REPLACE FUNCTION public.check_single_partner_rule()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow demo connections (user connecting to themselves)
  IF NEW.user1_id = NEW.user2_id THEN
    -- Check if user already has a real partner
    IF EXISTS (
      SELECT 1 FROM public.couples 
      WHERE (user1_id = NEW.user1_id OR user2_id = NEW.user1_id) 
      AND user1_id != user2_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'User % already has a real partner, cannot create demo connection', NEW.user1_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- For real connections, check if either user is already connected
  IF EXISTS (
    SELECT 1 FROM public.couples 
    WHERE (user1_id = NEW.user1_id OR user2_id = NEW.user1_id) 
    AND user1_id != user2_id -- Only check real connections
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'User % is already connected to a partner', NEW.user1_id;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.couples 
    WHERE (user1_id = NEW.user2_id OR user2_id = NEW.user2_id) 
    AND user1_id != user2_id -- Only check real connections
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'User % is already connected to a partner', NEW.user2_id;
  END IF;
  
  -- Clean up any demo connections when creating real connection
  DELETE FROM public.couples 
  WHERE (user1_id = NEW.user1_id AND user2_id = NEW.user1_id)
     OR (user1_id = NEW.user2_id AND user2_id = NEW.user2_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single partner rule
DROP TRIGGER IF EXISTS enforce_single_partner ON public.couples;
CREATE TRIGGER enforce_single_partner
  BEFORE INSERT OR UPDATE ON public.couples
  FOR EACH ROW EXECUTE FUNCTION public.check_single_partner_rule();

-- Function to clean up demo connections when real partner connects
CREATE OR REPLACE FUNCTION public.cleanup_demo_connection(p_user_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM public.couples 
  WHERE user1_id = p_user_id 
  AND user2_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user already has a partner
CREATE OR REPLACE FUNCTION public.user_has_partner(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.couples 
    WHERE (user1_id = p_user_id OR user2_id = p_user_id)
    AND user1_id != user2_id  -- Exclude demo connections
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;