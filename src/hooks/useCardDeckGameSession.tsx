import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCoupleData } from './useCoupleData';

interface GameCard {
  id: string;
  title: string;
  prompt: string;
  category: string;
  difficulty_level: string;
  requires_action: boolean;
  requires_voice_response: boolean;
  time_limit_seconds: number;
}

interface CardResponse {
  id: string;
  card_id: string;
  user_id: string;
  response_text?: string;
  created_at: string;
}

export const useCardDeckGameSession = (sessionId: string) => {
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const [loading, setLoading] = useState(true);
  const [currentCard, setCurrentCard] = useState<GameCard | null>(null);
  const [userResponse, setUserResponse] = useState<string>('');
  const [partnerResponse, setPartnerResponse] = useState<string>('');
  const [usedCardIds, setUsedCardIds] = useState<string[]>([]);

  // Fetch a random card that hasn't been used
  const fetchRandomCard = async () => {
    try {
      const { data, error } = await supabase
        .from('couple_cards')
        .select('*')
        .eq('is_active', true)
        .not('id', 'in', `(${usedCardIds.join(',') || 'null'})`)
        .order('RANDOM()')
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setCurrentCard(data[0]);
        setUsedCardIds(prev => [...prev, data[0].id]);
        
        // Clear previous responses
        setUserResponse('');
        setPartnerResponse('');
        
        // Fetch existing responses for this card
        await fetchCardResponses(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching random card:', error);
    }
  };

  // Fetch responses for current card
  const fetchCardResponses = async (cardId: string) => {
    if (!coupleData) return;

    try {
      const { data, error } = await supabase
        .from('card_responses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('card_id', cardId);

      if (error) throw error;

      // Separate user and partner responses
      data?.forEach(response => {
        if (response.user_id === user?.id) {
          setUserResponse(response.response_text || '');
        } else {
          setPartnerResponse(response.response_text || '');
        }
      });
    } catch (error) {
      console.error('Error fetching card responses:', error);
    }
  };

  // Submit user response
  const submitResponse = async (responseText: string) => {
    if (!currentCard || !user) return;

    try {
      const { error } = await supabase
        .from('card_responses')
        .insert({
          session_id: sessionId,
          card_id: currentCard.id,
          user_id: user.id,
          response_text: responseText
        });

      if (error) throw error;

      setUserResponse(responseText);
      
      // Update session with current card
      await supabase
        .from('game_sessions')
        .update({
          current_card_id: currentCard.id,
          total_cards_played: usedCardIds.length
        })
        .eq('id', sessionId);

    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    }
  };

  // Go to next card
  const nextCard = async () => {
    await fetchRandomCard();
  };

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      setLoading(true);
      await fetchRandomCard();
      setLoading(false);
    };

    if (sessionId && user && coupleData) {
      initializeSession();
    }
  }, [sessionId, user, coupleData]);

  // Set up real-time subscription for responses
  useEffect(() => {
    if (!sessionId || !currentCard) return;

    const subscription = supabase
      .channel(`card-responses-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'card_responses',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newResponse = payload.new as CardResponse;
          if (newResponse.card_id === currentCard.id) {
            if (newResponse.user_id === user?.id) {
              setUserResponse(newResponse.response_text || '');
            } else {
              setPartnerResponse(newResponse.response_text || '');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [sessionId, currentCard?.id, user?.id]);

  return {
    loading,
    currentCard,
    userResponse,
    partnerResponse,
    submitResponse,
    nextCard,
    hasResponded: !!userResponse,
    partnerHasResponded: !!partnerResponse,
    bothResponded: !!userResponse && !!partnerResponse
  };
};