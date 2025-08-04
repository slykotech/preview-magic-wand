-- Enable real-time for date_ideas table
ALTER TABLE public.date_ideas REPLICA IDENTITY FULL;

-- Add the table to realtime publication
-- This allows real-time updates to be broadcast to subscribed clients
-- Note: The publication might already exist, so we use ALTER instead of CREATE
ALTER PUBLICATION supabase_realtime ADD TABLE public.date_ideas;