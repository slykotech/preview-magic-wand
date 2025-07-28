-- Create a separate table for memory images to support multiple images per memory
CREATE TABLE IF NOT EXISTS public.memory_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  file_name TEXT,
  upload_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on memory_images
ALTER TABLE public.memory_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for memory_images
CREATE POLICY "Users can view images for their couple's memories"
ON public.memory_images
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM memories m
  JOIN couples c ON m.couple_id = c.id
  WHERE m.id = memory_images.memory_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Users can insert images for their couple's memories"
ON public.memory_images
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM memories m
  JOIN couples c ON m.couple_id = c.id
  WHERE m.id = memory_images.memory_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Users can update images for their couple's memories"
ON public.memory_images
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM memories m
  JOIN couples c ON m.couple_id = c.id
  WHERE m.id = memory_images.memory_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Users can delete images for their couple's memories"
ON public.memory_images
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM memories m
  JOIN couples c ON m.couple_id = c.id
  WHERE m.id = memory_images.memory_id 
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

-- Create index for better performance
CREATE INDEX idx_memory_images_memory_id ON public.memory_images(memory_id);
CREATE INDEX idx_memory_images_upload_order ON public.memory_images(memory_id, upload_order);