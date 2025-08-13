-- Add user to admin whitelist for full access
INSERT INTO public.admin_whitelist (
  email, 
  full_access, 
  notes,
  created_by
) VALUES (
  'pranaybhumagouni@gmail.com',
  true,
  'Admin access granted - full app access without subscription requirements',
  (SELECT id FROM auth.users WHERE email = 'pranaybhumagouni@gmail.com' LIMIT 1)
) ON CONFLICT (email) 
DO UPDATE SET 
  full_access = true,
  notes = 'Admin access granted - full app access without subscription requirements',
  updated_at = now();