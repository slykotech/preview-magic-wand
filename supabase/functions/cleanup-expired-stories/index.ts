import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Starting cleanup of expired stories...')

    // Get all expired stories
    const { data: expiredStories, error: fetchError } = await supabase
      .from('stories')
      .select('id, image_url, user_id')
      .lt('expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching expired stories:', fetchError)
      throw fetchError
    }

    if (!expiredStories || expiredStories.length === 0) {
      console.log('No expired stories found')
      return new Response(
        JSON.stringify({ message: 'No expired stories to clean up', count: 0 }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`Found ${expiredStories.length} expired stories to delete`)

    // Delete story images from storage first
    const imageUrls = expiredStories
      .filter(story => story.image_url)
      .map(story => {
        // Extract the file path from the full URL
        const url = new URL(story.image_url)
        const pathParts = url.pathname.split('/')
        // Path format: /storage/v1/object/public/story-images/user_id/filename
        const fileName = pathParts[pathParts.length - 1]
        return `${story.user_id}/${fileName}`
      })

    if (imageUrls.length > 0) {
      console.log(`Deleting ${imageUrls.length} story images from storage...`)
      
      const { error: storageError } = await supabase.storage
        .from('story-images')
        .remove(imageUrls)

      if (storageError) {
        console.error('Error deleting story images:', storageError)
        // Continue with database cleanup even if storage cleanup fails
      } else {
        console.log('Successfully deleted story images from storage')
      }
    }

    // Delete story responses first (due to foreign key constraints)
    const storyIds = expiredStories.map(story => story.id)
    
    const { error: responsesError } = await supabase
      .from('story_responses')
      .delete()
      .in('story_id', storyIds)

    if (responsesError) {
      console.error('Error deleting story responses:', responsesError)
    } else {
      console.log('Successfully deleted story responses')
    }

    // Delete story views
    const { error: viewsError } = await supabase
      .from('story_views')
      .delete()
      .in('story_id', storyIds)

    if (viewsError) {
      console.error('Error deleting story views:', viewsError)
    } else {
      console.log('Successfully deleted story views')
    }

    // Finally, delete the stories themselves
    const { error: deleteError } = await supabase
      .from('stories')
      .delete()
      .in('id', storyIds)

    if (deleteError) {
      console.error('Error deleting expired stories:', deleteError)
      throw deleteError
    }

    console.log(`Successfully deleted ${expiredStories.length} expired stories`)

    return new Response(
      JSON.stringify({ 
        message: 'Successfully cleaned up expired stories', 
        count: expiredStories.length,
        deletedStoryIds: storyIds
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in cleanup function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})