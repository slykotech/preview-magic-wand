import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GenerateEventsRequest {
  cityName: string;
  latitude: number;
  longitude: number;
  forceRefresh?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cityName, latitude, longitude, forceRefresh = false }: GenerateEventsRequest = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Generating AI events for ${cityName}...`);

    // Enhanced cache checking using new database functions
    if (!forceRefresh) {
      // First, check if city needs refresh using intelligent function
      const { data: needsRefresh, error: refreshError } = await supabase.rpc('city_needs_event_refresh', {
        p_city_name: cityName,
        p_min_events: 5,
        p_hours_threshold: 24 // 24-hour cache for AI events
      });

      if (refreshError) {
        console.error('Error checking refresh status:', refreshError);
      } else if (!needsRefresh) {
        // Get existing events to return
        const { data: existingEvents, error: checkError } = await supabase.rpc('search_events_by_location', {
          p_lat: latitude,
          p_lng: longitude,
          p_radius_km: 50,
          p_city_name: cityName,
          p_limit: 15
        });

        if (!checkError && existingEvents && existingEvents.length >= 5) {
          console.log(`Found ${existingEvents.length} fresh events for ${cityName}, using cache`);
          return new Response(
            JSON.stringify({
              success: true,
              events: existingEvents,
              source: 'cache',
              message: `Using cached events for ${cityName} (${existingEvents.filter(e => e.ai_generated).length} AI-generated)`
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          );
        }
      }
    }

    // Generate batch ID for this generation run
    const generationBatchId = crypto.randomUUID();

    // Create generation job record
    const { data: jobData, error: jobError } = await supabase
      .from('ai_generation_jobs')
      .insert({
        city_name: cityName,
        generation_batch_id: generationBatchId,
        status: 'running'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job record:', jobError);
    }

    // Generate events using OpenAI
    const prompt = `Generate exactly 15 realistic local events for ${cityName}. Include a mix of:
- Cultural events (concerts, art shows, theater)
- Food & dining (restaurant openings, food festivals, farmers markets)  
- Outdoor activities (hiking meetups, sports, park events)
- Entertainment (comedy shows, live music, trivia nights)
- Community events (workshops, classes, networking)
- Family-friendly activities
- Date night options

For each event, provide:
- title: Clear, engaging event name
- description: 2-3 sentences describing the event
- start_date: Date/time in next 2 weeks (format: YYYY-MM-DDTHH:MM:SS)
- location_name: Specific venue or area in ${cityName}
- category: One of: music, food, art, sports, social, outdoor, learning, entertainment
- price: Realistic price (Free, $5, $10-20, etc.)
- organizer: Realistic business/organization name

Make events feel authentic to ${cityName} culture and venues. Vary times throughout the week including evenings and weekends.

Respond in valid JSON format as an array of events.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert event curator who creates realistic, engaging local events. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const generatedContent = aiResponse.choices[0].message.content;

    // Parse JSON response
    let aiEvents;
    try {
      aiEvents = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedContent);
      throw new Error('Invalid JSON response from AI');
    }

    if (!Array.isArray(aiEvents)) {
      throw new Error('AI response is not an array');
    }

    console.log(`Generated ${aiEvents.length} events for ${cityName}`);

    // Transform and insert events into database with enhanced data
    const eventsToInsert = aiEvents.map((event: any, index: number) => {
      // Create more realistic coordinate distribution around the city center
      const radiusKm = 0.05; // ~5km radius
      const angle = (index / aiEvents.length) * 2 * Math.PI; // Distribute evenly in circle
      const distance = Math.random() * radiusKm; // Random distance within radius
      
      const deltaLat = distance * Math.cos(angle) / 111; // 111 km per degree latitude
      const deltaLng = distance * Math.sin(angle) / (111 * Math.cos(latitude * Math.PI / 180));

      return {
        external_id: `ai-${generationBatchId}-${crypto.randomUUID()}`,
        title: event.title || 'Untitled Event',
        description: event.description || '',
        start_date: event.start_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location_name: event.location_name || `${cityName} Area`,
        latitude: latitude + deltaLat,
        longitude: longitude + deltaLng,
        price: event.price || 'Free',
        organizer: event.organizer || 'Local Organization',
        category: event.category || 'social',
        source: 'ai_generated',
        ai_generated: true,
        generation_batch_id: generationBatchId,
        city_name: cityName,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
    });

    // Insert events into database
    const { data: insertedEvents, error: insertError } = await supabase
      .from('events')
      .insert(eventsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting events:', insertError);
      throw insertError;
    }

    // Update job status
    if (jobData) {
      await supabase
        .from('ai_generation_jobs')
        .update({
          status: 'completed',
          events_generated: insertedEvents?.length || 0,
          completed_at: new Date().toISOString(),
          cost_estimate: 0.01 // Estimated cost
        })
        .eq('id', jobData.id);
    }

    console.log(`Successfully generated and stored ${insertedEvents?.length || 0} events for ${cityName}`);

    return new Response(
      JSON.stringify({
        success: true,
        events: insertedEvents || [],
        source: 'fresh',
        generationBatchId,
        message: `Generated ${insertedEvents?.length || 0} new AI events for ${cityName}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-ai-events function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        events: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});