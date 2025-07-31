-- First, let's see what the current check constraint allows
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'partner_requests_status_check';

-- Drop the existing check constraint
ALTER TABLE partner_requests DROP CONSTRAINT IF EXISTS partner_requests_status_check;

-- Add a new check constraint that allows all the statuses we need
ALTER TABLE partner_requests 
ADD CONSTRAINT partner_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired'));