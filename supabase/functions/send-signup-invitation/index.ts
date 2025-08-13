import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { EmailService } from '../_shared/email-service.ts';
import type { SignupInvitationRequest } from '../_shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize email service
    const emailService = new EmailService();

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Create supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error(`Authentication failed: ${authError?.message || 'Invalid token'}`);
    }

    const { email, inviterName }: SignupInvitationRequest = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log(`Processing signup invitation for ${email} from user ${user.id}`);

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers({
      filter: `email.eq.${email}`
    });

    if (existingUser.users && existingUser.users.length > 0) {
      console.log(`User already exists: ${email}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This email is already registered with Love Story',
          action: 'use_connect_instead',
          message: 'This email already has a Love Story account.'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get inviter's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('User profile not found');
    }

    const displayName = inviterName || profile.display_name || user.email?.split('@')[0] || 'Someone';

    // Create signup invitation using the database function
    const { data: invitation, error: invitationError } = await supabase
      .rpc('create_signup_invitation', {
        p_invitee_email: email,
        p_inviter_name: displayName
      });

    if (invitationError) {
      console.error('Error creating signup invitation:', invitationError);
      
      if (invitationError.message?.includes('already has an account')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'This email is already registered with Love Story',
            action: 'use_connect_instead',
            message: 'This email already has a Love Story account.'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error('Failed to create signup invitation');
    }

    if (!invitation.success) {
      throw new Error(invitation.error || 'Failed to create signup invitation');
    }

    console.log('Signup invitation created:', invitation);

    const appUrl = 'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com';
    const signupUrl = `${appUrl}/accept-invitation?token=${invitation.token}&email=${encodeURIComponent(email)}&type=invite`;

    console.log('Generated signup URL:', signupUrl);

    // Create email template
    const template = emailService.createInvitationTemplate(displayName, false, signupUrl);

    // Send email
    const emailResult = await emailService.sendEmail({
      to: [email],
      template,
      entityRefId: `love-sync-signup-${invitation.invitation_id}`
    });

    if (!emailResult.success) {
      throw emailService.handleEmailError(emailResult.error!);
    }

    console.log('Signup invitation email sent successfully:', emailResult.data);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Signup invitation sent to ${email}`,
        invitation_id: invitation.invitation_id,
        expires_at: invitation.expires_at,
        emailId: emailResult.data?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Signup invitation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});