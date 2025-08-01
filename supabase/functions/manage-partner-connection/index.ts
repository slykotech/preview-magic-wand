import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PartnerConnectionRequest {
  action: 'send_request' | 'accept_request' | 'remove_partner';
  partnerEmail?: string;
  requestId?: string;
  coupleId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Extract JWT token from Bearer token
    const token = authHeader.replace('Bearer ', '')
    console.log('JWT token length:', token.length)

    // Create supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    console.log('User:', user?.id || 'null')

    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error(`Authentication failed: ${authError?.message || 'Auth session missing!'}`)
    }

    console.log('Authenticated user:', user.id)


    const { action, partnerEmail, requestId, coupleId }: PartnerConnectionRequest = await req.json()

    console.log('Action:', action)

    // Handle different actions
    switch (action) {
      case 'send_request':
        return await handleSendRequest(supabase, user, partnerEmail!, token)
      
      case 'accept_request':
        return await handleAcceptRequest(supabase, user, requestId!)
      
      case 'remove_partner':
        return await handleRemovePartner(supabase, user, coupleId!)
      
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Edge function error:', error)
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

// Handle send partner request
async function handleSendRequest(supabase: any, user: any, partnerEmail: string, token?: string) {
  console.log('Sending partner request to:', partnerEmail)

  // Validate input
  if (!partnerEmail) {
    throw new Error('Partner email is required')
  }

  // Prevent self-partnering
  if (user.email === partnerEmail) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'You cannot send a partner request to yourself.' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Check if user is already in a non-demo couple
  const { data: existingCouple, error: coupleError } = await supabase
    .from('couples')
    .select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .neq('user1_id', user.id) // Exclude demo mode couples where user1_id === user2_id
    .maybeSingle()

  if (coupleError) {
    console.error('Error checking existing couple:', coupleError)
    throw new Error('Failed to check couple status')
  }

  if (existingCouple) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'You are already in a couple relationship. Remove your current partner first.' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Check if partner exists in auth system
  const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers()
  
  if (authUsersError) {
    console.error('Error fetching users:', authUsersError)
    throw new Error('Failed to search for partner')
  }

  const partnerUser = authUsers.users.find((u: any) => u.email === partnerEmail)
  
  // Check for any existing requests to this email and clean them up if needed
  const { data: existingRequests, error: requestError } = await supabase
    .from('partner_requests')
    .select('*')
    .eq('requester_id', user.id)
    .eq('requested_email', partnerEmail)

  if (requestError) {
    console.error('Error checking existing requests:', requestError)
    throw new Error('Failed to check existing requests')
  }

  // If there are existing requests, delete them first to allow reconnection
  if (existingRequests && existingRequests.length > 0) {
    console.log('Found existing requests, cleaning up:', existingRequests.length)
    
    const { error: deleteError } = await supabase
      .from('partner_requests')
      .delete()
      .eq('requester_id', user.id)
      .eq('requested_email', partnerEmail)

    if (deleteError) {
      console.error('Error deleting existing requests:', deleteError)
      throw new Error('Failed to clean up existing requests')
    }
    
    console.log('Successfully cleaned up existing requests')
  }

  // Create partner request
  const { data: newRequest, error: createError } = await supabase
    .from('partner_requests')
    .insert({
      requester_id: user.id,
      requested_email: partnerEmail,
      requested_user_id: partnerUser?.id || null,
      status: 'pending'
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating partner request:', createError)
    throw new Error('Failed to create partner request')
  }

  console.log('Successfully created partner request:', newRequest)

  // Send invitation email
  try {
    const emailType = partnerUser ? 'connect' : 'invite';
    const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-invitation-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: emailType,
        email: partnerEmail
      })
    });

    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok || !emailData.success) {
      console.error('Failed to send invitation email:', emailData.error);
      // Don't fail the whole request, but log the email issue
    } else {
      console.log('Invitation email sent successfully');
    }
  } catch (emailError) {
    console.error('Error calling send-invitation-email function:', emailError);
    // Don't fail the whole request, but log the email issue
  }

  const message = partnerUser 
    ? `Partner request sent to ${partnerEmail}! They will receive an email to accept the connection.`
    : `Partner request created! ${partnerEmail} will need to create an account first, then they can accept your request via email.`

  return new Response(
    JSON.stringify({ 
      success: true, 
      message,
      request: newRequest,
      partnerExists: !!partnerUser
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

// Handle accept partner request
async function handleAcceptRequest(supabase: any, user: any, requestId: string) {
  console.log('Accepting partner request:', requestId)

  if (!requestId) {
    throw new Error('Request ID is required')
  }

  // Get the partner request
  const { data: request, error: requestError } = await supabase
    .from('partner_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (requestError || !request) {
    console.error('Request not found:', requestError)
    throw new Error('Partner request not found or already processed')
  }

  // Verify the user is the intended recipient
  if (request.requested_email !== user.email && request.requested_user_id !== user.id) {
    throw new Error('You are not authorized to accept this request')
  }

  console.log('Found valid request:', request)

  // Check if either user is already in a couple (excluding demo mode)
  const { data: existingCouples, error: coupleError } = await supabase
    .from('couples')
    .select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id},user1_id.eq.${request.requester_id},user2_id.eq.${request.requester_id}`)

  if (coupleError) {
    console.error('Error checking existing couples:', coupleError)
    throw new Error('Failed to check couple status')
  }

  const nonDemoCouples = existingCouples?.filter((couple: any) => couple.user1_id !== couple.user2_id) || []
  
  if (nonDemoCouples.length > 0) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'One of you is already in a couple relationship.' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Delete any demo mode couples for both users
  const demoCouples = existingCouples?.filter((couple: any) => couple.user1_id === couple.user2_id) || []
  for (const demoCouple of demoCouples) {
    await supabase
      .from('couples')
      .delete()
      .eq('id', demoCouple.id)
  }

  // Create new couple relationship
  const { data: newCouple, error: createCoupleError } = await supabase
    .from('couples')
    .insert({
      user1_id: request.requester_id,
      user2_id: user.id,
      relationship_status: 'dating'
    })
    .select()
    .single()

  if (createCoupleError) {
    console.error('Error creating couple:', createCoupleError)
    throw new Error('Failed to create couple relationship')
  }

  // Update request status to accepted
  const { error: updateError } = await supabase
    .from('partner_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error updating request status:', updateError)
    // Non-critical error, continue
  }

  // Ensure both users have profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert([
      {
        user_id: request.requester_id,
        display_name: 'User'
      },
      {
        user_id: user.id,
        display_name: user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'
      }
    ])

  if (profileError) {
    console.log('Profile update warning:', profileError) // Non-critical
  }

  console.log('Successfully created couple relationship:', newCouple)

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Partner request accepted! You are now connected.',
      couple: newCouple
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

// Handle remove partner
async function handleRemovePartner(supabase: any, user: any, coupleId: string) {
  console.log('Removing partner from couple:', coupleId)

  if (!coupleId) {
    throw new Error('Couple ID is required')
  }

  // Verify the couple belongs to the current user
  const { data: currentCouple, error: coupleError } = await supabase
    .from('couples')
    .select('*')
    .eq('id', coupleId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()

  if (coupleError || !currentCouple) {
    console.error('Couple verification error:', coupleError)
    throw new Error('Couple not found or access denied')
  }

  console.log('Current couple data:', currentCouple)

  // Reset the couple to demo mode (user paired with themselves)
  const { data: updatedCouple, error: updateError } = await supabase
    .from('couples')
    .update({
      user1_id: user.id,
      user2_id: user.id, // Reset to demo mode
      user1_nickname_for_user1: null,
      user1_nickname_for_user2: null,
      user2_nickname_for_user1: null,
      user2_nickname_for_user2: null
    })
    .eq('id', coupleId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating couple:', updateError)
    throw new Error('Failed to remove partner')
  }

  console.log('Successfully removed partner, reset to demo mode:', updatedCouple)

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Partner removed successfully. You can now add a new partner.',
      couple: updatedCouple
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}