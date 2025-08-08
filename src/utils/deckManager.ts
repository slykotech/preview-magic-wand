import { supabase } from "@/integrations/supabase/client";

export class DeckManager {
  private readonly DECK_SIZE = 60;
  private readonly DISTRIBUTION = {
    action: 0.34,  // 34% = 20 cards
    text: 0.33,    // 33% = 20 cards
    photo: 0.33    // 33% = 20 cards
  };

  async createShuffledDeck(sessionId: string): Promise<number> {
    try {
      console.log('🃏 Creating shuffled deck for session:', sessionId);
      
      // Use the database function to create the deck
      const { data, error } = await supabase.rpc('create_shuffled_deck', {
        p_session_id: sessionId,
        p_deck_size: this.DECK_SIZE
      });

      if (error) {
        console.error('❌ Failed to create deck:', error);
        throw error;
      }

      const deckSize = data || 0;
      console.log(`✅ Created deck with ${deckSize} cards`);
      
      // Get distribution for logging
      const stats = await this.getDeckStats(sessionId);
      console.log('📊 Deck distribution:', stats?.distribution);
      
      return deckSize;

    } catch (error) {
      console.error('❌ Failed to create deck:', error);
      throw error;
    }
  }

  async drawNextCard(sessionId: string): Promise<any> {
    try {
      // Get current card index
      const { data: session } = await supabase
        .from('card_deck_game_sessions')
        .select('current_card_index')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      const nextIndex = (session.current_card_index || -1) + 1;

      // Get card at this position
      const { data: deckEntry, error } = await supabase
        .from('game_decks')
        .select(`
          position,
          card_id,
          deck_cards (*)
        `)
        .eq('session_id', sessionId)
        .eq('position', nextIndex)
        .single();

      if (error || !deckEntry) {
        console.log('🏁 No more cards in deck');
        return null;
      }

      // Mark as played and update session
      await Promise.all([
        supabase
          .from('game_decks')
          .update({ 
            is_played: true,
            played_at: new Date().toISOString()
          })
          .eq('session_id', sessionId)
          .eq('position', nextIndex),
          
        supabase
          .from('card_deck_game_sessions')
          .update({
            current_card_index: nextIndex,
            current_card_id: deckEntry.card_id,
            cards_played: nextIndex + 1,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', sessionId)
      ]);

      console.log(`🎴 Drew card #${nextIndex + 1}: ${deckEntry.deck_cards.response_type}`);
      return deckEntry.deck_cards;

    } catch (error) {
      console.error('Failed to draw card:', error);
      throw error;
    }
  }

  async skipCard(sessionId: string): Promise<boolean> {
    try {
      const { data: session } = await supabase
        .from('card_deck_game_sessions')
        .select('current_card_index')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      const currentIndex = session.current_card_index;
      if (currentIndex === null || currentIndex < 0) return false;

      // Mark current card as skipped
      await supabase
        .from('game_decks')
        .update({ 
          skipped: true,
          played_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('position', currentIndex);

      console.log(`⏭️ Skipped card at position ${currentIndex}`);
      return true;

    } catch (error) {
      console.error('Failed to skip card:', error);
      return false;
    }
  }

  async getDeckStats(sessionId: string) {
    const { data } = await supabase
      .from('game_decks')
      .select(`
        position,
        is_played,
        skipped,
        deck_cards (
          response_type,
          category
        )
      `)
      .eq('session_id', sessionId)
      .order('position');

    if (!data) return null;

    const stats = {
      total: data.length,
      played: data.filter(c => c.is_played).length,
      skipped: data.filter(c => c.skipped).length,
      remaining: data.filter(c => !c.is_played).length,
      distribution: {
        played: {
          action: data.filter(c => c.is_played && c.deck_cards?.response_type === 'action').length,
          text: data.filter(c => c.is_played && c.deck_cards?.response_type === 'text').length,
          photo: data.filter(c => c.is_played && c.deck_cards?.response_type === 'photo').length
        },
        remaining: {
          action: data.filter(c => !c.is_played && c.deck_cards?.response_type === 'action').length,
          text: data.filter(c => !c.is_played && c.deck_cards?.response_type === 'text').length,
          photo: data.filter(c => !c.is_played && c.deck_cards?.response_type === 'photo').length
        }
      },
      nextCards: data
        .filter(c => !c.is_played)
        .slice(0, 5)
        .map(c => c.deck_cards?.response_type)
    };

    return stats;
  }

  async checkDeckExists(sessionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('game_decks')
      .select('id')
      .eq('session_id', sessionId)
      .limit(1);

    return !error && data && data.length > 0;
  }

  async getCurrentCard(sessionId: string) {
    const { data: session } = await supabase
      .from('card_deck_game_sessions')
      .select('current_card_index, current_card_id')
      .eq('id', sessionId)
      .single();

    if (!session || session.current_card_index === null || session.current_card_index < 0) {
      return null;
    }

    if (session.current_card_id) {
      const { data: card } = await supabase
        .from('deck_cards')
        .select('*')
        .eq('id', session.current_card_id)
        .single();
      
      return card;
    }

    return null;
  }

  async getCardHistory(sessionId: string) {
    const { data } = await supabase
      .from('game_decks')
      .select(`
        position,
        is_played,
        skipped,
        played_at,
        deck_cards (
          prompt,
          response_type,
          category,
          timer_seconds
        )
      `)
      .eq('session_id', sessionId)
      .eq('is_played', true)
      .order('position');

    return data || [];
  }
}