import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerificationConfirmRequest {
  token: string;
  email: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, email }: VerificationConfirmRequest = await req.json()

    if (!token || !email) {
      throw new Error('Token and email are required')
    }

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

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(pendingVerification.expires_at)
    
    if (now > expiresAt) {
      // Mark as expired
      await supabase
        .from('pending_verifications')
        .update({ status: 'expired' })
        .eq('id', pendingVerification.id)
      
      throw new Error('Verification token has expired. Please request a new verification email.')
    }

    // Create the user account
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email: pendingVerification.email,
      password: pendingVerification.password_hash, // This is actually the raw password, not hashed
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

    // Mark verification as completed
    await supabase
      .from('pending_verifications')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        user_id: authData.user.id 
      })
      .eq('id', pendingVerification.id)

    console.log('User account created successfully:', authData.user.id)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email verified and account created successfully! You can now sign in.',
        user_id: authData.user.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Email verification error:', error)
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