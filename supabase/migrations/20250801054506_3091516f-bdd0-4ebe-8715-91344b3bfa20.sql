-- Create table for important dates
CREATE TABLE public.important_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  date_value DATE NOT NULL,
  description TEXT,
  date_type TEXT NOT NULL DEFAULT 'special', -- anniversary, birthday, special
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;

-- Create policies for couple access
CREATE POLICY "Couple members can view their important dates" 
ON public.important_dates 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = important_dates.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

CREATE POLICY "Couple members can create important dates" 
ON public.important_dates 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by 
  AND EXISTS (
    SELECT 1 FROM couples 
    WHERE couples.id = important_dates.couple_id 
    AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "Couple members can update important dates" 
ON public.important_dates 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = important_dates.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

CREATE POLICY "Couple members can delete important dates" 
ON public.important_dates 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM couples 
  WHERE couples.id = important_dates.couple_id 
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_important_dates_updated_at
BEFORE UPDATE ON public.important_dates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();