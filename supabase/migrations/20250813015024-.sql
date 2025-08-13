-- Add encryption support to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false;