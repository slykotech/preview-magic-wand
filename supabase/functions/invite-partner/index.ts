import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

// Strict, dynamic CORS with an allowlist
const allowedOrigins = new Set<string>([
  'http://127.0.0.1:3000',
  'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com',
])
const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = allowedOrigins.has(origin) ? origin : 'null'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  } as const
}

interface InvitePartnerRequest {
  partnerEmail: string;
  userDisplayName: string;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid or expired token')
    }

    console.log('Authenticated user:', user.id)

    const { partnerEmail, userDisplayName }: InvitePartnerRequest = await req.json()

    if (!partnerEmail || !userDisplayName) {
      throw new Error('Partner email and user display name are required')
    }

    console.log('Inviting partner:', partnerEmail)

    // Step 1: Check if user already has a couple relationship
    const { data: existingCouple, error: coupleCheckError } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle()

    if (coupleCheckError) {
      console.error('Error checking existing couple:', coupleCheckError)
      throw new Error('Failed to check existing relationships')
    }

    if (existingCouple) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'You are already in a couple relationship. Please update your partner connection instead.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 2: Check if partner already has an account
    const { data: partnerAuthData, error: partnerAuthError } = await supabase.auth.admin.listUsers()
    
    if (partnerAuthError) {
      console.error('Error fetching users:', partnerAuthError)
      throw new Error('Failed to search for partner')
    }

    const partnerUser = partnerAuthData.users.find(u => u.email === partnerEmail)

    if (partnerUser) {
      // Partner has an account - check if they're already in a couple
      const { data: partnerCouple, error: partnerCoupleError } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${partnerUser.id},user2_id.eq.${partnerUser.id}`)
        .maybeSingle()

      if (partnerCoupleError) {
        console.error('Error checking partner\'s couples:', partnerCoupleError)
        throw new Error('Failed to check partner availability')
      }

      if (partnerCouple) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Your partner is already in another couple relationship' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create couple relationship immediately since both users exist
      const { data: newCouple, error: createCoupleError } = await supabase
        .from('couples')
        .insert({
          user1_id: user.id,
          user2_id: partnerUser.id,
          relationship_status: 'dating'
        })
        .select()
        .single()

      if (createCoupleError) {
        console.error('Error creating couple:', createCoupleError)
        throw new Error('Failed to create couple relationship')
      }

      // Update user's profile
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: userDisplayName
        })

      // Update partner's profile if needed
      await supabase
        .from('profiles')
        .upsert({
          user_id: partnerUser.id,
          display_name: partnerUser.user_metadata?.first_name || partnerEmail.split('@')[0]
        })

      console.log('Successfully created couple:', newCouple)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Couple relationship created successfully! Your partner already has an account.',
          couple: newCouple,
          partnerFound: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // Partner doesn't have an account - create a placeholder couple and send invitation
      // For now, create couple with the current user as both partners (demo mode)
      const { data: newCouple, error: createCoupleError } = await supabase
        .from('couples')
        .insert({
          user1_id: user.id,
          user2_id: user.id, // Placeholder - will be updated when partner joins
          relationship_status: 'dating'
        })
        .select()
        .single()

      if (createCoupleError) {
        console.error('Error creating couple:', createCoupleError)
        throw new Error('Failed to create couple relationship')
      }

      // Update user's profile
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: userDisplayName
        })

      console.log('Successfully created placeholder couple:', newCouple)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Couple profile created! Your partner (${partnerEmail}) will need to create an account. Once they do, you can connect via the couple setup page.`,
          couple: newCouple,
          partnerFound: false,
          inviteEmail: partnerEmail
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    )
  }
})
