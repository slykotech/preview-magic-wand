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
      // Get next unplayed card from shuffled deck
      const { data: nextCardData, error: cardsError } = await supabase
        .from('game_decks')
        .select(`
          card_id,
          deck_cards(*)
        `)
        .eq('session_id', sessionId)
        .eq('is_played', false)
        .eq('skipped', false)
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (cardsError) {
        console.error('Failed to draw card from deck:', cardsError);
        return null;
      }

      if (!nextCardData || !nextCardData.deck_cards) {
        console.log('No more cards available in shuffled deck');
        return null;
      }

      const selectedCard = nextCardData.deck_cards;

      // Update card usage count
      await supabase
        .from('deck_cards')
        .update({
          usage_count: (selectedCard.usage_count || 0) + 1
        })
        .eq('id', selectedCard.id);

      console.log('✅ Card drawn successfully from shuffled deck:', selectedCard.prompt.substring(0, 50) + '...');
      
      return {
        id: selectedCard.id,
        category: selectedCard.category,
        subcategory: selectedCard.subcategory,
        prompt: selectedCard.prompt,
        timer_seconds: selectedCard.timer_seconds,
        timer_category: selectedCard.timer_category,
        difficulty_level: selectedCard.difficulty_level,
        intimacy_level: selectedCard.intimacy_level,
        requires_action: selectedCard.requires_action,
        requires_physical_presence: selectedCard.requires_physical_presence,
        mood_tags: selectedCard.mood_tags,
        relationship_stage: selectedCard.relationship_stage,
        usage_count: selectedCard.usage_count,
        response_type: selectedCard.response_type
      } as CardData;

    } catch (error) {
      console.error('Error in drawNextCard:', error);
      return null;
    }
  }

  async createShuffledDeck(sessionId: string, deckSize: number = 60): Promise<boolean> {
    try {
      console.log('🎯 Creating shuffled deck with smart distribution:', { sessionId, deckSize });
      
      // Use database function for smart deck creation with 34/33/33 distribution
      const { error } = await supabase
        .rpc('create_shuffled_deck', {
          p_session_id: sessionId,
          p_deck_size: deckSize
        });

      if (error) {
        console.error('Failed to create shuffled deck:', error);
        return false;
      }

      console.log('✅ Shuffled deck created successfully with smart distribution');
      return true;

    } catch (error) {
      console.error('Error in createShuffledDeck:', error);
      return false;
    }
  }

  async skipCard(sessionId: string): Promise<boolean> {
    try {
      // Get current session
      const { data: session, error: sessionError } = await supabase
        .from('card_deck_game_sessions')
        .select('current_card_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session || !session.current_card_id) {
        console.error('Failed to fetch session or no current card:', sessionError);
        return false;
      }

      // Mark card as skipped in game_decks table
      const { error: updateError } = await supabase
        .from('game_decks')
        .update({
          skipped: true,
          played_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('card_id', session.current_card_id);

      if (updateError) {
        console.error('Failed to mark card as skipped:', updateError);
        return false;
      }

      console.log('✅ Card skipped successfully in shuffled deck');
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
        .select('total_cards_played, deck_size')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        return {
          totalCardsPlayed: 0,
          cardsSkipped: 0,
          cardsRemaining: 0
        };
      }

      // Get deck statistics from game_decks table
      const { data: deckStats } = await supabase
        .from('game_decks')
        .select('is_played, skipped')
        .eq('session_id', sessionId);

      if (!deckStats) {
        return {
          totalCardsPlayed: session.total_cards_played || 0,
          cardsSkipped: 0,
          cardsRemaining: session.deck_size || 60
        };
      }

      const playedCards = deckStats.filter(card => card.is_played).length;
      const skippedCards = deckStats.filter(card => card.skipped).length;
      const totalDeckSize = session.deck_size || 60;
      const usedCards = playedCards + skippedCards;
      
      return {
        totalCardsPlayed: session.total_cards_played || 0,
        cardsSkipped: skippedCards,
        cardsRemaining: Math.max(0, totalDeckSize - usedCards)
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