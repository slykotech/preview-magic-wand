import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { EmailService } from '../_shared/email-service.ts';
import type { InvitationRequest } from '../_shared/types.ts';

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

    // Extract JWT token from Bearer token
    const token = authHeader.replace('Bearer ', '');

    // Create supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error(`Authentication failed: ${authError?.message || 'Invalid token'}`);
    }

    const { type, email, senderName }: InvitationRequest = await req.json();

    if (!email || !['connect', 'invite'].includes(type)) {
      throw new Error('Valid email and type (connect/invite) are required');
    }

    console.log(`Processing ${type} invitation for ${email} from user ${user.id}`);

    // Get user's profile for display name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('User profile not found');
    }

    const displayName = senderName || profile.display_name || user.email?.split('@')[0] || 'Someone';
    const appUrl = 'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com';

    console.log(`Sending ${type} email to ${email} from ${displayName}`);

    // Create appropriate invitation URL
    const isConnectType = type === 'connect';
    const acceptUrl = isConnectType 
      ? `${appUrl}/invite-resolver?email=${encodeURIComponent(email)}&sender=${encodeURIComponent(user.id)}&type=connect`
      : `${appUrl}/invite-resolver?email=${encodeURIComponent(email)}&sender=${encodeURIComponent(user.id)}&type=invite`;
    
    console.log('Generated invitation URL:', acceptUrl, 'Type:', isConnectType ? 'connect' : 'invite');

    // Create email template
    const template = emailService.createInvitationTemplate(displayName, isConnectType, acceptUrl);

    // Send email
    const emailResult = await emailService.sendEmail({
      to: [email],
      template,
      entityRefId: `love-sync-${type}-${Date.now()}`
    });

    if (!emailResult.success) {
      throw emailService.handleEmailError(emailResult.error!);
    }

    console.log(`${type} invitation email sent successfully:`, emailResult.data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isConnectType 
          ? `Connection invitation sent to ${email}`
          : `Invitation to join Love Sync sent to ${email}`,
        type,
        emailId: emailResult.data?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Invitation email error:', error);
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