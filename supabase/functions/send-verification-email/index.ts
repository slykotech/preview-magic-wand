import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== VERIFICATION EMAIL FUNCTION STARTED ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    // Initialize email service
    console.log('Initializing email service...');
    const emailService = new EmailService();
    console.log('Email service initialized successfully');

    const requestBody = await req.json();
    console.log('Request body received:', { email: requestBody.email, firstName: requestBody.firstName, lastName: requestBody.lastName, hasPassword: !!requestBody.password });

    const { email, firstName, lastName, password, invitationContext }: ExtendedVerificationRequest = requestBody;

    console.log(`Processing verification request for: ${email}`, invitationContext ? 'with invitation context' : 'standalone');

    if (!email || !firstName || !lastName || !password) {
      const error = 'All fields are required';
      console.error('Validation error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create supabase client with service role key
    console.log('Creating Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', { hasUrl: !!supabaseUrl, hasKey: !!serviceRoleKey });
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    console.log('Supabase client created successfully');

    console.log('Checking if user already exists...');

    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase.auth.admin.listUsers({
      filter: `email.eq.${email}`
    });
    
    if (userCheckError) {
      console.error('Error checking existing user:', userCheckError);
      throw new Error('Failed to validate user information');
    }
    
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
    console.log('Cleaning up existing pending verifications...');
    const { error: deleteError } = await supabase
      .from('pending_verifications')
      .delete()
      .eq('email', email);

    if (deleteError) {
      console.error('Error cleaning up pending verifications:', deleteError);
      // Don't fail here, just log the warning
      console.warn('Failed to clean up existing verifications, continuing...');
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours

    console.log(`Generated token: ${verificationToken}`);

    // Store verification data temporarily
    console.log('Storing verification data...');
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
    console.log('Creating email template...');
    const template = emailService.createVerificationTemplate(firstName, verificationUrl);
    console.log('Email template created');

    // Send email
    console.log('Sending email...');
    const emailResult = await emailService.sendEmail({
      to: [email],
      template,
      entityRefId: `love-sync-verification-${verificationToken}`
    });

    console.log('Email send result:', emailResult);

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      const handledError = emailService.handleEmailError(emailResult.error!);
      console.error('Handled error:', handledError.message);
      throw handledError;
    }

    console.log('Verification email sent successfully:', emailResult.data);
    console.log('=== VERIFICATION EMAIL FUNCTION COMPLETED SUCCESSFULLY ===');
    
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
    console.error('=== VERIFICATION EMAIL FUNCTION ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    
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
});