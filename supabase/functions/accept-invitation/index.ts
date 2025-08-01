import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AcceptInvitationRequest {
  senderUserId: string;
  recipientEmail: string;
  type: 'connect' | 'invite';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Extract JWT token from Bearer token
    const token = authHeader.replace('Bearer ', '')

    // Create supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify the JWT token and get recipient user
    const { data: { user: recipientUser }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !recipientUser) {
      console.error('Auth error:', authError)
      throw new Error(`Authentication failed: ${authError?.message || 'Auth session missing!'}`)
    }

    const { senderUserId, recipientEmail, type }: AcceptInvitationRequest = await req.json()

    if (!senderUserId || !recipientEmail) {
      throw new Error('Sender user ID and recipient email are required')
    }

    console.log(`Processing ${type} invitation acceptance from ${senderUserId} to ${recipientEmail}`)

    // For connect type, allow any authenticated user to accept (existing user flow)
    // For invite type, require email match (new user flow) 
    if (type === 'invite' && recipientUser.email?.toLowerCase() !== recipientEmail.toLowerCase()) {
      throw new Error('Email mismatch. Please sign in with the invited email address.')
    }

    // Get sender's profile
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', senderUserId)
      .single()

    if (senderError) {
      console.error('Error fetching sender profile:', senderError)
      throw new Error('Invalid invitation sender')
    }

    // Get recipient's profile
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', recipientUser.id)
      .single()

    if (recipientError) {
      console.error('Error fetching recipient profile:', recipientError)
      throw new Error('Recipient profile not found')
    }

    // Check if sender and recipient are already connected
    const { data: existingCouple, error: coupleCheckError } = await supabase
      .from('couples')
      .select('*')
      .or(`and(user1_id.eq.${senderUserId},user2_id.eq.${recipientUser.id}),and(user1_id.eq.${recipientUser.id},user2_id.eq.${senderUserId})`)
      .single()

    if (existingCouple) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `You are already connected with ${senderProfile.display_name}!`,
          alreadyConnected: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if sender already has a different partner
    const { data: senderCouple, error: senderCoupleError } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${senderUserId},user2_id.eq.${senderUserId}`)
      .neq('user1_id', senderUserId) // Exclude self-pairing entries
      .neq('user2_id', senderUserId)
      .single()

    if (senderCouple) {
      throw new Error('The sender is already connected with someone else')
    }

    // Check if recipient already has a partner
    const { data: recipientCouple, error: recipientCoupleError } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${recipientUser.id},user2_id.eq.${recipientUser.id}`)
      .neq('user1_id', recipientUser.id) // Exclude self-pairing entries  
      .neq('user2_id', recipientUser.id)
      .single()

    if (recipientCouple) {
      throw new Error('You are already connected with someone else')
    }

    // Create the couple connection
    const { data: newCouple, error: createCoupleError } = await supabase
      .from('couples')
      .insert({
        user1_id: senderUserId,
        user2_id: recipientUser.id,
        relationship_status: 'dating',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createCoupleError) {
      console.error('Error creating couple:', createCoupleError)
      throw new Error('Failed to create connection')
    }

    // Remove any existing partner requests between these users
    const { error: cleanupError } = await supabase
      .from('partner_requests')
      .delete()
      .or(`and(requester_id.eq.${senderUserId},requested_email.eq.${recipientEmail}),and(requester_id.eq.${recipientUser.id},requested_email.eq.${senderProfile.display_name})`)

    if (cleanupError) {
      console.error('Error cleaning up partner requests:', cleanupError)
      // Don't throw error as this is not critical
    }

    console.log('Connection created successfully:', newCouple.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully connected with ${senderProfile.display_name}! Welcome to your Love Sync journey together. 💕`,
        coupleId: newCouple.id,
        partnerName: senderProfile.display_name
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Accept invitation error:', error)
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