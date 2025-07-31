-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'image')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Couple members can view their conversations" 
ON public.conversations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM couples 
    WHERE couples.id = conversations.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM couples 
    WHERE couples.id = conversations.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can update their conversations" 
ON public.conversations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM couples 
    WHERE couples.id = conversations.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

-- RLS Policies for messages
CREATE POLICY "Couple members can view their messages" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN couples cp ON c.couple_id = cp.id
    WHERE c.id = messages.conversation_id 
    AND (cp.user1_id = auth.uid() OR cp.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can create messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN couples cp ON c.couple_id = cp.id
    WHERE c.id = messages.conversation_id 
    AND (cp.user1_id = auth.uid() OR cp.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can update messages" 
ON public.messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN couples cp ON c.couple_id = cp.id
    WHERE c.id = messages.conversation_id 
    AND (cp.user1_id = auth.uid() OR cp.user2_id = auth.uid())
  )
);

-- Add foreign key constraints
ALTER TABLE public.conversations ADD CONSTRAINT conversations_couple_id_fkey 
  FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE;

ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Create updated_at trigger for conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for messages
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;