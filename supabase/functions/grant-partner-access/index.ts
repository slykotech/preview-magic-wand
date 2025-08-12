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

interface GrantPartnerAccessRequest {
  partnerUserId: string;
  subscriptionId?: string;
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

    const { partnerUserId, subscriptionId }: GrantPartnerAccessRequest = await req.json()

    if (!partnerUserId) {
      throw new Error('Partner user ID is required')
    }

    console.log('Granting partner access:', partnerUserId)

    // Check if user has an active subscription
    let userSubscription
    if (subscriptionId) {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (subError) {
        console.error('Error fetching subscription:', subError)
        throw new Error('Failed to verify subscription')
      }

      userSubscription = subscription
    } else {
      // Find user's active subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['trial', 'active'])
        .maybeSingle()

      if (subError) {
        console.error('Error fetching subscription:', subError)
        throw new Error('Failed to verify subscription')
      }

      userSubscription = subscription
    }

    if (!userSubscription) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No active subscription found to share' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if partner is already linked to another subscription
    const { data: existingPartnerSub, error: partnerSubError } = await supabase
      .from('partner_subscriptions')
      .select('*')
      .eq('partner_user_id', partnerUserId)
      .eq('is_active', true)
      .maybeSingle()

    if (partnerSubError) {
      console.error('Error checking existing partner subscription:', partnerSubError)
      throw new Error('Failed to check partner subscription status')
    }

    if (existingPartnerSub) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Partner is already linked to another premium subscription' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Grant partner access
    const { data: partnerAccess, error: grantError } = await supabase
      .from('partner_subscriptions')
      .insert({
        premium_user_id: user.id,
        partner_user_id: partnerUserId,
        subscription_id: userSubscription.id,
        access_type: 'partner-linked'
      })
      .select()
      .single()

    if (grantError) {
      console.error('Error granting partner access:', grantError)
      throw new Error('Failed to grant partner access')
    }

    // Create notification for partner
    await supabase
      .from('notifications')
      .insert({
        user_id: partnerUserId,
        type: 'partner_access_granted',
        title: 'Premium Access Granted!',
        body: 'Your partner has shared their premium subscription with you. Enjoy all premium features!'
      })

    console.log('Successfully granted partner access:', partnerAccess)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Partner access granted successfully!',
        partnerAccess
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

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
