-- Create stories storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true);

-- Create RLS policies for stories storage bucket
CREATE POLICY "Users can upload their own stories"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view story images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'stories');

CREATE POLICY "Users can update their own stories"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own stories"
ON storage.objects
FOR DELETE
USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);