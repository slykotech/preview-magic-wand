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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        } 
      }
    );

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
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

        // Check if requester already has a partner
        const { data: existingCouples } = await supabase
          .from('couples')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        // Filter out demo connections (where user1_id === user2_id)
        const existingCouple = existingCouples?.find(c => c.user1_id !== c.user2_id);

        if (existingCouple) {
          return new Response(JSON.stringify({
            success: false,
            error: 'You already have a partner'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check if partner user exists by looking up their profile
        const { data: partnerUserAuth } = await supabase.auth.admin.getUserByEmail(email);
        const partnerUser = partnerUserAuth.user;
        
        let partnerProfile = null;
        if (partnerUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', partnerUser.id)
            .maybeSingle();
          partnerProfile = profile;
        }

        console.log('Partner user found:', !!partnerUser, 'for email:', email);

        // Check if partner already has a connection
        if (partnerUser) {
          const { data: partnerCouples } = await supabase
            .from('couples')
            .select('*')
            .or(`user1_id.eq.${partnerUser.id},user2_id.eq.${partnerUser.id}`);

          // Filter out demo connections (where user1_id === user2_id)
          const realPartnership = partnerCouples?.find(c => c.user1_id !== c.user2_id);

          if (realPartnership) {
            return new Response(JSON.stringify({
              success: false,
              error: 'This user already has a partner'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // Create partner request
        const { data: partnerRequest, error: requestError } = await supabase
          .from('partner_requests')
          .insert({
            requester_id: user.id,
            requested_email: email,
            requested_user_id: partnerUser?.id || null,
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
        await sendInvitationEmail(email, user, partnerUser ? 'connect' : 'invite');
        console.log('Invitation email sent successfully');

        return new Response(JSON.stringify({
          success: true,
          message: partnerUser ? 'Connection request sent!' : 'Invitation sent!',
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

        // Double-check both users don't already have partners
        const { data: allCouples } = await supabase
          .from('couples')
          .select('*')
          .or(`user1_id.eq.${partnerRequest.requester_id},user2_id.eq.${partnerRequest.requester_id},user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        // Filter out demo connections (where user1_id === user2_id)
        const existingCouples = allCouples?.filter(c => c.user1_id !== c.user2_id);

        if (existingCouples && existingCouples.length > 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'One or both users already have a partner'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
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
          message: 'Partner connection established!',
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
          .eq('requested_user_id', user.id);

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
        // Find real partner connections (not demo)
        const { data: couples } = await supabase
          .from('couples')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        // Filter to only real partnerships (not demo mode)
        const realPartnership = couples?.find(c => c.user1_id !== c.user2_id);

        if (!realPartnership) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No partner connection found'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Remove the real partnership
        const { error: removeError } = await supabase
          .from('couples')
          .delete()
          .eq('id', realPartnership.id);

        if (removeError) {
          throw new Error('Failed to remove partner connection');
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
        const { data: couple } = await supabase
          .from('couples')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .maybeSingle();

        // Get pending requests
        const { data: incomingRequests } = await supabase
          .from('partner_requests')
          .select('*')
          .eq('requested_user_id', user.id)
          .eq('status', 'pending');

        const { data: outgoingRequests } = await supabase
          .from('partner_requests')
          .select('*')
          .eq('requester_id', user.id)
          .eq('status', 'pending');

        let status: 'unpaired' | 'pending' | 'paired' = 'unpaired';
        
        if (couple) {
          if (couple.user1_id === couple.user2_id) {
            status = 'unpaired'; // Demo connection
          } else {
            status = 'paired';
          }
        } else if ((incomingRequests && incomingRequests.length > 0) || (outgoingRequests && outgoingRequests.length > 0)) {
          status = 'pending';
        }

        return new Response(JSON.stringify({
          success: true,
          status,
          couple,
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
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  
  if (!resend) {
    console.log('Resend API key not configured, skipping email');
    return;
  }

  const inviterName = inviter.user_metadata?.first_name || 'Your partner';
  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/auth/v1', '') || 'https://lovesync.app';
  
  let subject: string;
  let html: string;
  
  if (type === 'connect') {
    subject = `${inviterName} wants to connect with you on Love Sync!`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e91e63;">💕 Love Sync Connection Request</h1>
        <p>Hi there!</p>
        <p><strong>${inviterName}</strong> has sent you a partner connection request on Love Sync!</p>
        <p>Love Sync is a relationship app that helps couples stay connected, plan amazing dates, and strengthen their bond.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/profile" 
             style="background-color: #e91e63; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Connection Request
          </a>
        </div>
        <p>Log in to your Love Sync account to accept or decline this connection request.</p>
        <p>With love,<br>The Love Sync Team 💝</p>
      </div>
    `;
  } else {
    subject = `${inviterName} invited you to join Love Sync!`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e91e63;">💕 You're Invited to Love Sync!</h1>
        <p>Hi there!</p>
        <p><strong>${inviterName}</strong> has invited you to join Love Sync - the app for couples who want to strengthen their relationship!</p>
        <p>Love Sync helps you and your partner:</p>
        <ul>
          <li>🎯 Set and track relationship goals together</li>
          <li>📅 Plan amazing dates and activities</li>
          <li>💭 Share daily check-ins and stay connected</li>
          <li>📈 Build stronger communication habits</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/signup" 
             style="background-color: #e91e63; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Join Love Sync
          </a>
        </div>
        <p>Sign up now and you'll automatically be connected with ${inviterName}!</p>
        <p>With love,<br>The Love Sync Team 💝</p>
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