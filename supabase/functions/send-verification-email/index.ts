import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EmailService } from '../_shared/email-service.ts';
import type { VerificationRequest } from '../_shared/types.ts';

interface ExtendedVerificationRequest extends VerificationRequest {
  invitationContext?: {
    senderId: string;
    type: 'invite';
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize email service
    const emailService = new EmailService();

    const { email, firstName, lastName, password, invitationContext }: ExtendedVerificationRequest = await req.json();

    console.log(`Processing verification request for: ${email}`, invitationContext ? 'with invitation context' : 'standalone');

    if (!email || !firstName || !lastName || !password) {
      throw new Error('All fields are required');
    }

    // Create supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Checking if user already exists...');

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers({
      filter: `email.eq.${email}`
    });
    
    if (existingUser.users && existingUser.users.length > 0) {
      console.log(`User already exists: ${email}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'An account with this email already exists. Please sign in instead.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User does not exist, proceeding with verification email...');

    // Clean up any existing pending verifications for this email
    await supabase
      .from('pending_verifications')
      .delete()
      .eq('email', email);

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours

    console.log(`Generated token: ${verificationToken}`);

    // Store verification data temporarily
    const { error: insertError } = await supabase
      .from('pending_verifications')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        password_hash: password, // Stored as plain text, Supabase Auth handles hashing
        verification_token: verificationToken,
        expires_at: expiresAt.toISOString(),
        invitation_context: invitationContext ? JSON.stringify(invitationContext) : null
      });

    if (insertError) {
      console.error('Error storing verification data:', insertError);
      throw new Error('Failed to process verification request');
    }

    console.log('Verification data stored successfully');

    const appUrl = 'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com';
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    console.log('Generated verification URL:', verificationUrl);

    // Create email template
    const template = emailService.createVerificationTemplate(firstName, verificationUrl);

    // Send email
    const emailResult = await emailService.sendEmail({
      to: [email],
      template,
      entityRefId: `love-sync-verification-${verificationToken}`
    });

    if (!emailResult.success) {
      throw emailService.handleEmailError(emailResult.error!);
    }

    console.log('Verification email sent successfully:', emailResult.data);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Verification email sent to ${email}. Please check your inbox and click the verification link to complete your account setup.`,
        emailId: emailResult.data?.id // Include email ID for tracking
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Verification email error:', error);
    
    // Return detailed error information
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        errorType: error.name || 'UnknownError',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

Deno.serve(handler);