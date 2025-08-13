import { supabase } from "@/integrations/supabase/client";

interface CardData {
  id: string;
  category: string;
  subcategory: string;
  prompt: string;
  timer_seconds: number;
  timer_category: string;
  difficulty_level: number;
  intimacy_level: number;
  requires_action: boolean;
  requires_physical_presence: boolean;
  mood_tags: string[];
  relationship_stage: string[];
  usage_count?: number;
  response_type: 'action' | 'text' | 'photo';
}

export class DeckManager {
  async drawNextCard(sessionId: string): Promise<CardData | null> {
    try {
      // Get current game session
      const { data: session, error: sessionError } = await supabase
        .from('card_deck_game_sessions')
        .select('played_cards, skipped_cards')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error('Failed to fetch session:', sessionError);
        return null;
      }

      // Get used card IDs
      const playedCards = Array.isArray(session.played_cards) ? session.played_cards : [];
      const skippedCards = Array.isArray(session.skipped_cards) ? session.skipped_cards : [];
      const usedCardIds = [...playedCards, ...skippedCards];

      // Fetch available cards (excluding used ones)
      const { data: availableCards, error: cardsError } = await supabase
        .from('deck_cards')
        .select('*')
        .eq('is_active', true)
        .not('id', 'in', usedCardIds.length > 0 ? `(${usedCardIds.map(id => `"${id}"`).join(',')})` : '("")');

      if (cardsError) {
        console.error('Failed to fetch cards:', cardsError);
        return null;
      }

      if (!availableCards || availableCards.length === 0) {
        console.log('No more cards available');
        return null;
      }

      // Select random card
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      const selectedCard = availableCards[randomIndex];

      // Update session with new card
      const updatedPlayedCards = [...playedCards, selectedCard.id];
      
      const { error: updateError } = await supabase
        .from('card_deck_game_sessions')
        .update({
          current_card_id: selectedCard.id,
          played_cards: updatedPlayedCards,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Failed to update session with new card:', updateError);
        return null;
      }

      // Update card usage count
      await supabase
        .from('deck_cards')
        .update({
          usage_count: (selectedCard.usage_count || 0) + 1
        })
        .eq('id', selectedCard.id);

      console.log('✅ Card drawn successfully:', selectedCard.prompt.substring(0, 50) + '...');
      return selectedCard as CardData;

    } catch (error) {
      console.error('Error in drawNextCard:', error);
      return null;
    }
  }

  async skipCard(sessionId: string): Promise<boolean> {
    try {
      // Get current session
      const { data: session, error: sessionError } = await supabase
        .from('card_deck_game_sessions')
        .select('current_card_id, skipped_cards')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session || !session.current_card_id) {
        console.error('Failed to fetch session or no current card:', sessionError);
        return false;
      }

      // Add current card to skipped cards
      const skippedCards = Array.isArray(session.skipped_cards) ? session.skipped_cards : [];
      const updatedSkippedCards = [...skippedCards, session.current_card_id];

      const { error: updateError } = await supabase
        .from('card_deck_game_sessions')
        .update({
          skipped_cards: updatedSkippedCards,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Failed to update skipped cards:', updateError);
        return false;
      }

      console.log('✅ Card skipped successfully');
      return true;

    } catch (error) {
      console.error('Error in skipCard:', error);
      return false;
    }
  }

  async getCardStats(sessionId: string) {
    try {
      const { data: session, error } = await supabase
        .from('card_deck_game_sessions')
        .select('played_cards, skipped_cards, total_cards_played')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        return {
          totalCardsPlayed: 0,
          cardsSkipped: 0,
          cardsRemaining: 0
        };
      }

      const playedCards = Array.isArray(session.played_cards) ? session.played_cards : [];
      const skippedCards = Array.isArray(session.skipped_cards) ? session.skipped_cards : [];
      
      // Get total available cards
      const { data: totalCards } = await supabase
        .from('deck_cards')
        .select('id')
        .eq('is_active', true);

      const totalAvailable = totalCards?.length || 0;
      const usedCards = playedCards.length + skippedCards.length;
      
      return {
        totalCardsPlayed: session.total_cards_played || 0,
        cardsSkipped: skippedCards.length,
        cardsRemaining: Math.max(0, totalAvailable - usedCards)
      };

    } catch (error) {
      console.error('Error getting card stats:', error);
      return {
        totalCardsPlayed: 0,
        cardsSkipped: 0,
        cardsRemaining: 0
      };
    }
  }
}