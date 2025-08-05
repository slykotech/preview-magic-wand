-- Fix the security warnings by adding SET search_path to functions
CREATE OR REPLACE FUNCTION public.check_single_partner_rule()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.cleanup_demo_connection(p_user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.couples 
  WHERE user1_id = p_user_id 
  AND user2_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_partner(p_user_id uuid)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.couples 
    WHERE (user1_id = p_user_id OR user2_id = p_user_id)
    AND user1_id != user2_id  -- Exclude demo connections
  );
END;
$$;