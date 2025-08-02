-- Add missing columns to date_ideas table for scheduling functionality
ALTER TABLE public.date_ideas 
ADD COLUMN scheduled_date DATE,
ADD COLUMN scheduled_time TIME;