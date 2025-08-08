import { supabase } from "@/integrations/supabase/client";

export class DeckManager {
  // Simple random drawing - no complex deck logic
  async drawNextCard(sessionId: string): Promise<any> {
    try {
      console.log('🎲 Drawing random card from database...');
      
      // Get all available cards from database
      const { data: allCards, error } = await supabase
        .from('deck_cards')
        .select('*')
        .eq('is_active', true);

      if (error || !allCards || allCards.length === 0) {
        console.error('❌ No cards available:', error);
        return null;
      }

      // Group by type
      const cardsByType = {
        action: allCards.filter(c => c.response_type === 'action'),
        text: allCards.filter(c => c.response_type === 'text'),
        photo: allCards.filter(c => c.response_type === 'photo')
      };

      console.log('📊 Available cards:', {
        action: cardsByType.action.length,
        text: cardsByType.text.length,
        photo: cardsByType.photo.length,
        total: allCards.length
      });

      // Get played cards for this session
      const { data: session } = await supabase
        .from('card_deck_game_sessions')
        .select('played_cards')
        .eq('id', sessionId)
        .single();

      const playedCardIds = Array.isArray(session?.played_cards) ? session.played_cards : [];
      console.log(`🔍 Already played: ${playedCardIds.length} cards`);

      // Filter out already played cards
      const availableCards = allCards.filter(card => !playedCardIds.includes(card.id));
      
      if (availableCards.length === 0) {
        console.log('🏁 All cards have been played!');
        return null;
      }

      // Randomly select type (equal probability: 33% each)
      const types = ['action', 'text', 'photo'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      // Get available cards of that type
      const availableOfType = availableCards.filter(c => c.response_type === randomType);
      
      // If no cards of that type available, pick from any available
      const cardsToPickFrom = availableOfType.length > 0 ? availableOfType : availableCards;
      
      // Randomly select card
      const selectedCard = cardsToPickFrom[Math.floor(Math.random() * cardsToPickFrom.length)];
      
      console.log(`✅ Selected ${selectedCard.response_type} card: ${selectedCard.prompt.substring(0, 50)}...`);

      // Update session with new card
      const updatedPlayedCards = [...playedCardIds, selectedCard.id];
      await supabase
        .from('card_deck_game_sessions')
        .update({
          current_card_id: selectedCard.id,
          played_cards: updatedPlayedCards,
          total_cards_played: updatedPlayedCards.length,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      return selectedCard;

    } catch (error) {
      console.error('❌ Failed to draw card:', error);
      throw error;
    }
  }

  async skipCard(sessionId: string): Promise<boolean> {
    try {
      const { data: session } = await supabase
        .from('card_deck_game_sessions')
        .select('current_card_id, skipped_cards')
        .eq('id', sessionId)
        .single();

      if (!session || !session.current_card_id) return false;

      // Add to skipped cards list
      const skippedCards = [...(Array.isArray(session.skipped_cards) ? session.skipped_cards : []), session.current_card_id];
      
      await supabase
        .from('card_deck_game_sessions')
        .update({ 
          skipped_cards: skippedCards,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      console.log(`⏭️ Skipped card: ${session.current_card_id}`);
      return true;

    } catch (error) {
      console.error('Failed to skip card:', error);
      return false;
    }
  }
}