-- Create user_saved_events table for users to save events they're interested in
CREATE TABLE public.user_saved_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.user_saved_events ENABLE ROW LEVEL SECURITY;

-- Create policies for user_saved_events
CREATE POLICY "Users can view their saved events" 
ON public.user_saved_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can save events" 
ON public.user_saved_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their saved events" 
ON public.user_saved_events 
FOR DELETE 
USING (auth.uid() = user_id);