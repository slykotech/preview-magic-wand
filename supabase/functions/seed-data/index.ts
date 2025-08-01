import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { user_id: string; display_name: string | null }
      }
      couples: {
        Row: { id: string; user1_id: string; user2_id: string }
      }
      date_ideas: {
        Row: { id: string; couple_id: string; title: string }
      }
      memories: {
        Row: { id: string; couple_id: string; title: string }
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { userId } = await req.json()
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Seeding data for user:', userId)

    // Create/update user profile first
    await supabase.from('profiles').upsert([
      { user_id: userId, display_name: 'You' }
    ])

    // Check if user already has a couple record
    const { data: existingCouples } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .limit(1)

    const existingCouple = existingCouples && existingCouples.length > 0 ? existingCouples[0] : null

    let coupleId: string

    if (existingCouple) {
      console.log('User already has a couple record:', existingCouple.id)
      coupleId = existingCouple.id
      
      // If they're paired with themselves (demo mode), keep that
      // If they're paired with someone else, don't override it
      if (existingCouple.user1_id === existingCouple.user2_id) {
        console.log('User is in demo mode, keeping existing demo couple')
      } else {
        console.log('User is already paired with a partner, keeping existing relationship')
      }
    } else {
      // Create new demo couple (user with themselves)
      console.log('Creating new demo couple for user')
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .insert({
          user1_id: userId,
          user2_id: userId, // Same user for demo purposes
          relationship_status: 'dating',
          anniversary_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (coupleError) {
        throw coupleError
      }

      coupleId = couple.id
    }

    // Check if sample data already exists for this couple
    const { data: existingDateIdeas } = await supabase
      .from('date_ideas')
      .select('id')
      .eq('couple_id', coupleId)
      .limit(1)

    if (!existingDateIdeas || existingDateIdeas.length === 0) {
      // Add sample date ideas
      await supabase.from('date_ideas').insert([
        {
          couple_id: coupleId,
          created_by: userId,
          title: 'Sunset Picnic',
          description: 'Watch the sunset with a cozy picnic',
          category: 'Outdoor',
          estimated_cost: '$20-40',
          estimated_duration: '2-3 hours',
          location: 'Local park'
        },
        {
          couple_id: coupleId,
          created_by: userId,
          title: 'Movie Night',
          description: 'Cozy movie night at home',
          category: 'Indoor',
          estimated_cost: '$10-20',
          estimated_duration: '2-3 hours',
          location: 'Home'
        }
      ])
    } else {
      console.log('Sample date ideas already exist for this couple')
    }

    // Check if sample memories already exist
    const { data: existingMemories } = await supabase
      .from('memories')
      .select('id')
      .eq('couple_id', coupleId)
      .limit(1)

    if (!existingMemories || existingMemories.length === 0) {
      // Add sample memories
      await supabase.from('memories').insert([
        {
          couple_id: coupleId,
          created_by: userId,
          title: 'First Date',
          description: 'Our amazing first date at the coffee shop',
          memory_date: new Date().toISOString().split('T')[0]
        }
      ])
    } else {
      console.log('Sample memories already exist for this couple')
    }

    // Check if checkins already exist
    const { data: existingCheckins } = await supabase
      .from('daily_checkins')
      .select('id')
      .eq('couple_id', coupleId)
      .eq('user_id', userId)
      .limit(1)

    if (!existingCheckins || existingCheckins.length === 0) {
      // Add sample checkins for both "partners" (same user)
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      await supabase.from('daily_checkins').insert([
        {
          user_id: userId,
          couple_id: coupleId,
          checkin_date: today,
          mood: 'happy',
          energy_level: 4,
          relationship_feeling: 'connected',
          gratitude: 'Grateful for this beautiful relationship'
        },
        {
          user_id: userId,
          couple_id: coupleId,
          checkin_date: yesterday,
          mood: 'content',
          energy_level: 3,
          relationship_feeling: 'neutral',
          gratitude: 'Thankful for a peaceful day together'
        }
      ])
    } else {
      console.log('Sample checkins already exist for this couple')
    }

    // Check if sync score already exists for today
    const today = new Date().toISOString().split('T')[0]
    const { data: existingScore } = await supabase
      .from('sync_scores')
      .select('id')
      .eq('couple_id', coupleId)
      .eq('calculated_date', today)
      .maybeSingle()

    if (!existingScore) {
      // Calculate and store sync score
      const syncScore = await supabase.rpc('calculate_sync_score', { p_couple_id: coupleId })
      
      if (syncScore.data) {
        await supabase.from('sync_scores').insert({
          couple_id: coupleId,
          score: syncScore.data,
          calculated_date: today
        })
      }

      // Generate insights
      await supabase.rpc('generate_relationship_insights', { p_couple_id: coupleId })
    } else {
      console.log('Sync score and insights already exist for today')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sample data created successfully',
        coupleId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error seeding data:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})