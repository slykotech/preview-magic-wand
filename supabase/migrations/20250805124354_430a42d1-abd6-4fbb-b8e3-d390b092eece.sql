-- Create Heart Sync game tables for real-time romantic Tic-Tac-Toe

-- Games table for Heart Sync
CREATE TABLE public.heart_sync_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID NOT NULL,
  player2_id UUID NOT NULL,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  player1_symbol TEXT NOT NULL DEFAULT '💖',
  player2_symbol TEXT NOT NULL DEFAULT '💘',
  current_turn TEXT NOT NULL CHECK (current_turn IN ('player1', 'player2')),
  winner TEXT NULL CHECK (winner IN ('player1', 'player2', 'draw')),
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed')),
  board JSONB NOT NULL DEFAULT '[[null,null,null],[null,null,null],[null,null,null]]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Game moves table for tracking moves
CREATE TABLE public.heart_sync_moves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.heart_sync_games(id) ON DELETE CASCADE,
  row_position INTEGER NOT NULL CHECK (row_position >= 0 AND row_position <= 2),
  col_position INTEGER NOT NULL CHECK (col_position >= 0 AND col_position <= 2),
  symbol TEXT NOT NULL,
  moved_by UUID NOT NULL,
  move_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- HeartWish rewards table
CREATE TABLE public.heart_sync_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.heart_sync_games(id) ON DELETE CASCADE,
  asked_by UUID NOT NULL,
  asked_to UUID NOT NULL,
  question TEXT NOT NULL,
  answered BOOLEAN NOT NULL DEFAULT false,
  answer TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  answered_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS on all tables
ALTER TABLE public.heart_sync_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heart_sync_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heart_sync_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for heart_sync_games
CREATE POLICY "Players can view their own games" 
ON public.heart_sync_games 
FOR SELECT 
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Players can create games" 
ON public.heart_sync_games 
FOR INSERT 
WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Players can update their own games" 
ON public.heart_sync_games 
FOR UPDATE 
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- RLS Policies for heart_sync_moves
CREATE POLICY "Players can view moves in their games" 
ON public.heart_sync_moves 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.heart_sync_games g 
  WHERE g.id = heart_sync_moves.game_id 
  AND (g.player1_id = auth.uid() OR g.player2_id = auth.uid())
));

CREATE POLICY "Players can create moves in their games" 
ON public.heart_sync_moves 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.heart_sync_games g 
  WHERE g.id = heart_sync_moves.game_id 
  AND (g.player1_id = auth.uid() OR g.player2_id = auth.uid())
) AND auth.uid() = moved_by);

-- RLS Policies for heart_sync_rewards
CREATE POLICY "Players can view rewards in their games" 
ON public.heart_sync_rewards 
FOR SELECT 
USING (auth.uid() = asked_by OR auth.uid() = asked_to);

CREATE POLICY "Winners can create rewards" 
ON public.heart_sync_rewards 
FOR INSERT 
WITH CHECK (auth.uid() = asked_by);

CREATE POLICY "Partners can update rewards" 
ON public.heart_sync_rewards 
FOR UPDATE 
USING (auth.uid() = asked_to);

-- Create triggers for updated_at
CREATE TRIGGER update_heart_sync_games_updated_at
  BEFORE UPDATE ON public.heart_sync_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add tables to realtime for instant sync
ALTER TABLE public.heart_sync_games REPLICA IDENTITY FULL;
ALTER TABLE public.heart_sync_moves REPLICA IDENTITY FULL;
ALTER TABLE public.heart_sync_rewards REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.heart_sync_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.heart_sync_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.heart_sync_rewards;