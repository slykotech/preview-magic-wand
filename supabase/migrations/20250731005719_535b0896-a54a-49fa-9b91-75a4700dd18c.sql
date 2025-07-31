-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  view_count INTEGER DEFAULT 0
);

-- Create story responses table
CREATE TABLE public.story_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL,
  user_id UUID NOT NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create story views table to track who viewed which story
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
CREATE POLICY "Couple members can view their stories" 
ON public.stories 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM couples 
    WHERE couples.id = stories.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can create their own stories" 
ON public.stories 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM couples 
    WHERE couples.id = stories.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own stories" 
ON public.stories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
ON public.stories 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for story responses
CREATE POLICY "Couple members can view story responses" 
ON public.story_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM stories s
    JOIN couples c ON s.couple_id = c.id
    WHERE s.id = story_responses.story_id 
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can create story responses" 
ON public.story_responses 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM stories s
    JOIN couples c ON s.couple_id = c.id
    WHERE s.id = story_responses.story_id 
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

-- RLS Policies for story views
CREATE POLICY "Couple members can view story views" 
ON public.story_views 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM stories s
    JOIN couples c ON s.couple_id = c.id
    WHERE s.id = story_views.story_id 
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can create story views" 
ON public.story_views 
FOR INSERT 
WITH CHECK (
  auth.uid() = viewer_id AND
  EXISTS (
    SELECT 1 FROM stories s
    JOIN couples c ON s.couple_id = c.id
    WHERE s.id = story_views.story_id 
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

-- Create a storage bucket for story images
INSERT INTO storage.buckets (id, name, public) VALUES ('story-images', 'story-images', true);

-- Create storage policies for story images
CREATE POLICY "Users can upload their own story images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Couple members can view story images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'story-images');

CREATE POLICY "Users can update their own story images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own story images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);