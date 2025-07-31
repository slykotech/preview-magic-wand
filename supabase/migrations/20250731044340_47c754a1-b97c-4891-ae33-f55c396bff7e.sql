-- Add favorites functionality to memories
ALTER TABLE memories ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;

-- Create separate table for text-only notes
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  couple_id UUID NOT NULL,
  created_by UUID NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notes table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create policies for notes
CREATE POLICY "Couple members can create notes" 
ON public.notes 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND 
  EXISTS (
    SELECT 1 FROM couples 
    WHERE couples.id = notes.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can view their notes" 
ON public.notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM couples 
    WHERE couples.id = notes.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can update notes" 
ON public.notes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM couples 
    WHERE couples.id = notes.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can delete notes" 
ON public.notes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM couples 
    WHERE couples.id = notes.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notes_updated_at_trigger
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_notes_updated_at();