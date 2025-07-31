import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendPartnerRequestData {
  partnerEmail: string;
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

    // Create supabase client for user authentication
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Invalid or expired token')
    }

    console.log('Authenticated user:', user.id)

    // Create supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { partnerEmail }: SendPartnerRequestData = await req.json()

    if (!partnerEmail) {
      throw new Error('Partner email is required')
    }

    console.log('Sending partner request to:', partnerEmail)

    // Check if user is already in a couple (not demo mode)
    const { data: existingCouple, error: coupleError } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .neq('user1_id', user.id) // Exclude demo mode couples
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

    // Check if partner exists in auth system
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers()
    
    if (authUsersError) {
      console.error('Error fetching users:', authUsersError)
      throw new Error('Failed to search for partner')
    }

    const partnerUser = authUsers.users.find(u => u.email === partnerEmail)
    
    // Check for existing pending request to this email
    const { data: existingRequest, error: requestError } = await supabase
      .from('partner_requests')
      .select('*')
      .eq('requester_id', user.id)
      .eq('requested_email', partnerEmail)
      .eq('status', 'pending')
      .maybeSingle()

    if (requestError) {
      console.error('Error checking existing request:', requestError)
      throw new Error('Failed to check existing requests')
    }

    if (existingRequest) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'You already have a pending request to this email.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
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

    const message = partnerUser 
      ? `Partner request sent to ${partnerEmail}! They can accept it from their app.`
      : `Partner request created! ${partnerEmail} will need to create an account first, then they can accept your request.`

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