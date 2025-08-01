import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('Open AI API key');

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

**Conversation Guidelines**  
- Keep replies conversational and concise (2–4 sentences), unless a detailed exercise or example is requested.  
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