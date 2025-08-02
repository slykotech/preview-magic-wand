-- Add DELETE policy for messages table so users can clear their chat
CREATE POLICY "Couple members can delete messages" 
ON public.messages 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM conversations c
    JOIN couples cp ON c.couple_id = cp.id
    WHERE c.id = messages.conversation_id 
      AND (cp.user1_id = auth.uid() OR cp.user2_id = auth.uid())
  )
);