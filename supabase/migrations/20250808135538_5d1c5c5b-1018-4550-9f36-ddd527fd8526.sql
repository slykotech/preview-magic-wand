-- Update send-signup-invite function to handle password validation correctly
CREATE OR REPLACE FUNCTION public.validate_email_verification_redirect(verification_url text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- For mobile APK, redirect to the correct app URL instead of localhost
  IF verification_url LIKE '%localhost%' OR verification_url LIKE '%127.0.0.1%' THEN
    RETURN 'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com/verify-email';
  END IF;
  
  RETURN verification_url;
END;
$$;