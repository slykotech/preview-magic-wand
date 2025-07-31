-- Update the RLS policy to allow users to update both requests sent to them AND requests they sent
DROP POLICY IF EXISTS "Users can update requests sent to them" ON partner_requests;

CREATE POLICY "Users can update partner requests they sent or received" 
ON partner_requests 
FOR UPDATE 
USING (
  (auth.uid() = requester_id) OR 
  (auth.uid() = requested_user_id) OR 
  (auth.email() = requested_email)
);