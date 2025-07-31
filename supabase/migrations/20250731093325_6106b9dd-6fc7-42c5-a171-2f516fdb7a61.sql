-- Add foreign key constraint between story_views and stories
ALTER TABLE story_views 
ADD CONSTRAINT story_views_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

-- Add foreign key constraint between story_responses and stories  
ALTER TABLE story_responses 
ADD CONSTRAINT story_responses_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;