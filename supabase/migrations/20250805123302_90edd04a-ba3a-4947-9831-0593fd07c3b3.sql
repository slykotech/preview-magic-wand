-- Create Love Grants table for TikTok Toe Heart Game rewards
CREATE TABLE IF NOT EXISTS public.love_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  winner_user_id UUID NOT NULL,
  winner_name TEXT NOT NULL,
  winner_symbol TEXT NOT NULL CHECK (winner_symbol IN ('💖', '💘')),
  request_text TEXT NOT NULL,
  game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'fulfilled')),
  response_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.love_grants ENABLE ROW LEVEL SECURITY;

-- Create policies for couple members to manage their love grants
CREATE POLICY "Couple members can view their love grants" 
ON public.love_grants 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.couples c
  WHERE c.id = love_grants.couple_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Couple members can create love grants" 
ON public.love_grants 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.couples c
  WHERE c.id = love_grants.couple_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
) AND winner_user_id = auth.uid());

CREATE POLICY "Couple members can update their love grants" 
ON public.love_grants 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.couples c
  WHERE c.id = love_grants.couple_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

-- Create trigger for updated_at
CREATE TRIGGER update_love_grants_updated_at
  BEFORE UPDATE ON public.love_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add table to realtime for instant notifications
ALTER TABLE public.love_grants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.love_grants;