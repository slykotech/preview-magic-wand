-- Fix search path for remaining functions that don't have it set
-- This addresses the security warnings about mutable search paths

-- Fix create_signup_invitation function
CREATE OR REPLACE FUNCTION public.create_signup_invitation(p_invitee_email text, p_inviter_name text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix accept_signup_invitation function
CREATE OR REPLACE FUNCTION public.accept_signup_invitation(p_invitation_token text, p_new_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;