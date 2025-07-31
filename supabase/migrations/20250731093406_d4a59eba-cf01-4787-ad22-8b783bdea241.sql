-- Configure Auth settings for better security
-- Update auth config for OTP expiry (set to 1 hour = 3600 seconds)
UPDATE auth.config SET 
  otp_expiry = 3600
WHERE id = 1;

-- Enable leaked password protection
UPDATE auth.config SET 
  enable_password_breached_protection = true
WHERE id = 1;