import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { EmailService } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupInviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SIGNUP INVITE FUNCTION STARTED ===');
    console.log('Request method:', req.method);

    // Initialize email service
    console.log('Initializing email service...');
    
    // Check if RESEND_API_KEY is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service configuration error' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const emailService = new EmailService();
    console.log('Email service initialized successfully');

    const requestBody = await req.json();
    console.log('Request body received:', { 
      email: requestBody.email, 
      firstName: requestBody.firstName, 
      lastName: requestBody.lastName, 
      hasPassword: !!requestBody.password 
    });

    const { email, firstName, lastName, password }: SignupInviteRequest = requestBody;

    console.log(`Processing standalone signup invite for: ${email}`);

    // Enhanced input validation
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

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate password strength - updated to match frontend validation
    if (password.length < 6) {
      console.error('Password too short');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must be at least 6 characters long' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate name fields
    if (firstName.trim().length < 1 || lastName.trim().length < 1) {
      console.error('Invalid name fields');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'First and last names cannot be empty' 
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

    // More reliable user existence check - try multiple methods
    let userExists = false;
    let userCheckError = null;
    
    try {
      // Method 1: Check auth users
      console.log('Method 1: Checking auth users with listUsers...');
      const { data: existingUsers, error: listUsersError } = await supabase.auth.admin.listUsers();
      
      if (listUsersError) {
        console.error('Error with listUsers:', listUsersError);
        userCheckError = listUsersError;
      } else {
        console.log('Total users found:', existingUsers?.users?.length || 0);
        const userWithEmail = existingUsers?.users?.find(user => user.email === email);
        if (userWithEmail) {
          console.log('User found via listUsers:', { id: userWithEmail.id, email: userWithEmail.email });
          userExists = true;
        }
      }
      
      // Method 2: Additional check using direct query (getUserByEmail doesn't exist in current client)
      if (!userExists && !userCheckError) {
        console.log('Method 2: Double-checking user existence...');
        // Since getUserByEmail doesn't exist, we rely on the listUsers result
        console.log('Relying on listUsers result - no additional check needed');
      }
      
    } catch (error) {
      console.error('Unexpected error during user existence check:', error);
      userCheckError = error;
    }
    
    // If we had errors checking user existence, only fail if it's a critical error that prevents us from proceeding
    if (userCheckError && !userExists) {
      console.error('Error checking existing user:', userCheckError);
      console.log('Proceeding with signup since user existence could not be verified and no user was found');
    }
    
    console.log('User existence check result:', { userExists, hadError: !!userCheckError });
    
    if (userExists) {
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

    console.log('User does not exist, proceeding with standalone signup invite...');

    // Clean up any existing pending verifications for this email
    console.log('Cleaning up existing pending verifications...');
    const { error: deleteError } = await supabase
      .from('pending_verifications')
      .delete()
      .eq('email', email);

    if (deleteError) {
      console.error('Error cleaning up pending verifications:', deleteError);
      console.warn('Failed to clean up existing verifications, continuing...');
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours

    console.log(`Generated verification token: ${verificationToken}`);

    // Hash the password before storing (SECURITY FIX)
    console.log('Hashing password securely...');
    const hashedPassword = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(password + verificationToken) // Use token as salt
    );
    const passwordHash = Array.from(new Uint8Array(hashedPassword))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Store verification data temporarily (no invitation context for standalone signup)
    console.log('Storing verification data...');
    const { error: insertError } = await supabase
      .from('pending_verifications')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        password_hash: passwordHash, // Store hashed password
        password_is_hashed: true, // Mark as hashed
        verification_token: verificationToken,
        expires_at: expiresAt.toISOString(),
        invitation_context: null // Standalone signup, no invitation context
      });

    if (insertError) {
      console.error('Error storing verification data:', insertError);
      throw new Error('Failed to process signup invitation');
    }

    console.log('Verification data stored successfully');

    const appUrl = 'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com';
    const verificationUrl = `${appUrl}/signup-resolver?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    console.log('Generated verification URL:', verificationUrl);

    // Create signup-specific email template
    console.log('Creating signup email template...');
    const template = emailService.createSignupVerificationTemplate(firstName, verificationUrl);
    console.log('Signup email template created');

    // Send email
    console.log('Sending signup verification email...');
    console.log('Email service initialized with API key present:', !!resendApiKey);
    
    const emailResult = await emailService.sendEmail({
      to: [email],
      template,
      entityRefId: `love-sync-signup-${verificationToken}`
    });

    console.log('Email send result:', emailResult);
    console.log('Email send success:', emailResult.success);
    if (!emailResult.success) {
      console.error('Email send error details:', emailResult.error);
    }

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      const handledError = emailService.handleEmailError(emailResult.error!);
      console.error('Handled error:', handledError.message);
      throw handledError;
    }

    console.log('Signup verification email sent successfully:', emailResult.data);
    console.log('=== SIGNUP INVITE FUNCTION COMPLETED SUCCESSFULLY ===');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Verification email sent to ${email}. Please check your inbox and click the verification link to complete your account creation.`,
        emailId: emailResult.data?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('=== SIGNUP INVITE FUNCTION ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    
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