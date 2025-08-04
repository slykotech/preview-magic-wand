-- Add DELETE policy for date_ideas table
-- This allows couple members to delete date ideas from their couple

CREATE POLICY "Couple members can delete date ideas" 
ON public.date_ideas 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM couples
  WHERE couples.id = date_ideas.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));