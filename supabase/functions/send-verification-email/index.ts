import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { Resend } from 'npm:resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resendApiKey = Deno.env.get('RESEND_API_KEY')
const resend = resendApiKey ? new Resend(resendApiKey) : null

interface VerificationRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
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

    const { email, firstName, lastName, password }: VerificationRequest = await req.json()

    if (!email || !firstName || !lastName || !password) {
      throw new Error('All fields are required')
    }

    // Create supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers({
      filter: `email.eq.${email}`
    })
    
    if (existingUser.users && existingUser.users.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'An account with this email already exists. Please sign in instead.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours

    // Store verification data temporarily (using a pending_verifications table)
    const { error: insertError } = await supabase
      .from('pending_verifications')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        password_hash: password, // Stored as plain text, Supabase Auth handles hashing
        verification_token: verificationToken,
        expires_at: expiresAt.toISOString()
      })

    if (insertError) {
      console.error('Error storing verification data:', insertError)
      throw new Error('Failed to process verification request')
    }

    const appUrl = 'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com'
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`
    
    console.log('Generated verification URL:', verificationUrl)

    // Create email template
    const createVerificationEmailTemplate = (firstName: string, verificationUrl: string) => {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Love Sync Account</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                        💕 Love Sync
                      </h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                        Verify your email to get started
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Welcome Section -->
                      <div style="text-align: center; margin-bottom: 32px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📧</div>
                        <h2 style="margin: 0 0 12px 0; color: #1f2937; font-size: 28px; font-weight: 600;">
                          Welcome to Love Sync, ${firstName}!
                        </h2>
                        <p style="margin: 0; color: #6b7280; font-size: 18px; line-height: 1.4;">
                          Please verify your email address to complete your account setup
                        </p>
                      </div>
                      
                      <!-- Verification Card -->
                      <div style="background: linear-gradient(135deg, #fef3f2, #fdf2f8); border: 2px solid #f3e8ff; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 32px;">
                        <p style="margin: 0 0 16px 0; color: #7c2d12; font-size: 16px; line-height: 1.5; font-weight: 500;">
                          🔐 Secure Account Verification Required
                        </p>
                        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">
                          Click the button below to verify your email and activate your account
                        </p>
                      </div>
                      
                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 32px 0;">
                        <a href="${verificationUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: #ffffff; text-decoration: none; padding: 18px 36px; border-radius: 12px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); transition: all 0.3s ease;">
                          ✅ Verify Email Address
                        </a>
                      </div>
                      
                      <!-- Security Notice -->
                      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 24px 0;">
                        <h4 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">🛡️ Security Notice:</h4>
                        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
                          <li>This verification link will expire in 24 hours</li>
                          <li>If you didn't create a Love Sync account, you can safely ignore this email</li>
                          <li>Never share this verification link with anyone</li>
                        </ul>
                      </div>
                      
                      <!-- Alternative Link -->
                      <div style="text-align: center; margin: 20px 0;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                          Can't see the button? 
                          <a href="${verificationUrl}" style="color: #8B5CF6; text-decoration: none;">Click here to verify</a>
                        </p>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e5e7eb;">
                      <div style="text-align: center;">
                        <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 12px;">
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

    // Send verification email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Love Sync <hi@slyko.tech>',
      to: [email],
      subject: 'Verify your Love Sync account 📧',
      html: createVerificationEmailTemplate(firstName, verificationUrl),
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'List-Unsubscribe': `<mailto:hi@slyko.tech?subject=Unsubscribe>`,
        'X-Entity-Ref-ID': `love-sync-verification-${verificationToken}`,
      },
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      if (emailError.name === 'rate_limit_exceeded' || emailError.statusCode === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few seconds.')
      }
      throw new Error(`Failed to send verification email: ${emailError.message}`)
    }

    console.log('Verification email sent successfully:', emailData)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Verification email sent to ${email}. Please check your inbox and click the verification link to complete your account setup.`,
        token: verificationToken // For testing purposes only
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Verification email error:', error)
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