-- Create feedback_submissions table for storing user feedback
CREATE TABLE public.feedback_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('rating', 'general', 'bug_report', 'feature_request')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback submissions
CREATE POLICY "Users can create their own feedback" 
ON public.feedback_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback" 
ON public.feedback_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_feedback_submissions_updated_at
BEFORE UPDATE ON public.feedback_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_notes_updated_at();