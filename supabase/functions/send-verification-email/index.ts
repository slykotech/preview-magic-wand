import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, password }: VerificationRequest = await req.json();

    console.log(`Processing verification request for: ${email}`);

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
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('Error storing verification data:', insertError);
      throw new Error('Failed to process verification request');
    }

    console.log('Verification data stored successfully');

    const appUrl = 'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com';
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    console.log('Generated verification URL:', verificationUrl);

    // Create a simpler email template for better compatibility
    const createVerificationEmailTemplate = (firstName: string, verificationUrl: string) => {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Verify Your Love Sync Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">💕 Love Sync</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Verify your email to get started</p>
          </div>
          
          <div style="padding: 0 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${firstName}! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Welcome to Love Sync! We're excited to help you and your partner strengthen your relationship. 
              To complete your account setup, please verify your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This verification link will expire in 24 hours. If you didn't create a Love Sync account, 
              you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              Love Sync - Strengthening relationships, one sync at a time
            </p>
          </div>
        </body>
        </html>
      `;
    };

    console.log('Attempting to send email via Resend...');

    // Test Resend configuration first
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    console.log('Resend API key is configured');

    // Send verification email via Resend with better error handling
    let emailData, emailError;
    
    try {
      const response = await resend.emails.send({
        from: 'Love Sync <onboarding@resend.dev>', // Using verified Resend domain
        to: [email],
        subject: 'Verify your Love Sync account 📧',
        html: createVerificationEmailTemplate(firstName, verificationUrl),
        headers: {
          'X-Priority': '1',
          'Importance': 'high',
        },
      });

      emailData = response.data;
      emailError = response.error;

    } catch (resendCallError: any) {
      console.error('Resend API call failed:', resendCallError);
      throw new Error(`Email service error: ${resendCallError.message}`);
    }

    if (emailError) {
      console.error('Resend API returned error:', emailError);
      
      // Handle specific Resend errors
      if (emailError.name === 'rate_limit_exceeded' || (emailError as any).statusCode === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few seconds.');
      }
      
      if (emailError.message?.includes('domain')) {
        throw new Error('Email domain not verified. Please contact support.');
      }
      
      if (emailError.message?.includes('api_key')) {
        throw new Error('Email service configuration error. Please contact support.');
      }
      
      throw new Error(`Failed to send verification email: ${emailError.message || 'Unknown email service error'}`);
    }

    console.log('Verification email sent successfully:', emailData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Verification email sent to ${email}. Please check your inbox and click the verification link to complete your account setup.`,
        emailId: emailData?.id // Include email ID for tracking
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

serve(handler);