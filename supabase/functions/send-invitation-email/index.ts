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

    // Create enhanced email template with better deliverability
    const createEmailTemplate = (isConnectType: boolean, partnerName: string, email: string) => {
      // Use the new resolver-based URLs for clear flow separation
      const acceptUrl = isConnectType 
        ? `${appUrl}/invite-resolver?email=${encodeURIComponent(email)}&sender=${encodeURIComponent(user.id)}&type=connect`
        : `${appUrl}/invite-resolver?email=${encodeURIComponent(email)}&sender=${encodeURIComponent(user.id)}&type=invite`
      
      console.log('Generated invitation URL:', acceptUrl, 'Type:', isConnectType ? 'connect' : 'invite');
      
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Love Sync Invitation</title>
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  
                  <!-- Header with Logo -->
                  <tr>
                    <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                        💕 Love Sync
                      </h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                        Strengthen your relationship together
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Invitation Card -->
                      <div style="background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 32px;">
                        <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                          ${isConnectType ? 'You have a new connection request!' : 'You\'re invited to join Love Sync!'}
                        </h2>
                        <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; line-height: 1.4;">
                          ${partnerName} wants to ${isConnectType ? 'start their Love Sync journey' : 'start their relationship journey'} with you
                        </p>
                      </div>
                      
                      <!-- Description -->
                      <div style="margin-bottom: 32px;">
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                          ${isConnectType 
                            ? 'Love Sync helps couples strengthen their relationship through daily check-ins, shared memories, and personalized insights. ' + partnerName + ' is inviting you to connect and start building a stronger relationship together.'
                            : 'Love Sync is designed to help couples grow closer through meaningful daily interactions and insights.'
                          }
                        </p>
                        
                        ${!isConnectType ? `
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                          <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px; font-weight: 600;">What you'll get:</h3>
                          <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.7;">
                            <li>💝 Daily mood sync and relationship scores</li>
                            <li>🤖 AI-powered relationship coaching</li>
                            <li>📸 Private memory vault and story sharing</li>
                            <li>📅 Collaborative date planning tools</li>
                            <li>📊 Personalized relationship insights</li>
                          </ul>
                        </div>
                        ` : ''}
                      </div>
                      
                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 32px 0;">
                        <a href="${acceptUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: #ffffff; text-decoration: none; padding: 18px 36px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); transition: all 0.3s ease;">
                          ${isConnectType ? 'Accept Connection Request' : 'Join Love Sync & Connect'}
                        </a>
                      </div>
                      
                      <!-- Alternative Link -->
                      <div style="text-align: center; margin: 20px 0;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                          Can't see the button? 
                          <a href="${acceptUrl}" style="color: #8B5CF6; text-decoration: none;">Click here to accept</a>
                        </p>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e5e7eb;">
                      <div style="text-align: center;">
                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                          This invitation will expire in 7 days.
                        </p>
                        <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
                          If you didn't expect this email, you can safely ignore it.
                        </p>
                        <p style="margin: 0; color: #6b7280; font-size: 12px;">
                          Sent with 💜 from Love Sync • 
                          <a href="${appUrl}" style="color: #8B5CF6; text-decoration: none;">lovesync.app</a> • 
                          <a href="mailto:hi@slyko.tech" style="color: #8B5CF6; text-decoration: none;">Support</a>
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    }

    try {
      if (type === 'connect') {
        // Send connection invitation to existing Love Sync user
        const { data, error } = await resend.emails.send({
          from: 'Love Sync <hi@slyko.tech>', // Using verified sender email
          to: [email],
          subject: `${displayName} wants to connect with you on Love Sync! 💕`,
          html: createEmailTemplate(true, displayName, email),
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high',
            'List-Unsubscribe': `<mailto:hi@slyko.tech?subject=Unsubscribe>`,
            'X-Entity-Ref-ID': `love-sync-connect-${Date.now()}`,
          },
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
          html: createEmailTemplate(false, displayName, email),
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high',
            'List-Unsubscribe': `<mailto:hi@slyko.tech?subject=Unsubscribe>`,
            'X-Entity-Ref-ID': `love-sync-invite-${Date.now()}`,
          },
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