import { Resend } from 'npm:resend@2.0.0';
import type { EmailSendOptions, EmailTemplate, ResendEmailResponse } from './types.ts';

export class EmailService {
  private resend: Resend;
  private defaultSender: string;

  constructor() {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    
    this.resend = new Resend(resendApiKey);
    this.defaultSender = 'Love Sync <noreply@slyko.tech>'; // Using verified domain
  }

  async sendEmail(options: EmailSendOptions): Promise<ResendEmailResponse> {
    try {
      console.log(`Sending email to: ${options.to.join(', ')}`);
      console.log(`Subject: ${options.template.subject}`);

      const { data, error } = await this.resend.emails.send({
        from: this.defaultSender,
        to: options.to,
        subject: options.template.subject,
        html: options.template.html,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
          'List-Unsubscribe': '<mailto:onboarding@resend.dev?subject=Unsubscribe>',
          'X-Entity-Ref-ID': options.entityRefId || `love-sync-${Date.now()}`,
          ...options.template.headers,
        },
      });

      if (error) {
        console.error('Resend API error:', error);
        return {
          success: false,
          error: {
            message: error.message || 'Unknown email service error',
            name: error.name,
            statusCode: (error as any).statusCode
          }
        };
      }

      console.log('Email sent successfully:', data);
      return {
        success: true,
        data
      };

    } catch (err: any) {
      console.error('Email service error:', err);
      return {
        success: false,
        error: {
          message: err.message || 'Email service error',
          name: err.name || 'UnknownError'
        }
      };
    }
  }

  createInvitationTemplate(
    senderName: string, 
    isConnectType: boolean, 
    acceptUrl: string
  ): EmailTemplate {
    const actionText = isConnectType 
      ? `${senderName} wants to connect with you on Love Sync!`
      : `${senderName} invited you to join Love Sync!`;
    
    const buttonText = isConnectType 
      ? 'Connect with Partner' 
      : 'Join Love Sync';

    const subject = isConnectType
      ? `${senderName} wants to connect with you on Love Sync! 💕`
      : `${senderName} invited you to join Love Sync! 💕`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${actionText}</title>
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
                      ${actionText}
                    </p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    
                    <!-- Welcome Section -->
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                        ${isConnectType ? 'Connect with Your Partner' : 'Join the Love Sync Community'}
                      </h2>
                      <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                        ${isConnectType 
                          ? `${senderName} is already using Love Sync to strengthen relationships and wants to connect with you.`
                          : `${senderName} has invited you to join Love Sync, where couples strengthen their relationships together.`
                        }
                      </p>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${acceptUrl}" 
                         style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); 
                                color: white; 
                                padding: 16px 32px; 
                                text-decoration: none; 
                                border-radius: 8px; 
                                font-weight: 600; 
                                font-size: 16px;
                                display: inline-block;
                                box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);">
                        ${buttonText}
                      </a>
                    </div>
                    
                    <!-- Features Section -->
                    <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 12px;">
                      <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600; text-align: center;">
                        What you'll get with Love Sync:
                      </h3>
                      <ul style="margin: 0; padding: 0; list-style: none; color: #6b7280; font-size: 14px;">
                        <li style="margin: 8px 0; padding-left: 24px; position: relative;">
                          <span style="position: absolute; left: 0; color: #8B5CF6;">💝</span>
                          Daily check-ins to stay connected
                        </li>
                        <li style="margin: 8px 0; padding-left: 24px; position: relative;">
                          <span style="position: absolute; left: 0; color: #8B5CF6;">📱</span>
                          Private messaging and photo sharing
                        </li>
                        <li style="margin: 8px 0; padding-left: 24px; position: relative;">
                          <span style="position: absolute; left: 0; color: #8B5CF6;">📊</span>
                          Relationship insights and progress tracking
                        </li>
                        <li style="margin: 8px 0; padding-left: 24px; position: relative;">
                          <span style="position: absolute; left: 0; color: #8B5CF6;">💡</span>
                          AI-powered relationship coaching
                        </li>
                      </ul>
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
                        <a href="https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com" style="color: #8B5CF6; text-decoration: none;">lovesync.app</a> • 
                        <a href="mailto:onboarding@resend.dev" style="color: #8B5CF6; text-decoration: none;">Support</a>
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
    `;

    return { subject, html };
  }

  createVerificationTemplate(firstName: string, verificationUrl: string): EmailTemplate {
    const subject = 'Verify your Love Sync account 📧';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Verify Your Love Sync Account</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💕 Love Sync</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Verify your email to get started</p>
        </div>
        
        <div style="padding: 0 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${firstName}! 👋</h2>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Welcome to Love Sync! We're excited to help you and your partner strengthen your relationship. 
            To complete your account setup, please verify your email address.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold; 
                      font-size: 16px;
                      display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            This verification link will expire in 24 hours. If you didn't create a Love Sync account, 
            you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Love Sync - Strengthening relationships, one sync at a time
          </p>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  handleEmailError(error: NonNullable<ResendEmailResponse['error']>): Error {
    if (error.name === 'rate_limit_exceeded' || error.statusCode === 429) {
      return new Error('Rate limit exceeded. Please try again in a few seconds.');
    }
    
    if (error.message?.includes('domain')) {
      return new Error('Email domain not verified. Please contact support.');
    }
    
    if (error.message?.includes('api_key')) {
      return new Error('Email service configuration error. Please contact support.');
    }
    
    return new Error(`Failed to send email: ${error.message}`);
  }
}