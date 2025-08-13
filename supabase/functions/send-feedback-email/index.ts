import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  feedback_type: 'rating' | 'general' | 'bug_report' | 'feature_request';
  rating?: number;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header and create authenticated supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { feedback_type, rating, message }: FeedbackRequest = await req.json();

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    // Store feedback in database
    const { error: insertError } = await supabase
      .from('feedback_submissions')
      .insert({
        user_id: user.id,
        feedback_type,
        rating,
        message
      });

    if (insertError) {
      console.error('Error storing feedback:', insertError);
      throw new Error('Failed to store feedback');
    }

    // Prepare email content
    const userName = profile?.display_name || 'Unknown User';
    const userEmail = user.email || 'Unknown Email';
    
    let subject = '';
    let feedbackTypeDisplay = '';
    
    switch (feedback_type) {
      case 'rating':
        subject = `App Rating: ${rating}/5 stars`;
        feedbackTypeDisplay = `Rating (${rating}/5 stars)`;
        break;
      case 'general':
        subject = 'General Feedback';
        feedbackTypeDisplay = 'General Feedback';
        break;
      case 'bug_report':
        subject = 'Bug Report';
        feedbackTypeDisplay = 'Bug Report';
        break;
      case 'feature_request':
        subject = 'Feature Request';
        feedbackTypeDisplay = 'Feature Request';
        break;
    }

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💕 LoveStory Feedback</h1>
        </div>
        
        <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1a202c; margin-top: 0;">${subject}</h2>
          
          <div style="background: #f7fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #2d3748; font-size: 14px;">User Information</h3>
            <p style="margin: 4px 0; color: #4a5568; font-size: 14px;"><strong>Name:</strong> ${userName}</p>
            <p style="margin: 4px 0; color: #4a5568; font-size: 14px;"><strong>Email:</strong> ${userEmail}</p>
            <p style="margin: 4px 0; color: #4a5568; font-size: 14px;"><strong>User ID:</strong> ${user.id}</p>
            <p style="margin: 4px 0; color: #4a5568; font-size: 14px;"><strong>Type:</strong> ${feedbackTypeDisplay}</p>
            <p style="margin: 4px 0; color: #4a5568; font-size: 14px;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          ${message ? `
          <div style="margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #2d3748; font-size: 14px;">Message</h3>
            <div style="background: #edf2f7; padding: 16px; border-radius: 6px; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #2d3748; line-height: 1.5;">${message}</p>
            </div>
          </div>
          ` : ''}
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #718096; font-size: 12px;">
              You can reply directly to this email to respond to the user.
            </p>
          </div>
        </div>
      </div>
    `;

    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'support@lovestory.app';

    const emailResponse = await resend.emails.send({
      from: "LoveStory <noreply@lovestory.app>",
      to: [adminEmail],
      replyTo: userEmail,
      subject: `[LoveStory] ${subject}`,
      html: emailHtml,
    });

    console.log("Feedback email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-feedback-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);