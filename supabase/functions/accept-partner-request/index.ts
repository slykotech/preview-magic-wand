import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AcceptPartnerRequestData {
  requestId: string;
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

    // Extract JWT token from Authorization header
    const jwt = authHeader.replace('Bearer ', '')
    console.log('JWT token length:', jwt.length)

    // Create supabase client for user authentication
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify the user's JWT token by passing it directly
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt)

    if (authError || !user) {
      console.error('Auth error:', authError)
      console.error('User:', user)
      throw new Error(`Authentication failed: ${authError?.message || 'User not found'}`)
    }

    console.log('Authenticated user:', user.id)

    // Create supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { requestId }: AcceptPartnerRequestData = await req.json()

    if (!requestId) {
      throw new Error('Request ID is required')
    }

    console.log('Accepting partner request:', requestId)

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

    const nonDemoCouples = existingCouples?.filter(couple => couple.user1_id !== couple.user2_id) || []
    
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
    const demoCouples = existingCouples?.filter(couple => couple.user1_id === couple.user2_id) || []
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