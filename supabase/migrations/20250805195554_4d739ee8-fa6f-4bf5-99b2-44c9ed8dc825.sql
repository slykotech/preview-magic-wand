-- Create event_fetch_jobs table for managing duplicate fetch prevention
CREATE TABLE public.event_fetch_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 10,
  sources TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  events_found INTEGER DEFAULT 0,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.event_fetch_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies - allow all authenticated users to view and create fetch jobs
CREATE POLICY "Authenticated users can view fetch jobs" 
ON public.event_fetch_jobs 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create fetch jobs" 
ON public.event_fetch_jobs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "System can update fetch jobs" 
ON public.event_fetch_jobs 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Create index for efficient lookups
CREATE INDEX idx_event_fetch_jobs_location_status ON public.event_fetch_jobs(location_lat, location_lng, status, created_at);

-- Create trigger for updating timestamps
CREATE TRIGGER update_event_fetch_jobs_updated_at
BEFORE UPDATE ON public.event_fetch_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_notes_updated_at();