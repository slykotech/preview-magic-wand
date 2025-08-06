-- Add users to admin whitelist for full premium access
INSERT INTO public.admin_whitelist (email, full_access, notes, created_by) 
VALUES 
  ('mrbeast280320@gmail.com', true, 'Admin whitelisted user with full premium access', auth.uid()),
  ('pranay@slyko.tech', true, 'Admin whitelisted user with full premium access', auth.uid())
ON CONFLICT (email) 
DO UPDATE SET 
  full_access = true,
  notes = 'Admin whitelisted user with full premium access',
  updated_at = now();