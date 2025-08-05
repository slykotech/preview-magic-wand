import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PartnerConnectionRequest {
  action: 'send_request' | 'accept_request' | 'decline_request' | 'remove_partner' | 'check_status';
  email?: string;
  request_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('JWT token length:', token.length);

    // Create user client for authentication
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        } 
      }
    );

    // Create admin client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log('Authenticated user:', user.id);
    
    const { action, email, request_id }: PartnerConnectionRequest = await req.json();
    console.log('Action:', action);

    switch (action) {
      case 'send_request': {
        if (!email) {
          throw new Error('Email is required for send_request');
        }

        console.log('Sending partner request to:', email);
        
        // Check if user is trying to invite themselves
        if (email.toLowerCase() === user.email?.toLowerCase()) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Cannot send partner request to yourself'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check if requester already has a partner (exclude demo connections where user1_id = user2_id)
        const { data: existingCouple } = await supabase
          .from('couples')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .neq('user1_id', 'user2_id') // Exclude demo connections
          .maybeSingle();

        if (existingCouple) {
          return new Response(JSON.stringify({
            success: false,
            error: 'You already have a partner'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check rate limiting - 30 seconds between requests
        const { data: recentRequests } = await supabase
          .from('partner_requests')
          .select('created_at')
          .eq('requester_id', user.id)
          .gte('created_at', new Date(Date.now() - 30000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (recentRequests && recentRequests.length > 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Please wait 30 seconds before sending another request'
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Look up partner user by email
        const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
        
        if (authUsersError) {
          console.error('Error looking up users:', authUsersError);
          // Continue without user lookup - treat as invitation to new user
        }
        
        const existingAuthUser = authUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        const partnerUserId = existingAuthUser?.id;
        
        let partnerUser = null;
        if (partnerUserId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', partnerUserId)
            .maybeSingle();
          partnerUser = profileData;
        }

        console.log('Partner user found:', !!partnerUser, 'for email:', email);

        // Check if partner already has a connection (exclude demo connections)
        if (partnerUserId) {
          const { data: partnerCouple } = await supabase
            .from('couples')
            .select('*')
            .or(`user1_id.eq.${partnerUserId},user2_id.eq.${partnerUserId}`)
            .neq('user1_id', 'user2_id') // Exclude demo connections
            .maybeSingle();

          if (partnerCouple) {
            return new Response(JSON.stringify({
              success: false,
              error: 'This user already has a partner'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // Clean up any existing pending requests between these users
        await supabase
          .from('partner_requests')
          .delete()
          .eq('requester_id', user.id)
          .eq('requested_email', email.toLowerCase().trim());

        // Create partner request
        const { data: partnerRequest, error: requestError } = await supabase
          .from('partner_requests')
          .insert({
            requester_id: user.id,
            requested_email: email.toLowerCase().trim(),
            requested_user_id: partnerUserId || null,
            status: 'pending'
          })
          .select()
          .single();

        if (requestError) {
          console.error('Error creating partner request:', requestError);
          throw new Error('Failed to create partner request');
        }

        console.log('Successfully created partner request:', partnerRequest);

        // Send email invitation
        console.log('Sending invite email to', email);
        try {
          await sendInvitationEmail(email, user, partnerUser ? 'connect' : 'invite');
          console.log('Invitation email sent successfully');
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail the request if email fails
        }

        return new Response(JSON.stringify({
          success: true,
          message: partnerUser ? 'Connection request sent! 💌' : 'Invitation sent! 💌',
          request_id: partnerRequest.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'accept_request': {
        if (!request_id) {
          throw new Error('Request ID is required for accept_request');
        }

        // Get the partner request
        const { data: partnerRequest, error: fetchError } = await supabase
          .from('partner_requests')
          .select('*')
          .eq('id', request_id)
          .eq('status', 'pending')
          .single();

        if (fetchError || !partnerRequest) {
          throw new Error('Partner request not found or already processed');
        }

        // Verify the current user is the requested user
        if (partnerRequest.requested_user_id !== user.id && partnerRequest.requested_email !== user.email) {
          throw new Error('Unauthorized to accept this request');
        }

        // Double-check both users don't already have partners (exclude demo connections)
        const { data: existingCouples } = await supabase
          .from('couples')
          .select('*')
          .or(`user1_id.eq.${partnerRequest.requester_id},user2_id.eq.${partnerRequest.requester_id},user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .neq('user1_id', 'user2_id'); // Exclude demo connections

        if (existingCouples && existingCouples.length > 0) {
          // Clean up demo connections for both users
          await supabase
            .from('couples')
            .delete()
            .or(`user1_id.eq.${partnerRequest.requester_id},user1_id.eq.${user.id}`)
            .eq('user1_id', 'user2_id'); // Only delete demo connections
        }

        // Create the couple relationship
        const { data: couple, error: coupleError } = await supabase
          .from('couples')
          .insert({
            user1_id: partnerRequest.requester_id,
            user2_id: user.id,
            relationship_status: 'dating'
          })
          .select()
          .single();

        if (coupleError) {
          console.error('Error creating couple:', coupleError);
          throw new Error('Failed to create partnership');
        }

        // Update partner request status
        await supabase
          .from('partner_requests')
          .update({ status: 'accepted' })
          .eq('id', request_id);

        return new Response(JSON.stringify({
          success: true,
          message: 'Partner connection established! 💕',
          couple_id: couple.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'decline_request': {
        if (!request_id) {
          throw new Error('Request ID is required for decline_request');
        }

        const { error: declineError } = await supabase
          .from('partner_requests')
          .update({ status: 'declined' })
          .eq('id', request_id)
          .or(`requested_user_id.eq.${user.id},requested_email.eq.${user.email}`);

        if (declineError) {
          throw new Error('Failed to decline request');
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Partner request declined'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'remove_partner': {
        // Find and remove the couple relationship (exclude demo connections)
        const { data: existingCouple } = await supabase
          .from('couples')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .neq('user1_id', 'user2_id') // Only remove real partnerships
          .maybeSingle();

        if (existingCouple) {
          const { error: removeError } = await supabase
            .from('couples')
            .delete()
            .eq('id', existingCouple.id);

          if (removeError) {
            throw new Error('Failed to remove partner connection');
          }

          // Create demo connections for both users
          try {
            await supabase
              .from('couples')
              .insert([
                {
                  user1_id: existingCouple.user1_id,
                  user2_id: existingCouple.user1_id,
                  relationship_status: 'dating'
                },
                {
                  user1_id: existingCouple.user2_id,
                  user2_id: existingCouple.user2_id,
                  relationship_status: 'dating'
                }
              ]);
          } catch (error) {
            console.log('Demo connections may already exist:', error);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Partner connection removed'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'check_status': {
        // Get current couple status
        const { data: couples } = await supabase
          .from('couples')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        // Separate demo and real connections
        const realCouple = couples?.find(c => c.user1_id !== c.user2_id);
        const demoCouple = couples?.find(c => c.user1_id === c.user2_id);

        // Get pending requests
        const { data: incomingRequests } = await supabase
          .from('partner_requests')
          .select('*')
          .or(`requested_user_id.eq.${user.id},requested_email.eq.${user.email}`)
          .eq('status', 'pending');

        const { data: outgoingRequests } = await supabase
          .from('partner_requests')
          .select('*')
          .eq('requester_id', user.id)
          .eq('status', 'pending');

        let status: 'unpaired' | 'pending' | 'paired' = 'unpaired';
        let currentCouple = realCouple || null;
        
        if (realCouple) {
          status = 'paired';
        } else if ((incomingRequests && incomingRequests.length > 0) || (outgoingRequests && outgoingRequests.length > 0)) {
          status = 'pending';
        } else {
          status = 'unpaired';
          
          // Auto-create demo connection if none exists
          if (!demoCouple) {
            try {
              const { data: newDemo } = await supabase
                .from('couples')
                .insert({
                  user1_id: user.id,
                  user2_id: user.id,
                  relationship_status: 'dating'
                })
                .select()
                .single();
              
              currentCouple = newDemo;
            } catch (error) {
              console.log('Demo connection already exists or error creating:', error);
            }
          } else {
            currentCouple = demoCouple;
          }
        }

        return new Response(JSON.stringify({
          success: true,
          status,
          couple: currentCouple,
          incoming_requests: incomingRequests || [],
          outgoing_requests: outgoingRequests || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in partner connection function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendInvitationEmail(email: string, inviter: any, type: 'connect' | 'invite') {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    console.log('Resend API key not configured, skipping email');
    return;
  }
  
  const resend = new Resend(resendApiKey);

  const inviterName = inviter.user_metadata?.first_name || 'Your partner';
  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/auth/v1', '') || 'https://lovesync.app';
  
  let subject: string;
  let html: string;
  
  if (type === 'connect') {
    subject = `${inviterName} wants to connect with you on Love Sync! 💕`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff6b9d, #c44569); padding: 2px; border-radius: 12px;">
        <div style="background: white; padding: 30px; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #e91e63; margin: 0; font-size: 28px;">💕 Love Sync</h1>
            <p style="color: #666; margin: 5px 0;">Connection Request</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #ff6b9d10, #c4456910); padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #e91e63; margin: 0 0 15px 0;">Hi there! 👋</h2>
            <p style="color: #333; line-height: 1.6; margin: 15px 0;"><strong>${inviterName}</strong> has sent you a partner connection request on Love Sync!</p>
            <p style="color: #333; line-height: 1.6; margin: 15px 0;">Love Sync is a relationship app that helps couples stay connected, plan amazing dates, and strengthen their bond.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/profile" 
               style="background: linear-gradient(135deg, #ff6b9d, #e91e63); color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; box-shadow: 0 4px 15px rgba(233, 30, 99, 0.3);">
              💕 Accept Connection Request
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #666; font-size: 14px; line-height: 1.6;">Log in to your Love Sync account to accept or decline this connection request.</p>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">With love,<br>The Love Sync Team 💝</p>
          </div>
        </div>
      </div>
    `;
  } else {
    subject = `${inviterName} invited you to join Love Sync! 💕`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff6b9d, #c44569); padding: 2px; border-radius: 12px;">
        <div style="background: white; padding: 30px; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #e91e63; margin: 0; font-size: 28px;">💕 You're Invited to Love Sync!</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #ff6b9d10, #c4456910); padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #e91e63; margin: 0 0 15px 0;">Hi there! 👋</h2>
            <p style="color: #333; line-height: 1.6; margin: 15px 0;"><strong>${inviterName}</strong> has invited you to join Love Sync - the app for couples who want to strengthen their relationship!</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #e91e63; margin: 0 0 15px 0;">Love Sync helps you and your partner:</h3>
            <ul style="color: #333; line-height: 1.8; padding-left: 20px;">
              <li>🎯 Set and track relationship goals together</li>
              <li>📅 Plan amazing dates and activities</li>
              <li>💭 Share daily check-ins and stay connected</li>
              <li>📈 Build stronger communication habits</li>
              <li>💕 Track your relationship sync score</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/signup" 
               style="background: linear-gradient(135deg, #ff6b9d, #e91e63); color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; box-shadow: 0 4px 15px rgba(233, 30, 99, 0.3);">
              🚀 Join Love Sync
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #666; font-size: 14px; line-height: 1.6;">Sign up now and you'll automatically be connected with ${inviterName}!</p>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">With love,<br>The Love Sync Team 💝</p>
          </div>
        </div>
      </div>
    `;
  }

  try {
    await resend.emails.send({
      from: 'Love Sync <noreply@lovesync.app>',
      to: [email],
      subject,
      html
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw error - email is nice to have but not critical
  }
}