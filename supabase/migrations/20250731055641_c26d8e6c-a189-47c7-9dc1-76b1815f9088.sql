-- Fix missing delete policies for memories and memory_images tables

-- Add delete policy for memories table
CREATE POLICY "Couple members can delete memories" 
ON public.memories 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM couples
  WHERE ((couples.id = memories.couple_id) AND ((couples.user1_id = auth.uid()) OR (couples.user2_id = auth.uid())))
));