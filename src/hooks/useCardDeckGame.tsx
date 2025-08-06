import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCoupleData } from './useCoupleData';

interface CardGameSession {
  id: string;
  couple_id: string;
  game_id: string;
  session_mode: 'shuffle' | 'category';
  selected_categories: string[];
  current_card_id?: string;
  answered_cards: string[];
  current_player_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useCardDeckGame = () => {
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const [loading, setLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState<CardGameSession[]>([]);

  const createCardGameSession = async (gameType: string = 'couples_cards') => {
    if (!user || !coupleData) {
      throw new Error('User must be authenticated and in a couple');
    }

    setLoading(true);
    try {
      // Get the card game ID
      const { data: gameData, error: gameError } = await supabase
        .from('couple_card_games')
        .select('id')
        .eq('game_type', gameType)
        .eq('is_active', true)
        .single();

      if (gameError) throw gameError;

      // Create new session
      const { data: sessionData, error: sessionError } = await supabase
        .from('card_game_sessions')
        .insert({
          couple_id: coupleData.id,
          game_id: gameData.id,
          session_mode: 'shuffle',
          current_player_id: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      return sessionData;
    } catch (error) {
      console.error('Error creating card game session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    if (!coupleData) return;

    try {
      const { data, error } = await supabase
        .from('card_game_sessions')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveSessions(data || []);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  const completeSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('card_game_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      // Refresh active sessions
      fetchActiveSessions();
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (coupleData) {
      fetchActiveSessions();
    }
  }, [coupleData]);

  return {
    createCardGameSession,
    fetchActiveSessions,
    completeSession,
    activeSessions,
    loading
  };
};