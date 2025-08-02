-- Create message_reactions table to store emoji reactions
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Couple members can view message reactions" 
ON public.message_reactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    JOIN couples cp ON c.couple_id = cp.id
    WHERE m.id = message_reactions.message_id 
      AND (cp.user1_id = auth.uid() OR cp.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can create message reactions" 
ON public.message_reactions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    JOIN couples cp ON c.couple_id = cp.id
    WHERE m.id = message_reactions.message_id 
      AND (cp.user1_id = auth.uid() OR cp.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can delete their own message reactions" 
ON public.message_reactions 
FOR DELETE 
USING (auth.uid() = user_id);