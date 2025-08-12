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

    // Helper function to safely delete with error logging
    const safeDelete = async (tableName: string, operation: () => Promise<any>, description: string) => {
      try {
        console.log(`Starting: ${description}`)
        const result = await operation()
        if (result.error) {
          console.log(`Warning in ${description}:`, result.error)
        } else {
          console.log(`Completed: ${description}`)
        }
        return result
      } catch (error) {
        console.log(`Error in ${description}:`, error)
        return { error }
      }
    }

    // 1. Get couple IDs where user is involved (needed for game achievements)
    const { data: userCouples } = await supabaseAdmin
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    // 2. Delete game achievements first
    if (userCouples && userCouples.length > 0) {
      const coupleIds = userCouples.map(couple => couple.id)
      await safeDelete('game_achievements', async () => {
        return await supabaseAdmin.from('game_achievements').delete().in('couple_id', coupleIds)
      }, 'Delete game achievements')
    }

    // 3. Delete card responses first
    await safeDelete('card_responses', async () => {
      return await supabaseAdmin.from('card_responses').delete().eq('user_id', userId)
    }, 'Delete card responses')

    // 4. Delete game deck data
    const { data: userGameSessions } = await supabaseAdmin
      .from('card_deck_game_sessions')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    
    if (userGameSessions && userGameSessions.length > 0) {
      const sessionIds = userGameSessions.map(session => session.id)
      await safeDelete('game_decks', async () => {
        return await supabaseAdmin.from('game_decks').delete().in('session_id', sessionIds)
      }, 'Delete game decks')
    }

    // 5. Delete card deck game sessions
    await safeDelete('card_deck_game_sessions', async () => {
      return await supabaseAdmin.from('card_deck_game_sessions').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    }, 'Delete card deck game sessions')

    // 6. Delete game sessions
    await safeDelete('game_sessions', async () => {
      return await supabaseAdmin.from('game_sessions').delete().or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    }, 'Delete game sessions')

    // 7. Delete love grants
    await safeDelete('love_grants', async () => {
      return await supabaseAdmin.from('love_grants').delete().or(`winner_user_id.eq.${userId},granted_by_user_id.eq.${userId}`)
    }, 'Delete love grants')

    // 8. Delete AI coach messages first
    const { data: userSessions } = await supabaseAdmin
      .from('ai_coach_sessions')
      .select('id')
      .eq('user_id', userId)
    
    if (userSessions && userSessions.length > 0) {
      const sessionIds = userSessions.map(session => session.id)
      await safeDelete('ai_coach_messages', async () => {
        return await supabaseAdmin.from('ai_coach_messages').delete().in('session_id', sessionIds)
      }, 'Delete AI coach messages')
    }

    // 9. Delete AI coach sessions and usage
    await safeDelete('ai_coach_sessions', async () => {
      return await supabaseAdmin.from('ai_coach_sessions').delete().eq('user_id', userId)
    }, 'Delete AI coach sessions')

    await safeDelete('ai_coach_usage', async () => {
      return await supabaseAdmin.from('ai_coach_usage').delete().eq('user_id', userId)
    }, 'Delete AI coach usage')

    // 10. Delete story responses and views for user's stories
    const { data: userStories } = await supabaseAdmin
      .from('stories')
      .select('id')
      .eq('user_id', userId)

    if (userStories && userStories.length > 0) {
      const storyIds = userStories.map(story => story.id)
      
      await safeDelete('story_responses', async () => {
        return await supabaseAdmin.from('story_responses').delete().in('story_id', storyIds)
      }, 'Delete story responses for user stories')
      
      await safeDelete('story_views', async () => {
        return await supabaseAdmin.from('story_views').delete().in('story_id', storyIds)
      }, 'Delete story views for user stories')
    }

    // 11. Delete user's own story responses and views
    await safeDelete('story_responses', async () => {
      return await supabaseAdmin.from('story_responses').delete().eq('user_id', userId)
    }, 'Delete user story responses')

    await safeDelete('story_views', async () => {
      return await supabaseAdmin.from('story_views').delete().eq('viewer_id', userId)
    }, 'Delete user story views')

    // 12. Delete stories
    await safeDelete('stories', async () => {
      return await supabaseAdmin.from('stories').delete().eq('user_id', userId)
    }, 'Delete user stories')

    // 13. Delete notifications and feedback
    await safeDelete('notifications', async () => {
      return await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
    }, 'Delete user notifications')

    await safeDelete('feedback_submissions', async () => {
      return await supabaseAdmin.from('feedback_submissions').delete().eq('user_id', userId)
    }, 'Delete feedback submissions')

    // 14. Delete message reactions
    await safeDelete('message_reactions', async () => {
      return await supabaseAdmin.from('message_reactions').delete().eq('user_id', userId)
    }, 'Delete message reactions')

    // 15. Delete messages
    await safeDelete('messages', async () => {
      return await supabaseAdmin.from('messages').delete().eq('sender_id', userId)
    }, 'Delete user messages')

    // 16. Delete memory images for user's memories
    const { data: userMemories } = await supabaseAdmin
      .from('memories')
      .select('id')
      .eq('created_by', userId)

    if (userMemories && userMemories.length > 0) {
      const memoryIds = userMemories.map(memory => memory.id)
      await safeDelete('memory_images', async () => {
        return await supabaseAdmin.from('memory_images').delete().in('memory_id', memoryIds)
      }, 'Delete memory images')
    }

    // 17. Delete memories
    await safeDelete('memories', async () => {
      return await supabaseAdmin.from('memories').delete().eq('created_by', userId)
    }, 'Delete user memories')

    // 18. Delete notes
    await safeDelete('notes', async () => {
      return await supabaseAdmin.from('notes').delete().eq('created_by', userId)
    }, 'Delete user notes')

    // 19. Delete important dates
    await safeDelete('important_dates', async () => {
      return await supabaseAdmin.from('important_dates').delete().eq('created_by', userId)
    }, 'Delete important dates')

    // 20. Delete date ideas
    await safeDelete('date_ideas', async () => {
      return await supabaseAdmin.from('date_ideas').delete().eq('created_by', userId)
    }, 'Delete date ideas')

    // 21. Delete daily checkins
    await safeDelete('daily_checkins', async () => {
      return await supabaseAdmin.from('daily_checkins').delete().eq('user_id', userId)
    }, 'Delete daily checkins')

    // 22. Delete user conversation clears
    await safeDelete('user_conversation_clears', async () => {
      return await supabaseAdmin.from('user_conversation_clears').delete().eq('user_id', userId)
    }, 'Delete user conversation clears')

    // 23. Delete subscription-related data
    await safeDelete('subscribers', async () => {
      return await supabaseAdmin.from('subscribers').delete().eq('user_id', userId)
    }, 'Delete subscriber data')

    await safeDelete('entitlements', async () => {
      return await supabaseAdmin.from('entitlements').delete().eq('user_id', userId)
    }, 'Delete entitlements')

    await safeDelete('user_api_quotas', async () => {
      return await supabaseAdmin.from('user_api_quotas').delete().eq('user_id', userId)
    }, 'Delete API quotas')

    await safeDelete('device_sessions', async () => {
      return await supabaseAdmin.from('device_sessions').delete().eq('user_id', userId)
    }, 'Delete device sessions')

    await safeDelete('api_usage_logs', async () => {
      return await supabaseAdmin.from('api_usage_logs').delete().eq('user_id', userId)
    }, 'Delete API usage logs')

    // 24. Delete couple-related data
    if (userCouples && userCouples.length > 0) {
      const coupleIds = userCouples.map(couple => couple.id)
      
      // Delete conversations and related data
      const { data: coupleConversations } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .in('couple_id', coupleIds)

      if (coupleConversations && coupleConversations.length > 0) {
        const conversationIds = coupleConversations.map(conv => conv.id)
        
        await safeDelete('messages', async () => {
          return await supabaseAdmin.from('messages').delete().in('conversation_id', conversationIds)
        }, 'Delete couple conversation messages')
        
        await safeDelete('user_conversation_clears', async () => {
          return await supabaseAdmin.from('user_conversation_clears').delete().in('conversation_id', conversationIds)
        }, 'Delete couple conversation clears')
      }

      await safeDelete('conversations', async () => {
        return await supabaseAdmin.from('conversations').delete().in('couple_id', coupleIds)
      }, 'Delete couple conversations')

      await safeDelete('couple_activity_log', async () => {
        return await supabaseAdmin.from('couple_activity_log').delete().in('couple_id', coupleIds)
      }, 'Delete couple activity log')

      await safeDelete('couple_preferences', async () => {
        return await supabaseAdmin.from('couple_preferences').delete().in('couple_id', coupleIds)
      }, 'Delete couple preferences')

      await safeDelete('sync_scores', async () => {
        return await supabaseAdmin.from('sync_scores').delete().in('couple_id', coupleIds)
      }, 'Delete sync scores')

      await safeDelete('historical_sync_scores', async () => {
        return await supabaseAdmin.from('historical_sync_scores').delete().in('couple_id', coupleIds)
      }, 'Delete historical sync scores')

      await safeDelete('relationship_insights', async () => {
        return await supabaseAdmin.from('relationship_insights').delete().in('couple_id', coupleIds)
      }, 'Delete relationship insights')
      
      // Delete couples where user is involved
      await safeDelete('couples', async () => {
        return await supabaseAdmin.from('couples').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      }, 'Delete couples')
    }

    // 25. Delete signup invitations
    await safeDelete('signup_invitations', async () => {
      return await supabaseAdmin.from('signup_invitations').delete().eq('inviter_id', userId)
    }, 'Delete signup invitations')

    // 26. Delete partner requests
    await safeDelete('partner_requests', async () => {
      return await supabaseAdmin.from('partner_requests').delete().or(`requester_id.eq.${userId},requested_user_id.eq.${userId}`)
    }, 'Delete partner requests')

    // 27. Delete pending verifications
    if (user.email) {
      await safeDelete('pending_verifications', async () => {
        return await supabaseAdmin.from('pending_verifications').delete().eq('email', user.email)
      }, 'Delete pending verifications')
    }

    // 28. Delete profile
    await safeDelete('profiles', async () => {
      return await supabaseAdmin.from('profiles').delete().eq('user_id', userId)
    }, 'Delete user profile')

    // 29. Finally, delete the user from auth.users
    console.log('Attempting to delete user from auth system...')
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteUserError) {
      console.error('Error deleting user from auth:', deleteUserError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user account from auth system',
          details: deleteUserError.message 
        }),
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
      JSON.stringify({ 
        error: 'Internal server error during account deletion',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})