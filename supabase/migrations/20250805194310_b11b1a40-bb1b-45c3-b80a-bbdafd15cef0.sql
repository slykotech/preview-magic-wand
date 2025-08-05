-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326),
  price TEXT,
  organizer TEXT,
  category TEXT,
  website_url TEXT,
  image_url TEXT,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  UNIQUE(source, external_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies for events
CREATE POLICY "Events are viewable by authenticated users" 
ON public.events 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create index for location-based queries
CREATE INDEX idx_events_location ON public.events USING GIST(location);
CREATE INDEX idx_events_start_date ON public.events(start_date);
CREATE INDEX idx_events_expires_at ON public.events(expires_at);

-- Now create user_saved_events table
CREATE TABLE public.user_saved_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
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