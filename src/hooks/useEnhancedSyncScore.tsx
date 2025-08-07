import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SyncScoreBreakdown {
  checkinPoints: number;
  storyPoints: number;
  communicationPoints: number;
  milestonePoints: number;
  streakBonus: number;
  streakPenalty?: number;
}

export interface SyncScoreData {
  score: number;
  breakdown: SyncScoreBreakdown;
  streaks: {
    checkinStreak: number;
    storyStreak: number;
  };
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
}

export const useEnhancedSyncScore = (coupleId: string | null) => {
  const { user } = useAuth();
  const [syncScoreData, setSyncScoreData] = useState<SyncScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSyncScore = async () => {
    if (!coupleId || !user) {
      console.log('❌ SyncScore: Missing coupleId or user', { coupleId, user: !!user });
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 SyncScore: Fetching sync score for couple:', coupleId);
      setLoading(true);
      setError(null);

      // First try the enhanced sync score calculation
      let calculatedScore = 0; // Start from 0% base score
      
      try {
        console.log('🧮 SyncScore: Attempting enhanced calculation...');
        // Always try enhanced calculation first
        const { data: enhancedScore, error: enhancedError } = await supabase.rpc(
          'calculate_enhanced_sync_score',
          { p_couple_id: coupleId }
        );
        
        if (!enhancedError && enhancedScore !== null) {
          calculatedScore = enhancedScore;
          console.log('✅ SyncScore: Enhanced calculation successful:', calculatedScore);
        } else {
          console.log('❌ SyncScore: Enhanced sync score failed:', enhancedError);
          throw new Error('Enhanced calculation failed');
        }
      } catch (enhancedErr) {
        console.log('⚠️ SyncScore: Enhanced sync score not available, using fallback calculation');
        console.error('Enhanced error details:', enhancedErr);
        
        // Fallback to simple calculation based on recent check-ins
        const { data: recentCheckins } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('couple_id', coupleId)
          .gte('checkin_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        
        if (recentCheckins) {
          // Count days where both partners checked in
          const checkinDays = new Set(recentCheckins.map(c => c.checkin_date));
          const usersPerDay: { [key: string]: Set<string> } = {};
          
          recentCheckins.forEach(checkin => {
            if (!usersPerDay[checkin.checkin_date]) {
              usersPerDay[checkin.checkin_date] = new Set();
            }
            usersPerDay[checkin.checkin_date].add(checkin.user_id);
          });
          
          // Count days where both partners checked in (2 users per day)
          const bothCheckinDays = Object.values(usersPerDay).filter(users => users.size >= 2).length;
          
          // Base 0% + bonus for activity
          calculatedScore = Math.min(0 + (bothCheckinDays * 10), 100);
        } else {
          calculatedScore = 0; // Base score when no data
        }
        
        // Update couple's last sync score manually in fallback
        await supabase
          .from('couples')
          .update({ 
            last_sync_score: calculatedScore,
            last_activity_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', coupleId);
      }

      // Fetch detailed sync score data
      const { data: syncScoreDetails, error: detailsError } = await supabase
        .from('sync_scores')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('calculated_date', new Date().toISOString().split('T')[0])
        .single();

      if (detailsError && detailsError.code !== 'PGRST116') {
        console.error('Error fetching sync score details:', detailsError);
        setError('Failed to fetch sync score details');
        return;
      }

      // Fetch couple streaks
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('checkin_streak, story_streak, last_sync_score')
        .eq('id', coupleId)
        .single();

      if (coupleError) {
        console.error('Error fetching couple data:', coupleError);
        setError('Failed to fetch couple data');
        return;
      }

      // Fetch historical data for trend analysis
      const { data: historicalScores, error: historyError } = await supabase
        .from('historical_sync_scores')
        .select('score, calculated_date')
        .eq('couple_id', coupleId)
        .order('calculated_date', { ascending: false })
        .limit(7);

      if (historyError) {
        console.error('Error fetching historical scores:', historyError);
      }

      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (historicalScores && historicalScores.length >= 2) {
        const currentScore = historicalScores[0]?.score || calculatedScore;
        const previousScore = historicalScores[1]?.score || calculatedScore;
        if (currentScore > previousScore + 2) trend = 'up';
        else if (currentScore < previousScore - 2) trend = 'down';
      }

      const syncData: SyncScoreData = {
        score: calculatedScore,
        breakdown: {
          checkinPoints: syncScoreDetails?.checkin_points || 0,
          storyPoints: syncScoreDetails?.story_points || 0,
          communicationPoints: syncScoreDetails?.communication_points || 0,
          milestonePoints: syncScoreDetails?.milestone_points || 0,
          streakBonus: syncScoreDetails?.streak_bonus || 0,
          streakPenalty: (syncScoreDetails?.factors as any)?.streak_penalty || 0,
        },
        streaks: {
          checkinStreak: coupleData?.checkin_streak || 0,
          storyStreak: coupleData?.story_streak || 0,
        },
        lastUpdated: syncScoreDetails?.updated_at || new Date().toISOString(),
        trend,
      };

      setSyncScoreData(syncData);
    } catch (err) {
      console.error('Error in fetchSyncScore:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (
    activityType: 'checkin' | 'story' | 'message' | 'memory' | 'date_completion',
    activityData: Record<string, any> = {},
    pointsAwarded: number = 0
  ) => {
    if (!coupleId || !user) return;

    try {
      await supabase.rpc('log_couple_activity', {
        p_couple_id: coupleId,
        p_user_id: user.id,
        p_activity_type: activityType,
        p_activity_data: activityData,
        p_points_awarded: pointsAwarded,
      });

      // Refresh sync score after logging activity
      await fetchSyncScore();
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const refreshSyncScore = async () => {
    await fetchSyncScore();
  };

  useEffect(() => {
    fetchSyncScore();
  }, [coupleId, user]);

  // Listen for real-time updates to sync scores
  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel('sync-score-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_scores',
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          fetchSyncScore();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couples',
          filter: `id=eq.${coupleId}`,
        },
        () => {
          fetchSyncScore();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_checkins',
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          fetchSyncScore();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          fetchSyncScore();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  // Auto-refresh every hour to handle day changes
  useEffect(() => {
    if (!coupleId) return;

    const interval = setInterval(() => {
      const now = new Date();
      // Refresh at midnight and every hour to catch day changes
      if (now.getHours() === 0 || now.getMinutes() === 0) {
        fetchSyncScore();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [coupleId]);

  return {
    syncScoreData,
    loading,
    error,
    refreshSyncScore,
    logActivity,
  };
};