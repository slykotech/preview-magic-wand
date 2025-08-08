import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId, userId } = await req.json();

    if (!sessionId || !userId) {
      throw new Error("Missing required parameters");
    }

    console.log('🚨 Processing timer expiration for:', { sessionId, userId });

    // Get current game session
    const { data: gameSession, error: fetchError } = await supabaseClient
      .from("card_deck_game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchError) {
      console.error('Error fetching game session:', fetchError);
      throw fetchError;
    }

    if (!gameSession) {
      throw new Error("Game session not found");
    }

    // Determine which user failed (must be the current turn holder)
    if (gameSession.current_turn !== userId) {
      console.log('Timer expired but user is not current turn holder');
      return new Response(
        JSON.stringify({ success: false, message: "Not your turn" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine failed tasks field
    const isUser1 = gameSession.user1_id === userId;
    const failedTasksField = isUser1 ? 'user1_failed_tasks' : 'user2_failed_tasks';
    const currentFailedTasks = gameSession[failedTasksField] || 0;
    const newFailedTasks = currentFailedTasks + 1;

    console.log('💀 Failed task details:', {
      userId,
      isUser1,
      failedTasksField,
      currentFailedTasks,
      newFailedTasks
    });

    // Check if game should end
    const gameEnded = newFailedTasks >= 3;
    const winnerId = gameEnded ? (isUser1 ? gameSession.user2_id : gameSession.user1_id) : null;

    // Prepare update data
    const updateData: any = {
      [failedTasksField]: newFailedTasks,
      current_card_started_at: null,
      current_card_revealed: false,
      current_card_completed: true,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // If game ends, set completion data
    if (gameEnded) {
      updateData.status = 'completed';
      updateData.winner_id = winnerId;
      updateData.win_reason = 'failed_tasks';
      updateData.completed_at = new Date().toISOString();
      updateData.current_card_id = null;
    } else {
      // Switch turns and draw new card
      updateData.current_turn = isUser1 ? gameSession.user2_id : gameSession.user1_id;
      
      // Draw next card
      const { data: availableCards } = await supabaseClient
        .from("deck_cards")
        .select("id")
        .eq("is_active", true)
        .not("id", "in", `(${[...(gameSession.played_cards || []), gameSession.current_card_id].filter(Boolean).join(",")})`)
        .limit(10);
      
      if (availableCards && availableCards.length > 0) {
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        updateData.current_card_id = randomCard.id;
      }
    }

    console.log('🔄 Updating game session with:', updateData);

    // Update game session
    const { error: updateError } = await supabaseClient
      .from("card_deck_game_sessions")
      .update(updateData)
      .eq("id", sessionId);

    if (updateError) {
      console.error('Error updating game session:', updateError);
      throw updateError;
    }

    console.log('✅ Timer expiration handled successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        failedTasks: newFailedTasks,
        gameEnded,
        winnerId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in handle-timer-expiration:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});