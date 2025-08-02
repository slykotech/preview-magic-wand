-- Create table to track when each user clears their chat view
CREATE TABLE public.user_conversation_clears (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  cleared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS
ALTER TABLE public.user_conversation_clears ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own conversation clears" 
ON public.user_conversation_clears 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);