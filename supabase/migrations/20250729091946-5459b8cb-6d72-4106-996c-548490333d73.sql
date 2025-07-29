-- Add nickname columns to couples table for custom display names
ALTER TABLE public.couples 
ADD COLUMN user1_nickname_for_user1 TEXT,
ADD COLUMN user1_nickname_for_user2 TEXT,
ADD COLUMN user2_nickname_for_user1 TEXT,
ADD COLUMN user2_nickname_for_user2 TEXT;