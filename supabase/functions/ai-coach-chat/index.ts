import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = await req.json();

    const systemPrompt = `You are an AI relationship coach specializing in couple therapy and relationship advice. Your role is to:
    
    1. Provide empathetic, non-judgmental support
    2. Offer practical relationship advice and communication strategies  
    3. Help couples strengthen their emotional connection
    4. Suggest relationship-building activities and exercises
    5. Address common relationship challenges with evidence-based approaches
    
    User Context: ${userContext || 'General relationship guidance'}
    
    Guidelines:
    - Be warm, supportive, and encouraging
    - Ask thoughtful follow-up questions to understand the situation better
    - Provide actionable advice and specific techniques
    - Suggest couple activities, communication exercises, or date ideas when appropriate
    - Maintain professional boundaries while being personable
    - If serious issues like abuse are mentioned, gently suggest professional help
    
    Keep responses conversational but insightful, typically 2-3 sentences unless more detail is needed.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get AI response');
    }

    const aiMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-coach-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});