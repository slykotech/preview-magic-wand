-- Clear existing places data to ensure fresh location-specific searches
DELETE FROM public.places;

-- Add metadata column to track location context for places
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS location_context jsonb DEFAULT '{}';

-- Add index for better performance on location queries
CREATE INDEX IF NOT EXISTS idx_places_lat_lng ON public.places (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_places_location_context ON public.places USING gin(location_context);