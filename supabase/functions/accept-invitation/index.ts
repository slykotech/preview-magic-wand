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
    // Create supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing')
    
    let recipientUser = null;
    let token = null;

    // Try to authenticate user if token is present
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '')
      console.log('JWT token length:', token.length)

      try {
        // Verify the JWT token and get recipient user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        
        if (authError) {
          console.error('Auth error:', authError)
          // Continue without authentication - we'll handle this later
        } else if (user) {
          recipientUser = user;
          console.log('Authenticated user:', user.id)
        }
      } catch (tokenError) {
        console.error('Token validation error:', tokenError)
        // Continue without authentication - we'll handle this later
      }
    }

    const { senderUserId, recipientEmail, type }: AcceptInvitationRequest = await req.json()

    if (!senderUserId || !recipientEmail) {
      throw new Error('Sender user ID and recipient email are required')
    }

    console.log(`Processing ${type} invitation acceptance from ${senderUserId} to ${recipientEmail}`)

    // If no authenticated user, check if we can find the user by email
    if (!recipientUser) {
      console.log('No authenticated user, checking if user exists by email')
      
      // Get all users to find the recipient
      const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers()
      
      if (usersError) {
        console.error('Error fetching users:', usersError)
        throw new Error('Authentication required. Please sign in first.')
      }

      const foundUser = allUsers.users.find(u => u.email?.toLowerCase() === recipientEmail.toLowerCase())
      
      if (!foundUser) {
        throw new Error('User not found. Please sign up first using the invited email address.')
      }

      if (!foundUser.email_confirmed_at) {
        throw new Error('Please verify your email address before accepting the invitation.')
      }

      recipientUser = foundUser
      console.log('Found user by email:', recipientUser.id)
    }

    // For connect type, allow any authenticated user to accept (existing user flow)
    // For invite type, require email match (new user flow) 
    if (type === 'invite' && recipientUser.email?.toLowerCase() !== recipientEmail.toLowerCase()) {
      throw new Error('Email mismatch. Please sign in with the invited email address.')
    }

    // Additional validation for connect type - ensure user is authenticated
    if (type === 'connect' && !token) {
      throw new Error('Authentication required. Please sign in to accept the connection.')
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
      .maybeSingle()

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

    // Check if sender already has a different partner (excluding demo mode)
    const { data: senderCouples, error: senderCoupleError } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${senderUserId},user2_id.eq.${senderUserId}`)

    if (senderCoupleError) {
      console.error('Error checking sender couples:', senderCoupleError)
    }

    // Filter out demo mode couples (where user1_id == user2_id)
    const senderRealCouples = senderCouples?.filter(couple => 
      couple.user1_id !== couple.user2_id
    ) || []

    console.log('Sender real couples count:', senderRealCouples.length)

    if (senderRealCouples.length > 0) {
      throw new Error('The sender is already connected with someone else')
    }

    // Check if recipient already has a partner (excluding demo mode)
    const { data: recipientCouples, error: recipientCoupleError } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${recipientUser.id},user2_id.eq.${recipientUser.id}`)

    if (recipientCoupleError) {
      console.error('Error checking recipient couples:', recipientCoupleError)
    }

    // Filter out demo mode couples (where user1_id == user2_id)
    const recipientRealCouples = recipientCouples?.filter(couple => 
      couple.user1_id !== couple.user2_id
    ) || []

    console.log('Recipient real couples count:', recipientRealCouples.length)

    if (recipientRealCouples.length > 0) {
      throw new Error('You are already connected with someone else')
    }

    // Check if either user has a demo mode couple that needs to be replaced
    const { data: senderDemoCouple } = await supabase
      .from('couples')
      .select('id')
      .eq('user1_id', senderUserId)
      .eq('user2_id', senderUserId)
      .maybeSingle()

    const { data: recipientDemoCouple } = await supabase
      .from('couples')
      .select('id')
      .eq('user1_id', recipientUser.id)
      .eq('user2_id', recipientUser.id)
      .maybeSingle()

    console.log('Demo couples found - sender:', senderDemoCouple, 'recipient:', recipientDemoCouple)

    // Delete demo mode couples before creating the real connection
    if (senderDemoCouple) {
      console.log('Deleting sender demo couple:', senderDemoCouple.id)
      const { error: deleteSenderError } = await supabase
        .from('couples')
        .delete()
        .eq('id', senderDemoCouple.id)
      
      if (deleteSenderError) {
        console.error('Error deleting sender demo couple:', deleteSenderError)
      }
    }

    if (recipientDemoCouple && recipientDemoCouple.id !== senderDemoCouple?.id) {
      console.log('Deleting recipient demo couple:', recipientDemoCouple.id)
      const { error: deleteRecipientError } = await supabase
        .from('couples')
        .delete()
        .eq('id', recipientDemoCouple.id)
      
      if (deleteRecipientError) {
        console.error('Error deleting recipient demo couple:', deleteRecipientError)
      }
    }

    // Create the couple connection
    console.log('Creating new couple connection between:', senderUserId, 'and', recipientUser.id)
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
      .or(`and(requester_id.eq.${senderUserId},requested_email.eq.${recipientEmail}),and(requester_id.eq.${recipientUser.id},requested_user_id.eq.${senderUserId})`)

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