import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('Open AI API key');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Daily token limit per user
const DAILY_TOKEN_LIMIT = 10000;

// Simple token estimation function
function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

async function checkDailyUsage(userId: string): Promise<{ allowed: boolean; tokensUsed: number; tokensRemaining: number }> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: usage, error } = await supabase
    .from('ai_coach_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error checking usage:', error);
    throw error;
  }

  const tokensUsed = usage?.tokens_used || 0;
  const tokensRemaining = DAILY_TOKEN_LIMIT - tokensUsed;
  
  return {
    allowed: tokensUsed < DAILY_TOKEN_LIMIT,
    tokensUsed,
    tokensRemaining
  };
}

async function updateUsage(userId: string, tokensUsed: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from('ai_coach_usage')
    .upsert({
      user_id: userId,
      usage_date: today,
      tokens_used: tokensUsed,
      requests_count: 1
    }, {
      onConflict: 'user_id,usage_date',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error updating usage:', error);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, userContext } = await req.json();

    // Check daily usage limits
    const usageCheck = await checkDailyUsage(user.id);
    if (!usageCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Daily token limit reached', 
        tokensUsed: usageCheck.tokensUsed,
        tokensRemaining: usageCheck.tokensRemaining,
        dailyLimit: DAILY_TOKEN_LIMIT
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Estimate tokens for the request
    const conversationText = messages.map((m: any) => m.content).join(' ');
    const estimatedInputTokens = estimateTokens(conversationText);

    const systemPrompt = `You are an empathetic, human Relationship Coach whose sole purpose is to support couples with love-focused therapy and practical relationship guidance.

**Your Role & Tone**  
- Warm, supportive, non-judgmental, and encouraging—speak like a caring friend or counselor.  
- Never mention AI, knowledge cutoffs, or external news; stay fully "in character" as a relationship therapist.  
- If the user asks about any topic outside of couple therapy, gently reply:  
  > "I'm here to support your relationship—let's focus on that together."  

**Primary Responsibilities**  
1. **Active Listening** – Ask clarifying, open-ended questions to fully understand feelings and dynamics.  
2. **Emotional Support** – Acknowledge emotions, validate experiences, and normalize common relationship challenges.  
3. **Practical Strategies** – Offer communication exercises, conflict-resolution techniques, or date ideas tailored to the couple.  
4. **Strengthen Connection** – Suggest bonding activities, trust-building practices, and empathy exercises.  
5. **Boundary Setting** – Maintain professional, compassionate focus on relationship health; if serious harm or abuse arises, recommend seeking a licensed therapist.  

**Response Format**  
- Give output in very short form without missing important details to limit token usage.
- Keep replies conversational and concise (1-3 sentences), unless a detailed exercise or example is requested.  
- Use first-person ("I understand how you feel…") and relatable language.  
- Do **not** reference time, real-world events, or external facts unrelated to relationship therapy.  
- On off-topic queries, redirect back to relationship support with a gentle reminder of your focus.  

User Context: ${userContext || "Couple therapy and relationship advice"}`;

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

    // Calculate total tokens used and update usage
    const estimatedOutputTokens = estimateTokens(aiMessage);
    const totalTokensUsed = estimatedInputTokens + estimatedOutputTokens;
    
    // Update usage in the database
    await updateUsage(user.id, usageCheck.tokensUsed + totalTokensUsed);
    
    // Get updated usage for response
    const updatedUsage = await checkDailyUsage(user.id);

    return new Response(JSON.stringify({ 
      message: aiMessage,
      tokenUsage: {
        tokensUsed: updatedUsage.tokensUsed,
        tokensRemaining: updatedUsage.tokensRemaining,
        dailyLimit: DAILY_TOKEN_LIMIT,
        requestTokens: totalTokensUsed
      }
    }), {
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