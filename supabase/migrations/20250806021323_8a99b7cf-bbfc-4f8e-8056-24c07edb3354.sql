-- Add unique constraint on external_id for events table to support upsert operations
ALTER TABLE public.events ADD CONSTRAINT events_external_id_unique UNIQUE (external_id);