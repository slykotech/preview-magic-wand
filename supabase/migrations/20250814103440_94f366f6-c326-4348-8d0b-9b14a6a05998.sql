-- Create love_grants table with complete lifecycle support
CREATE TABLE IF NOT EXISTS public.love_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL,
  couple_id UUID NOT NULL,
  winner_user_id UUID NOT NULL,
  winner_name TEXT NOT NULL,
  winner_symbol TEXT NOT NULL,
  request_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'fulfilled', 'declined', 'expired', 'cancelled')),
  response_text TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.love_grants ENABLE ROW LEVEL SECURITY;

-- Create policies for love grants
CREATE POLICY "Couple members can view their love grants"
ON public.love_grants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.couples c
    WHERE c.id = love_grants.couple_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

CREATE POLICY "Winners can create love grants"
ON public.love_grants
FOR INSERT
WITH CHECK (
  auth.uid() = winner_user_id
  AND EXISTS (
    SELECT 1 FROM public.couples c
    WHERE c.id = love_grants.couple_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can update love grants"
ON public.love_grants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.couples c
    WHERE c.id = love_grants.couple_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

-- Create index for performance
CREATE INDEX idx_love_grants_game_id ON public.love_grants(game_id);
CREATE INDEX idx_love_grants_couple_id ON public.love_grants(couple_id);
CREATE INDEX idx_love_grants_status ON public.love_grants(status);

-- Add realtime support
ALTER TABLE public.love_grants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.love_grants;