import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RemovePartnerRequest {
  coupleId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const { coupleId }: RemovePartnerRequest = await req.json()

    if (!coupleId) {
      throw new Error('Couple ID is required')
    }

    console.log('Removing partner from couple:', coupleId)

    // Step 1: Verify the couple belongs to the current user
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

    // Step 2: Reset the couple to demo mode (user paired with themselves)
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