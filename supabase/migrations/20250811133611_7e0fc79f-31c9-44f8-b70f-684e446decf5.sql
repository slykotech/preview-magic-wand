-- Notifications infrastructure
-- 1) Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';

-- 2) Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'general',
  link_url TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies: users can view and update their own notifications
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can update their own notifications'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- No INSERT policy on purpose; use the secured function below

-- Trigger to keep updated_at fresh
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notifications_updated_at'
  ) THEN
    CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Realtime configuration
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Secured helper to create a notification for self or partner
CREATE OR REPLACE FUNCTION public.create_notification(
  p_target_user_id UUID,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link_url TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'general'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Allow creating for self or for a coupled partner
  IF p_target_user_id <> auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.couples c
      WHERE (c.user1_id = auth.uid() AND c.user2_id = p_target_user_id)
         OR (c.user2_id = auth.uid() AND c.user1_id = p_target_user_id)
    ) THEN
      RAISE EXCEPTION 'Not allowed to notify this user';
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, link_url, type)
  VALUES (p_target_user_id, p_title, p_body, p_link_url, p_type)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;