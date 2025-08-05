-- Create table for tic toe heart game state
CREATE TABLE IF NOT EXISTS public.tic_toe_heart_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  board JSONB NOT NULL DEFAULT '[[null,null,null],[null,null,null],[null,null,null]]',
  current_player_id UUID NOT NULL,
  game_status TEXT NOT NULL DEFAULT 'playing' CHECK (game_status IN ('playing', 'won', 'draw', 'abandoned')),
  winner_id UUID NULL,
  moves_count INTEGER NOT NULL DEFAULT 0,
  last_move_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tic_toe_heart_games ENABLE ROW LEVEL SECURITY;

-- Create policies for couple members to manage their game states
CREATE POLICY "Couple members can view their tic toe heart games" 
ON public.tic_toe_heart_games 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.game_sessions gs
  JOIN public.couples c ON gs.couple_id = c.id
  WHERE gs.id = tic_toe_heart_games.session_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Couple members can create tic toe heart games" 
ON public.tic_toe_heart_games 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.game_sessions gs
  JOIN public.couples c ON gs.couple_id = c.id
  WHERE gs.id = tic_toe_heart_games.session_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Couple members can update their tic toe heart games" 
ON public.tic_toe_heart_games 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.game_sessions gs
  JOIN public.couples c ON gs.couple_id = c.id
  WHERE gs.id = tic_toe_heart_games.session_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

-- Create trigger for updated_at
CREATE TRIGGER update_tic_toe_heart_games_updated_at
  BEFORE UPDATE ON public.tic_toe_heart_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add table to realtime
ALTER TABLE public.tic_toe_heart_games REPLICA IDENTITY FULL;