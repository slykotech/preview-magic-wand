import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { Resend } from 'npm:resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resendApiKey = Deno.env.get('RESEND_API_KEY')
const resend = resendApiKey ? new Resend(resendApiKey) : null

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
    // Check if Resend API key is configured
    if (!resend) {
      console.error('RESEND_API_KEY not configured')
      throw new Error('Email service not configured')
    }

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
    const appUrl = 'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com'

    console.log(`Sending ${type} email to ${email} from ${displayName}`)

    try {
      if (type === 'connect') {
        // Send connection invitation to existing Love Sync user
        const { data, error } = await resend.emails.send({
          from: 'Love Sync <hi@slyko.tech>', // Using verified sender email
          to: [email],
          subject: `${displayName} wants to connect with you on Love Sync! 💕`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #8B5CF6; margin: 0; font-size: 28px;">💕 Love Sync</h1>
              </div>
              
              <div style="background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; border-radius: 16px; color: white; text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; font-size: 24px;">You have a new connection request!</h2>
                <p style="margin: 0; font-size: 18px; opacity: 0.9;">${displayName} wants to start their Love Sync journey with you</p>
              </div>
              
              <div style="background: #F9FAFB; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
                <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                  Love Sync helps couples strengthen their relationship through daily check-ins, shared memories, and personalized insights. 
                  ${displayName} is inviting you to connect and start building a stronger relationship together.
                </p>
                
                <div style="text-align: center;">
                  <a href="${appUrl}/auth" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 10px;">
                    Accept Connection Request
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; color: #6B7280; font-size: 14px;">
                <p>This invitation will expire in 7 days.</p>
                <p style="margin-top: 20px;">
                  Sent with 💜 from Love Sync<br>
                  <a href="${appUrl}" style="color: #8B5CF6;">lovesync.app</a>
                </p>
              </div>
            </div>
          `,
        })

        if (error) {
          console.error('Resend error:', error)
          if (error.name === 'rate_limit_exceeded' || error.statusCode === 429) {
            throw new Error('Rate limit exceeded. Please try again in a few seconds.')
          }
          throw new Error(`Failed to send email: ${error.message}`)
        }

        console.log('Connection invitation email sent successfully:', data)
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
        const { data, error } = await resend.emails.send({
          from: 'Love Sync <hi@slyko.tech>', // Using verified sender email
          to: [email],
          subject: `${displayName} invited you to join Love Sync! 💕`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #8B5CF6; margin: 0; font-size: 28px;">💕 Love Sync</h1>
              </div>
              
              <div style="background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; border-radius: 16px; color: white; text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; font-size: 24px;">You're invited to join Love Sync!</h2>
                <p style="margin: 0; font-size: 18px; opacity: 0.9;">${displayName} wants to start their relationship journey with you</p>
              </div>
              
              <div style="background: #F9FAFB; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
                <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                  Love Sync is an app designed to help couples strengthen their relationship through:
                </p>
                
                <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                  <li>💝 Daily mood check-ins and sync scores</li>
                  <li>🤖 AI-powered relationship coaching</li>
                  <li>📸 Shared memory vault and stories</li>
                  <li>📅 Collaborative date planning</li>
                  <li>📊 Relationship insights and growth tracking</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="${appUrl}/auth" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 10px;">
                    Join Love Sync & Connect
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; color: #6B7280; font-size: 14px;">
                <p>Create your account and connect with ${displayName} to start your journey together!</p>
                <p style="margin-top: 20px;">
                  Sent with 💜 from Love Sync<br>
                  <a href="${appUrl}" style="color: #8B5CF6;">lovesync.app</a>
                </p>
              </div>
            </div>
          `,
        })

        if (error) {
          console.error('Resend error:', error)
          if (error.name === 'rate_limit_exceeded' || error.statusCode === 429) {
            throw new Error('Rate limit exceeded. Please try again in a few seconds.')
          }
          throw new Error(`Failed to send email: ${error.message}`)
        }

        console.log('Join Love Sync invitation email sent successfully:', data)
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
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to send email: ${emailError.message}` 
        }),
        { 
          status: 500, 
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