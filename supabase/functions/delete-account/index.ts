import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create regular client to verify user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.log('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = user.id
    console.log(`Starting account deletion for user: ${userId}`)

    // Start deleting user data in order (respecting foreign key constraints)
    
  // 1. Delete AI coach messages first
  // Get AI coach session IDs first
  const { data: userSessions } = await supabaseAdmin
    .from('ai_coach_sessions')
    .select('id')
    .eq('user_id', userId)
  
  if (userSessions && userSessions.length > 0) {
    const sessionIds = userSessions.map(session => session.id)
    const { error: aiMessagesError } = await supabaseAdmin
      .from('ai_coach_messages')
      .delete()
      .in('session_id', sessionIds)
    
    if (aiMessagesError) {
      console.log('Error deleting AI coach messages:', aiMessagesError)
    }
  }

    // 2. Delete AI coach sessions
    const { error: aiSessionsError } = await supabaseAdmin
      .from('ai_coach_sessions')
      .delete()
      .eq('user_id', userId)
    
    if (aiSessionsError) {
      console.log('Error deleting AI coach sessions:', aiSessionsError)
    }

    // 3. Delete story responses and views
    const { data: userStories } = await supabaseAdmin
      .from('stories')
      .select('id')
      .eq('user_id', userId)

    if (userStories && userStories.length > 0) {
      const storyIds = userStories.map(story => story.id)
      
      await supabaseAdmin.from('story_responses').delete().in('story_id', storyIds)
      await supabaseAdmin.from('story_views').delete().in('story_id', storyIds)
    }

    // 4. Delete user's own story views and responses
    await supabaseAdmin.from('story_responses').delete().eq('user_id', userId)
    await supabaseAdmin.from('story_views').delete().eq('viewer_id', userId)

    // 5. Delete stories
    await supabaseAdmin.from('stories').delete().eq('user_id', userId)

    // 6. Delete message reactions
    await supabaseAdmin.from('message_reactions').delete().eq('user_id', userId)

    // 7. Delete messages
    await supabaseAdmin.from('messages').delete().eq('sender_id', userId)

    // 8. Delete memory images for user's memories
    const { data: userMemories } = await supabaseAdmin
      .from('memories')
      .select('id')
      .eq('created_by', userId)

    if (userMemories && userMemories.length > 0) {
      const memoryIds = userMemories.map(memory => memory.id)
      await supabaseAdmin.from('memory_images').delete().in('memory_id', memoryIds)
    }

    // 9. Delete memories
    await supabaseAdmin.from('memories').delete().eq('created_by', userId)

    // 10. Delete notes
    await supabaseAdmin.from('notes').delete().eq('created_by', userId)

    // 11. Delete important dates
    await supabaseAdmin.from('important_dates').delete().eq('created_by', userId)

    // 12. Delete date ideas
    await supabaseAdmin.from('date_ideas').delete().eq('created_by', userId)

    // 13. Delete daily checkins
    await supabaseAdmin.from('daily_checkins').delete().eq('user_id', userId)

    // 14. Delete user conversation clears
    await supabaseAdmin.from('user_conversation_clears').delete().eq('user_id', userId)

    // 15. Get couple IDs where user is involved
    const { data: userCouples } = await supabaseAdmin
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    // 16. Delete couple-related data
    if (userCouples && userCouples.length > 0) {
      const coupleIds = userCouples.map(couple => couple.id)
      
      // Delete conversations and related data
      const { data: coupleConversations } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .in('couple_id', coupleIds)

      if (coupleConversations && coupleConversations.length > 0) {
        const conversationIds = coupleConversations.map(conv => conv.id)
        await supabaseAdmin.from('messages').delete().in('conversation_id', conversationIds)
        await supabaseAdmin.from('user_conversation_clears').delete().in('conversation_id', conversationIds)
      }

      await supabaseAdmin.from('conversations').delete().in('couple_id', coupleIds)
      await supabaseAdmin.from('couple_activity_log').delete().in('couple_id', coupleIds)
      await supabaseAdmin.from('couple_preferences').delete().in('couple_id', coupleIds)
      await supabaseAdmin.from('sync_scores').delete().in('couple_id', coupleIds)
      await supabaseAdmin.from('historical_sync_scores').delete().in('couple_id', coupleIds)
      await supabaseAdmin.from('relationship_insights').delete().in('couple_id', coupleIds)
      
      // Delete couples where user is involved
      await supabaseAdmin.from('couples').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    }

    // 17. Delete signup invitations
    await supabaseAdmin.from('signup_invitations').delete().eq('inviter_id', userId)

    // 18. Delete partner requests
    await supabaseAdmin.from('partner_requests').delete().or(`requester_id.eq.${userId},requested_user_id.eq.${userId}`)

    // 19. Delete pending verifications
    await supabaseAdmin.from('pending_verifications').delete().eq('email', user.email)

    // 20. Delete profile (this should happen automatically due to foreign key, but let's be explicit)
    await supabaseAdmin.from('profiles').delete().eq('user_id', userId)

    // 21. Finally, delete the user from auth.users
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteUserError) {
      console.error('Error deleting user from auth:', deleteUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully deleted account for user: ${userId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account and all associated data have been permanently deleted' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in delete-account function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error during account deletion' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})