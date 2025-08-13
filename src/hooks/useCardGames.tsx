import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { useEnhancedSyncScore } from '@/hooks/useEnhancedSyncScore';
import { toast } from 'sonner';

interface GameSession {
  id: string;
  couple_id: string;
  game_id: string;
  status: string;
  total_cards_played: number;
  started_at: string;
  completed_at?: string;
  card_games: {
    name: string;
    game_type: string;
  };
}

interface GameAchievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  description: string;
  icon_name: string;
  sync_score_bonus: number;
  unlocked_at: string;
}

export const useCardGames = () => {
  const [activeSessions, setActiveSessions] = useState<GameSession[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<GameAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const { logActivity } = useEnhancedSyncScore(coupleData?.id || null);

  useEffect(() => {
    if (coupleData?.id) {
      fetchActiveSessions();
      fetchRecentAchievements();
    }
  }, [coupleData?.id]);

  const fetchActiveSessions = async () => {
    if (!coupleData?.id) return;

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select(`
          *,
          card_games (name, game_type)
        `)
        .eq('couple_id', coupleData.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setActiveSessions(data || []);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  const fetchRecentAchievements = async () => {
    if (!coupleData?.id) return;

    try {
      const { data, error } = await supabase
        .from('game_achievements')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('unlocked_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGameSession = async (gameType: string) => {
    if (!user || !coupleData?.id) {
      throw new Error('User authentication or couple data required');
    }

    try {
      // First, find the actual game UUID by game_type
      const { data: gameData, error: gameError } = await supabase
        .from('card_games')
        .select('id')
        .eq('game_type', gameType)
        .eq('is_active', true)
        .single();

      if (gameError || !gameData) {
        throw new Error(`Game type "${gameType}" not found`);
      }

      // Now create the game session with the actual game UUID
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          couple_id: coupleData.id,
          game_id: gameData.id, // Use the actual UUID
          player_turn: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity for sync score
      await logActivity('message', { 
        game_session_started: true,
        game_id: gameData.id,
        game_type: gameType
      }, 5);

      // Check for first game achievement
      await checkFirstGameAchievement();

      await fetchActiveSessions();
      return data;
    } catch (error) {
      console.error('Error creating game session:', error);
      throw error;
    }
  };

  const completeGameSession = async (sessionId: string) => {
    if (!coupleData?.id) return;

    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Log completion for sync score
      await logActivity('message', { 
        game_session_completed: true,
        session_id: sessionId 
      }, 10);

      // Check for completion achievements
      await checkCompletionAchievements();

      await fetchActiveSessions();
      toast.success('Game completed! Great connection building!');
    } catch (error) {
      console.error('Error completing game session:', error);
      throw error;
    }
  };

  const submitMeaningfulResponse = async (responseId: string) => {
    if (!coupleData?.id) return;

    try {
      const { error } = await supabase
        .from('card_responses')
        .update({ meaningful_response: true })
        .eq('id', responseId);

      if (error) throw error;

      // Create achievement for meaningful conversation
      await createAchievement(
        'deep_conversation',
        'Deep Connection',
        'Shared a meaningful response that strengthened your bond',
        'heart',
        5
      );

      // Log activity for sync score
      await logActivity('memory', { 
        meaningful_game_response: true,
        response_id: responseId 
      }, 8);

      toast.success('Response saved as meaningful memory!');
    } catch (error) {
      console.error('Error marking response as meaningful:', error);
    }
  };

  const checkFirstGameAchievement = async () => {
    if (!coupleData?.id) return;

    try {
      const { data: existingAchievement } = await supabase
        .from('game_achievements')
        .select('id')
        .eq('couple_id', coupleData.id)
        .eq('achievement_type', 'first_game')
        .single();

      if (!existingAchievement) {
        await createAchievement(
          'first_game',
          'Game Night Begins',
          'Started your first relationship card game together',
          'gamepad-2',
          10
        );
      }
    } catch (error) {
      console.error('Error checking first game achievement:', error);
    }
  };

  const checkCompletionAchievements = async () => {
    if (!coupleData?.id) return;

    try {
      // Check total completed games
      const { data: completedSessions } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('couple_id', coupleData.id)
        .eq('status', 'completed');

      const completedCount = completedSessions?.length || 0;

      // Milestone achievements
      if (completedCount === 5) {
        await createAchievement(
          'game_streak',
          'Connection Builders',
          'Completed 5 relationship games together',
          'trophy',
          15
        );
      } else if (completedCount === 10) {
        await createAchievement(
          'game_streak',
          'Communication Masters',
          'Completed 10 relationship games together',
          'crown',
          25
        );
      }
    } catch (error) {
      console.error('Error checking completion achievements:', error);
    }
  };

  const createAchievement = async (
    type: string,
    name: string,
    description: string,
    icon: string,
    bonus: number
  ) => {
    if (!coupleData?.id) return;

    try {
      const { error } = await supabase
        .from('game_achievements')
        .insert({
          couple_id: coupleData.id,
          achievement_type: type,
          achievement_name: name,
          description,
          icon_name: icon,
          sync_score_bonus: bonus
        });

      if (error) throw error;

      // Log achievement for sync score
      await logActivity('checkin', { 
        achievement_unlocked: true,
        achievement_type: type,
        bonus_points: bonus
      }, bonus);

      await fetchRecentAchievements();
      toast.success(`🏆 Achievement Unlocked: ${name}!`);
    } catch (error) {
      console.error('Error creating achievement:', error);
    }
  };

  return {
    activeSessions,
    recentAchievements,
    loading,
    createGameSession,
    completeGameSession,
    submitMeaningfulResponse,
    fetchActiveSessions,
    fetchRecentAchievements
  };
};