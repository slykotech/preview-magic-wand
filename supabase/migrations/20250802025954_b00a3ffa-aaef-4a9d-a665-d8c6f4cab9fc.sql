-- Create the daily_checkins table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  couple_id uuid NOT NULL,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  mood public.mood_type NOT NULL,
  energy_level integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  relationship_feeling text,
  gratitude text,
  CONSTRAINT daily_checkins_user_date_unique UNIQUE (user_id, checkin_date)
);

-- Enable RLS
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
  -- Policy for users to create their own checkins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_checkins' 
    AND policyname = 'Users can create their own checkins'
  ) THEN
    CREATE POLICY "Users can create their own checkins" 
    ON public.daily_checkins 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for users to update their own checkins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_checkins' 
    AND policyname = 'Users can update their own checkins'
  ) THEN
    CREATE POLICY "Users can update their own checkins" 
    ON public.daily_checkins 
    FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;

  -- Policy for users to view checkins for their couples
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_checkins' 
    AND policyname = 'Users can view checkins for their couples'
  ) THEN
    CREATE POLICY "Users can view checkins for their couples" 
    ON public.daily_checkins 
    FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM couples 
      WHERE couples.id = daily_checkins.couple_id 
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
    ));
  END IF;
END $$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_daily_checkins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_daily_checkins_updated_at'
  ) THEN
    CREATE TRIGGER update_daily_checkins_updated_at
      BEFORE UPDATE ON public.daily_checkins
      FOR EACH ROW
      EXECUTE FUNCTION public.update_daily_checkins_updated_at();
  END IF;
END $$;