-- Create events table for storing scraped events
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  venue TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_name TEXT,
  price TEXT,
  event_date DATE,
  event_time TEXT,
  source TEXT NOT NULL,
  image_url TEXT,
  booking_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to events
CREATE POLICY "Events are viewable by authenticated users" 
ON public.events 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_events_location ON public.events (location_lat, location_lng);
CREATE INDEX idx_events_date ON public.events (event_date);
CREATE INDEX idx_events_category ON public.events (category);
CREATE INDEX idx_events_source ON public.events (source);
CREATE INDEX idx_events_expires_at ON public.events (expires_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_saved_events table for bookmarking
CREATE TABLE public.user_saved_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS for user_saved_events
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

-- Create function to clean up expired events
CREATE OR REPLACE FUNCTION public.cleanup_expired_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.events 
  WHERE expires_at < now();
END;
$$;