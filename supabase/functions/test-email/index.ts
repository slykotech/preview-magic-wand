import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log(`Testing email sending to: ${email}`);

    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY is not configured in Supabase secrets',
          troubleshooting: 'Please add RESEND_API_KEY to your Supabase project secrets'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Resend API key is configured');

    // Test simple email send
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Love Sync <onboarding@resend.dev>',
      to: [email],
      subject: 'Love Sync Email Test 📧',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">📧 Email Test Successful!</h2>
          <p>This is a test email from Love Sync to verify your email configuration.</p>
          <p>If you received this email, your Resend integration is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            Sent at: ${new Date().toISOString()}<br>
            From: Love Sync Email Test Function
          </p>
        </div>
      `
    });

    if (emailError) {
      console.error('Resend test failed:', emailError);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Resend API Error: ${emailError.message}`,
          errorCode: emailError.name,
          troubleshooting: {
            domain_not_verified: 'Visit https://resend.com/domains to verify your domain',
            api_key_invalid: 'Check your RESEND_API_KEY in Supabase secrets',
            rate_limit: 'You have exceeded Resend rate limits, try again later'
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Test email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test email sent successfully to ${email}`,
        emailId: emailData?.id,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Email test error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        errorType: error.name || 'UnknownError'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);