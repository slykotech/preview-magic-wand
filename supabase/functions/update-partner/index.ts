import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdatePartnerRequest {
  partnerEmail: string;
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

    const { partnerEmail, coupleId }: UpdatePartnerRequest = await req.json()

    if (!partnerEmail || !coupleId) {
      throw new Error('Partner email and couple ID are required')
    }

    console.log('Updating partner for couple:', coupleId, 'to email:', partnerEmail)

    // Step 1: Find partner by email (check if they have an account)
    const { data: partnerAuthData, error: partnerAuthError } = await supabase.auth.admin.listUsers()
    
    if (partnerAuthError) {
      console.error('Error fetching users:', partnerAuthError)
      throw new Error('Failed to search for partner')
    }

    const partnerUser = partnerAuthData.users.find(u => u.email === partnerEmail)

    if (!partnerUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Partner not found. They need to create an account first.',
          needsInvite: true 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Found partner user:', partnerUser.id)

    // Get current couple data to check if it's demo mode
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

    // Check if this is demo mode (user is paired with themselves)
    const isDemoMode = currentCouple.user1_id === currentCouple.user2_id

    // Step 2: Check if partner is already in another couple relationship (skip if demo mode and same user)
    if (!isDemoMode || partnerUser.id !== user.id) {
      const { data: existingPartnerCouple, error: partnerCoupleError } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${partnerUser.id},user2_id.eq.${partnerUser.id}`)
        .neq('id', coupleId) // Exclude current couple
        .maybeSingle()

      if (partnerCoupleError) {
        console.error('Error checking partner\'s existing couples:', partnerCoupleError)
        throw new Error('Failed to check partner availability')
      }

      if (existingPartnerCouple) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Partner is already in another couple relationship' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Step 3: Update the couple relationship
    // Determine which user field to update
    let updateData: any = {}
    if (currentCouple.user1_id === user.id) {
      updateData.user2_id = partnerUser.id
    } else {
      updateData.user1_id = partnerUser.id
    }

    const { data: updatedCouple, error: updateError } = await supabase
      .from('couples')
      .update(updateData)
      .eq('id', coupleId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating couple:', updateError)
      throw new Error('Failed to update couple relationship')
    }

    console.log('Successfully updated couple:', updatedCouple)

    // Step 5: Create or update partner's profile if needed
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: partnerUser.id,
        display_name: partnerUser.user_metadata?.first_name || partnerEmail.split('@')[0]
      })

    if (profileError) {
      console.log('Profile update warning:', profileError) // Not critical
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Partner connection updated successfully!',
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