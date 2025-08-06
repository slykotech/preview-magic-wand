-- Create storage bucket for card game responses
INSERT INTO storage.buckets (id, name, public) 
VALUES ('card-responses', 'card-responses', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for card responses
CREATE POLICY "Allow authenticated users to upload card responses" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'card-responses' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view card responses" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'card-responses' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to delete their own card responses" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'card-responses' AND auth.uid()::text = (storage.foldername(name))[1]);