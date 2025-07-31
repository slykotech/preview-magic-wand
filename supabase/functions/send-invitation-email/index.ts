import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitationRequest {
  type: 'connect' | 'invite';
  email: string;
  senderName?: string;
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

    // Create supabase client
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

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error(`Authentication failed: ${authError?.message || 'Auth session missing!'}`)
    }

    const { type, email, senderName }: InvitationRequest = await req.json()

    if (!type || !email) {
      throw new Error('Type and email are required')
    }

    // Get sender's profile for personalization
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single()

    const displayName = senderName || senderProfile?.display_name || user.email?.split('@')[0] || 'Someone'

    // TODO: Implement email sending logic here
    // For now, we'll just log and return success
    console.log(`Sending ${type} email to ${email} from ${displayName}`)

    if (type === 'connect') {
      // Send connection invitation to existing Love Sync user
      console.log('Connection invitation email sent')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Connection invitation sent to ${email}`,
          type: 'connect'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // Send invitation to join Love Sync
      console.log('Join Love Sync invitation email sent')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Invitation to join Love Sync sent to ${email}`,
          type: 'invite'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
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