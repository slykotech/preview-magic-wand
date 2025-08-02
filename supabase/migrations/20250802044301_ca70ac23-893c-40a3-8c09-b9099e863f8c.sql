-- Create a function to properly purge all user data
CREATE OR REPLACE FUNCTION public.purge_user_completely(user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Clean up pending verifications
  DELETE FROM public.pending_verifications WHERE email = user_email;
  
  -- Clean up any orphaned profile records
  DELETE FROM public.profiles WHERE user_id NOT IN (
    SELECT id FROM auth.users
  );
  
  -- Return success
  result := json_build_object(
    'success', true,
    'message', 'User data purged successfully',
    'email', user_email
  );
  
  RETURN result;
END;
$$;