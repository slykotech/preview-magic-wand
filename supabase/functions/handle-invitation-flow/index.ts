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

interface InvitationFlowRequest {
  email: string;
  senderId: string;
  type?: 'invite' | 'connect';
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

    const { email, senderId, type }: InvitationFlowRequest = await req.json()

    if (!email || !senderId) {
      throw new Error('Email and sender ID are required')
    }

    console.log('Processing invitation flow:', { email, senderId, type })

    // Check if sender has premium access
    const { data: senderPremiumAccess } = await supabase.rpc('has_premium_access', {
      p_user_id: senderId
    });

    console.log('Sender premium access:', senderPremiumAccess);

    // Check if recipient user exists
    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw new Error('Failed to check user existence');
    }

    const recipientUser = allUsers.users.find(u => u.email === email);
    
    let flowType = type;
    
    // If no explicit type provided, determine based on user existence
    if (!flowType) {
      flowType = recipientUser ? 'connect' : 'invite';
    }

    const response = {
      flow: flowType,
      userExists: !!recipientUser,
      senderHasPremium: !!senderPremiumAccess,
      recipientUserId: recipientUser?.id,
      shouldSkipPayment: false,
      message: ''
    };

    // If sender has premium and recipient exists, they should get premium access
    if (senderPremiumAccess && recipientUser) {
      response.shouldSkipPayment = true;
      response.message = 'Your partner has premium! You get full access without payment.';
    } else if (senderPremiumAccess && !recipientUser) {
      response.shouldSkipPayment = true; // They'll get access once they sign up
      response.message = 'Your partner has premium! You\'ll get full access once you sign up.';
    } else {
      response.message = 'Complete signup to access premium features together.';
    }

    console.log('Invitation flow response:', response);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...response
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    );
  }
});
