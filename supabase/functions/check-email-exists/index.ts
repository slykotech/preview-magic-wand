import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailCheckRequest {
  email: string;
}

interface EmailCheckResponse {
  success: boolean;
  exists?: boolean;
  available?: boolean;
  status?: string;
  message?: string;
  error?: string;
}

Deno.serve(async (req) => {
  console.log('🚀 check-email-exists function called:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('🔐 Auth header check:', { 
      present: !!authHeader, 
      startsWithBearer: authHeader?.startsWith('Bearer '),
      length: authHeader?.length 
    })
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Invalid authorization header')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid authorization header' 
        } as EmailCheckResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract the JWT token
    const jwt = authHeader.replace('Bearer ', '')
    console.log('🎫 JWT token length:', jwt.length)

    // Create supabase client with the user's auth token
    const supabase = createClient(
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

    // Verify the user with the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('👤 User verification:', { 
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message 
    })

    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Authentication failed: ${authError?.message || 'Invalid session'}` 
        } as EmailCheckResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    let requestBody: EmailCheckRequest
    try {
      requestBody = await req.json()
    } catch (e) {
      console.log('❌ Failed to parse request body:', e)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request body' 
        } as EmailCheckResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { email } = requestBody
    console.log('📧 Checking email:', email)

    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email is required' 
        } as EmailCheckResponse),
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
          error: 'Invalid email format' 
        } as EmailCheckResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prevent checking self
    if (user.email === email.toLowerCase()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'You cannot connect with yourself' 
        } as EmailCheckResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create service role client for admin operations
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Searching for user in auth system...')

    // Check if email exists in auth system
    const { data: allUsers, error: authUsersError } = await serviceSupabase.auth.admin.listUsers()
    
    if (authUsersError) {
      console.log('❌ Error fetching users:', authUsersError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check user existence' 
        } as EmailCheckResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const targetUser = allUsers.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
    console.log('🎯 Target user found:', !!targetUser)
    
    if (!targetUser) {
      console.log('✅ User does not exist - can send signup invitation')
      return new Response(
        JSON.stringify({ 
          success: true, 
          exists: false,
          message: 'This email is not registered. You can send them a signup invitation.' 
        } as EmailCheckResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('👥 Checking couple status for user:', targetUser.id)

    // Check if the target user is already in a couple
    const { data: existingCouple, error: coupleError } = await serviceSupabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${targetUser.id},user2_id.eq.${targetUser.id}`)
      .maybeSingle()

    if (coupleError) {
      console.log('❌ Error checking couple status:', coupleError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check couple status' 
        } as EmailCheckResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const isAlreadyInCouple = !!existingCouple
    console.log('💑 User already in couple:', isAlreadyInCouple)

    const result: EmailCheckResponse = {
      success: true,
      exists: true,
      available: !isAlreadyInCouple,
      status: isAlreadyInCouple ? 'already_paired' : 'available',
      message: isAlreadyInCouple 
        ? 'This user is already in a couple relationship' 
        : 'Ready to send connection request'
    }

    console.log('✅ Returning result:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error.message}` 
      } as EmailCheckResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})