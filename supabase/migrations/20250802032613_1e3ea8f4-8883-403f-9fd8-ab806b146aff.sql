-- Fix database function dependencies and ensure all required tables and functions are properly set up

-- First, let's ensure the daily_checkins table has the right structure
-- This should already exist but let's make sure it's correct
CREATE TABLE IF NOT EXISTS public.daily_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    couple_id UUID NOT NULL,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mood mood_type NOT NULL,
    energy_level INTEGER,
    relationship_feeling TEXT,
    gratitude TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, checkin_date)
);

-- Ensure proper RLS policies for daily_checkins
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can create their own checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users can update their own checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users can view checkins for their couples" ON public.daily_checkins;

CREATE POLICY "Users can create their own checkins" ON public.daily_checkins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkins" ON public.daily_checkins
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view checkins for their couples" ON public.daily_checkins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM couples
            WHERE couples.id = daily_checkins.couple_id 
            AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
    );

-- Create or update the signup invitation tracking table
CREATE TABLE IF NOT EXISTS public.signup_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES auth.users(id),
    invitee_email TEXT NOT NULL,
    invitation_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(inviter_id, invitee_email)
);

-- Enable RLS for signup invitations
ALTER TABLE public.signup_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for signup invitations
CREATE POLICY "Users can view their own invitations" ON public.signup_invitations
    FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create signup invitations" ON public.signup_invitations
    FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their own invitations" ON public.signup_invitations
    FOR UPDATE USING (auth.uid() = inviter_id);

-- Create a function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle signup invitation creation with email sending
CREATE OR REPLACE FUNCTION create_signup_invitation(
    p_invitee_email TEXT,
    p_inviter_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    invitation_record signup_invitations%ROWTYPE;
    invitation_token TEXT;
    result JSON;
BEGIN
    -- Validate email format
    IF p_invitee_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid email format'
        );
    END IF;

    -- Check if user is already registered
    IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = p_invitee_email
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User already has an account. Use connect invitation instead.',
            'user_exists', true
        );
    END IF;

    -- Generate secure token
    invitation_token := generate_invitation_token();

    -- Insert or update invitation record
    INSERT INTO public.signup_invitations (
        inviter_id,
        invitee_email,
        invitation_token,
        status,
        expires_at
    ) VALUES (
        auth.uid(),
        p_invitee_email,
        invitation_token,
        'pending',
        now() + INTERVAL '7 days'
    )
    ON CONFLICT (inviter_id, invitee_email)
    DO UPDATE SET
        invitation_token = EXCLUDED.invitation_token,
        status = 'pending',
        expires_at = now() + INTERVAL '7 days',
        sent_at = now(),
        updated_at = now()
    RETURNING * INTO invitation_record;

    -- Build success response with invitation data
    result := json_build_object(
        'success', true,
        'invitation_id', invitation_record.id,
        'token', invitation_record.invitation_token,
        'expires_at', invitation_record.expires_at,
        'invitee_email', invitation_record.invitee_email
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to validate and accept signup invitations
CREATE OR REPLACE FUNCTION accept_signup_invitation(
    p_invitation_token TEXT,
    p_new_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    invitation_record signup_invitations%ROWTYPE;
    couple_record couples%ROWTYPE;
BEGIN
    -- Find and validate the invitation
    SELECT * INTO invitation_record
    FROM public.signup_invitations
    WHERE invitation_token = p_invitation_token
    AND status = 'pending'
    AND expires_at > now();

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid or expired invitation token'
        );
    END IF;

    -- Mark invitation as accepted
    UPDATE public.signup_invitations
    SET status = 'accepted',
        accepted_at = now(),
        updated_at = now()
    WHERE id = invitation_record.id;

    -- Create couple relationship
    INSERT INTO public.couples (
        user1_id,
        user2_id,
        relationship_status,
        created_at,
        updated_at
    ) VALUES (
        invitation_record.inviter_id,
        p_new_user_id,
        'dating',
        now(),
        now()
    )
    RETURNING * INTO couple_record;

    RETURN json_build_object(
        'success', true,
        'couple_id', couple_record.id,
        'inviter_id', invitation_record.inviter_id,
        'message', 'Successfully connected with your partner!'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_signup_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for signup invitations
DROP TRIGGER IF EXISTS update_signup_invitations_updated_at_trigger ON public.signup_invitations;
CREATE TRIGGER update_signup_invitations_updated_at_trigger
    BEFORE UPDATE ON public.signup_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_signup_invitations_updated_at();

-- Fix the mood_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mood_type') THEN
        CREATE TYPE mood_type AS ENUM ('very_happy', 'happy', 'neutral', 'sad', 'very_sad');
    END IF;
END $$;