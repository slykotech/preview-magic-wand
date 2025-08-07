-- Add missing completed_on_time column to card_responses table
ALTER TABLE public.card_responses 
ADD COLUMN IF NOT EXISTS completed_on_time BOOLEAN DEFAULT true;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_card_responses_completed_on_time 
ON public.card_responses(completed_on_time);

-- Add comment to document the column
COMMENT ON COLUMN public.card_responses.completed_on_time IS 'Whether the response was completed within the timer limit';