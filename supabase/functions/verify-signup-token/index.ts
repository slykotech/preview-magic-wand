import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignupTokenVerificationRequest {
  token: string;
  email: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SIGNUP TOKEN VERIFICATION FUNCTION STARTED ===');
    const { token, email }: SignupTokenVerificationRequest = await req.json()

    if (!token || !email) {
      throw new Error('Token and email are required')
    }

    console.log(`Processing signup verification for: ${email} with token: ${token}`);

    // Create supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Find the pending verification
    const { data: pendingVerification, error: fetchError } = await supabase
      .from('pending_verifications')
      .select('*')
      .eq('verification_token', token)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (fetchError || !pendingVerification) {
      console.error('Verification not found:', fetchError)
      throw new Error('Invalid or expired verification token')
    }

    console.log('Found pending verification:', pendingVerification.id);

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(pendingVerification.expires_at)
    
    if (now > expiresAt) {
      console.log('Token has expired, marking as expired');
      // Mark as expired
      await supabase
        .from('pending_verifications')
        .update({ status: 'expired' })
        .eq('id', pendingVerification.id)
      
      throw new Error('Verification token has expired. Please request a new verification email.')
    }

    // Verify this is a standalone signup (no invitation context)
    if (pendingVerification.invitation_context) {
      console.error('This is an invitation signup, not standalone signup');
      throw new Error('This verification link is for an invitation signup. Please use the correct verification method.')
    }

    console.log('Creating standalone user account...');

    // For hashed passwords, we need to generate a new password
    // Since we can't reverse the hash, we'll generate a secure temporary password
    // The user can reset it if needed
    let userPassword = '';
    
    if (pendingVerification.password_is_hashed) {
      // Generate a secure random password for hashed entries
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      userPassword = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // For legacy unhashed passwords (should be rare after our security fix)
      userPassword = pendingVerification.password_hash;
    }

    // Create the user account for standalone signup
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email: pendingVerification.email,
      password: userPassword,
      email_confirm: true, // Skip email confirmation since we're handling it manually
      user_metadata: {
        first_name: pendingVerification.first_name,
        last_name: pendingVerification.last_name,
        display_name: `${pendingVerification.first_name} ${pendingVerification.last_name}`.trim(),
      }
    })

    if (signUpError) {
      console.error('Signup error:', signUpError)
      throw new Error(`Failed to create account: ${signUpError.message}`)
    }

    if (!authData.user) {
      throw new Error('Account creation failed')
    }

    console.log('User account created successfully:', authData.user.id);

    // Mark verification as completed
    await supabase
      .from('pending_verifications')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        user_id: authData.user.id 
      })
      .eq('id', pendingVerification.id)

    console.log('Verification marked as completed');

    // Skip creating demo couple relationship for standalone signup
    // Let the user go through proper subscription flow first
    console.log('Skipping demo couple creation - user will go through subscription flow');

    console.log('=== SIGNUP TOKEN VERIFICATION COMPLETED SUCCESSFULLY ===');

    const successMessage = 'Email verified and account created successfully! Welcome to Love Sync. You can now sign in and start exploring the app.';

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: successMessage,
        user_id: authData.user.id,
        is_standalone_signup: true
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('=== SIGNUP TOKEN VERIFICATION ERROR ===');
    console.error('Signup verification error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})