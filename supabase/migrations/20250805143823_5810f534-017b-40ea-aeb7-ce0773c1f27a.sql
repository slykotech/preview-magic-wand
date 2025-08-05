-- Create moves history table for tracking individual moves
CREATE TABLE public.tic_toe_moves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.tic_toe_heart_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  position_row INTEGER NOT NULL CHECK (position_row >= 0 AND position_row <= 2),
  position_col INTEGER NOT NULL CHECK (position_col >= 0 AND position_col <= 2),
  symbol TEXT NOT NULL CHECK (symbol IN ('💖', '💘')),
  move_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tic_toe_moves ENABLE ROW LEVEL SECURITY;

-- Create policies for moves access
CREATE POLICY "Users can view moves for their games" 
ON public.tic_toe_moves 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tic_toe_heart_games tg
    JOIN public.game_sessions gs ON tg.session_id = gs.id
    JOIN public.couples c ON gs.couple_id = c.id
    WHERE tg.id = tic_toe_moves.game_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can insert moves for their games" 
ON public.tic_toe_moves 
FOR INSERT 
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM public.tic_toe_heart_games tg
    JOIN public.game_sessions gs ON tg.session_id = gs.id
    JOIN public.couples c ON gs.couple_id = c.id
    WHERE tg.id = tic_toe_moves.game_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

-- Create index for better performance
CREATE INDEX idx_tic_toe_moves_game_id ON public.tic_toe_moves(game_id);
CREATE INDEX idx_tic_toe_moves_player_id ON public.tic_toe_moves(player_id);

-- Add realtime for moves table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tic_toe_moves;