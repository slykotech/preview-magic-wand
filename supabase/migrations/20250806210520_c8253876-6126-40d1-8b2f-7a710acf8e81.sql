-- Add photo response columns to game sessions
ALTER TABLE card_deck_game_sessions 
ADD COLUMN IF NOT EXISTS last_response_photo_url TEXT,
ADD COLUMN IF NOT EXISTS last_response_photo_caption TEXT;

-- Update card_responses table to store photo URLs
ALTER TABLE card_responses 
ADD COLUMN IF NOT EXISTS response_photo_url TEXT,
ADD COLUMN IF NOT EXISTS response_photo_caption TEXT;

-- Create storage bucket for game photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('game-photos', 'game-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload game photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'game-photos' AND
  auth.role() = 'authenticated'
);

-- Allow public to view photos
CREATE POLICY "Public can view game photos" ON storage.objects
FOR SELECT USING (bucket_id = 'game-photos');