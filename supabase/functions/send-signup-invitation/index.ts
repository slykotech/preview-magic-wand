import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { Resend } from 'npm:resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resendApiKey = Deno.env.get('RESEND_API_KEY')
const resend = resendApiKey ? new Resend(resendApiKey) : null

interface SignupInvitationRequest {
  email: string;
  inviterName?: string;
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

    // Create supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error(`Authentication failed: ${authError?.message || 'Invalid token'}`)
    }

    const { email, inviterName }: SignupInvitationRequest = await req.json()

    if (!email) {
      throw new Error('Email is required')
    }

    // Get sender's profile for personalization
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single()

    const displayName = inviterName || senderProfile?.display_name || user.email?.split('@')[0] || 'Someone'

    console.log(`Creating signup invitation for ${email} from ${displayName}`)

    // Create invitation record and get secure token
    const { data: invitationData, error: invitationError } = await supabase
      .rpc('create_signup_invitation', {
        p_invitee_email: email,
        p_inviter_name: displayName
      })

    if (invitationError) {
      console.error('Error creating invitation:', invitationError)
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }

    const invitation = invitationData as any
    
    if (!invitation.success) {
      // Handle specific error cases
      if (invitation.user_exists) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: invitation.error,
            action: 'use_connect_instead',
            message: 'This email is already registered. Use the Connect invitation instead.'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      throw new Error(invitation.error)
    }

    // Build secure signup URL with token
    const appUrl = 'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com'
    const signupUrl = `${appUrl}/new-user-invite?token=${invitation.token}&email=${encodeURIComponent(email)}&sender=${encodeURIComponent(user.id)}`
    
    console.log('Generated secure signup URL:', signupUrl)

    // Create enhanced email template
    const createSignupEmailTemplate = (partnerName: string, signupUrl: string) => {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Join Love Sync - You're Invited!</title>
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
                      
                      <!-- Hero Section -->
                      <div style="text-align: center; margin-bottom: 32px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
                        <h2 style="margin: 0 0 12px 0; color: #1f2937; font-size: 28px; font-weight: 600;">
                          You're Invited to Join Love Sync!
                        </h2>
                        <p style="margin: 0; color: #6b7280; font-size: 18px; line-height: 1.4;">
                          ${partnerName} wants to start their relationship journey with you
                        </p>
                      </div>
                      
                      <!-- Invitation Card -->
                      <div style="background: linear-gradient(135deg, #fef3f2, #fdf2f8); border: 2px solid #f3e8ff; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 32px;">
                        <p style="margin: 0; color: #7c2d12; font-size: 16px; line-height: 1.5; font-weight: 500;">
                          🌟 Special Invitation 🌟<br>
                          Create your Love Sync account and automatically connect with ${partnerName}
                        </p>
                      </div>
                      
                      <!-- What is Love Sync -->
                      <div style="margin-bottom: 32px;">
                        <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">What is Love Sync?</h3>
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                          Love Sync is designed to help couples grow closer through meaningful daily interactions, shared memories, and personalized relationship insights.
                        </p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                          <h4 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px; font-weight: 600;">What you'll get:</h4>
                          <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.7;">
                            <li>💝 Daily mood sync and relationship health scores</li>
                            <li>🤖 AI-powered relationship coaching and insights</li>
                            <li>📸 Private memory vault and story sharing</li>
                            <li>📅 Collaborative date planning and activity suggestions</li>
                            <li>💬 Enhanced communication tools and prompts</li>
                            <li>📊 Personalized relationship growth tracking</li>
                          </ul>
                        </div>
                      </div>
                      
                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 32px 0;">
                        <a href="${signupUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: #ffffff; text-decoration: none; padding: 18px 36px; border-radius: 12px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); transition: all 0.3s ease;">
                          🚀 Join Love Sync & Connect
                        </a>
                      </div>
                      
                      <!-- Process Steps -->
                      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 24px 0;">
                        <h4 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Quick & Easy Process:</h4>
                        <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
                          <li>Click the button above to create your account</li>
                          <li>Fill in your basic details (takes 30 seconds)</li>
                          <li>Automatically connect with ${partnerName}</li>
                          <li>Start your Love Sync journey together!</li>
                        </ol>
                      </div>
                      
                      <!-- Alternative Link -->
                      <div style="text-align: center; margin: 20px 0;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                          Can't see the button? 
                          <a href="${signupUrl}" style="color: #8B5CF6; text-decoration: none;">Click here to join Love Sync</a>
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

    // Send invitation email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Love Sync <hi@slyko.tech>',
      to: [email],
      subject: `${displayName} invited you to join Love Sync! 💕`,
      html: createSignupEmailTemplate(displayName, signupUrl),
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'List-Unsubscribe': `<mailto:hi@slyko.tech?subject=Unsubscribe>`,
        'X-Entity-Ref-ID': `love-sync-signup-${invitation.invitation_id}`,
      },
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      if (emailError.name === 'rate_limit_exceeded' || emailError.statusCode === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few seconds.')
      }
      throw new Error(`Failed to send email: ${emailError.message}`)
    }

    console.log('Signup invitation email sent successfully:', emailData)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Signup invitation sent to ${email}`,
        invitation_id: invitation.invitation_id,
        expires_at: invitation.expires_at
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Signup invitation error:', error)
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