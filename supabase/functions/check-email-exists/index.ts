import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error(`Authentication failed: ${authError?.message || 'Auth session missing!'}`)
    }

    // Get email from query parameters or request body
    let email;
    if (req.method === 'GET') {
      const url = new URL(req.url)
      email = url.searchParams.get('email')
    } else {
      const body = await req.json()
      email = body.email
    }

    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email parameter is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          exists: false,
          error: 'Invalid email format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prevent checking self
    if (user.email === email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          exists: false,
          error: 'You cannot invite yourself' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if email exists in auth system - get all users and filter manually for reliability
    const { data: allUsers, error: authUsersError } = await supabase.auth.admin.listUsers()
    
    if (authUsersError) {
      console.error('Error fetching users:', authUsersError)
      throw new Error('Failed to search for user')
    }

    const userExists = allUsers.users.find((user: any) => user.email === email)
    
    if (!userExists) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          exists: false,
          message: 'This email is not registered with Love Sync.' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if the user is already in a couple (excluding demo mode)
    const { data: existingCouple, error: coupleError } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${userExists.id},user2_id.eq.${userExists.id}`)
      .neq('user1_id', userExists.id) // Exclude demo mode couples
      .maybeSingle()

    if (coupleError) {
      console.error('Error checking couple status:', coupleError)
      throw new Error('Failed to check user status')
    }

    const isAvailable = !existingCouple
    const status = isAvailable ? 'available' : 'already_paired'
    const message = isAvailable 
      ? 'Ready to invite this user' 
      : 'This user is already in a couple relationship'

    return new Response(
      JSON.stringify({ 
        success: true, 
        exists: true,
        available: isAvailable,
        status,
        message
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