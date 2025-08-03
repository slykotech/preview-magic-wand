import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CoupleAvatars } from "@/components/CoupleAvatars";
import { SyncScoreCircle } from "@/components/SyncScoreCircle";
import { DashboardCard } from "@/components/DashboardCard";
import { BottomNavigation } from "@/components/BottomNavigation";
import { StreakDisplay } from "@/components/StreakDisplay";
import { CoupleMoodDisplay } from "@/components/CoupleMoodDisplay";
import { MoodCheckin } from "@/components/MoodCheckin";
import { DailyCheckinFlow } from "@/components/DailyCheckinFlow";
import { StoryViewer } from "@/components/StoryViewer";
import { useEnhancedSyncScore } from "@/hooks/useEnhancedSyncScore";
import { usePresence } from "@/hooks/usePresence";
import { useCardGames } from "@/hooks/useCardGames";
import { SyncScoreSkeleton, DashboardCardSkeleton, CompactCardSkeleton, MoodDisplaySkeleton } from "@/components/ui/skeleton";
import { Calendar, Heart, MessageCircle, Sparkles, Clock, Lightbulb, X, Activity, Gamepad2, Play, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const getTimeBasedMessage = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return "Sunshine's here time to make your love bloom ☀️🌸";
  } else if (hour >= 12 && hour < 17) {
    return "Love doesn't take lunch breaks. Let's reconnect 🫶";
  } else {
    return "Evenings are made for cuddles, calm, and connection 🌙💖";
  }
};

export const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on fresh app load, not on tab switches
    const hasShownSplash = sessionStorage.getItem('hasShownSplash');
    return !hasShownSplash;
  });
  const [showDailyCheckin, setShowDailyCheckin] = useState(false);
  const [showMoodCheckin, setShowMoodCheckin] = useState(false);
  const [upcomingDate, setUpcomingDate] = useState<any>(null);
  const [scheduledDatesCount, setScheduledDatesCount] = useState(0);
  const [lastCheckin, setLastCheckin] = useState<any>(null);
  const [recentMemory, setRecentMemory] = useState<any>(null);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [storyStreak, setStoryStreak] = useState(0);
  const [userMood, setUserMood] = useState<string>();
  const [partnerMood, setPartnerMood] = useState<string>();
  const [coupleId, setCoupleId] = useState<string>();
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyTargetUserId, setStoryTargetUserId] = useState<string>();
  const [isOwnStory, setIsOwnStory] = useState(false);
  const [hasUserStory, setHasUserStory] = useState(false);
  const [hasPartnerStory, setHasPartnerStory] = useState(false);
  const [partnerId, setPartnerId] = useState<string>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showHealthTips, setShowHealthTips] = useState(false);
  const [showCheckinInsights, setShowCheckinInsights] = useState(false);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const {
    user,
    loading
  } = useAuth();

  // Use enhanced sync score hook
  const {
    syncScoreData,
    loading: syncScoreLoading,
    logActivity,
    refreshSyncScore
  } = useEnhancedSyncScore(coupleId);

  // Ensure we have a safe score value
  const currentSyncScore = syncScoreData?.score ?? 0;

  // Use presence tracking hook
  const {
    isUserOnline,
    isPartnerOnline
  } = usePresence(coupleId);
  
  // Use card games hook
  const { activeSessions, recentAchievements, loading: gamesLoading, createGameSession } = useCardGames();
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchDashboardData();
    }
  }, [user, loading, navigate]);

  // Listen for mood updates when returning to dashboard (debounced)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fetchDashboardData(), 100);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [user]);

  // Date change detection for auto-refresh
  useEffect(() => {
    if (!user) return;
    const checkDateChange = () => {
      const currentDate = new Date().toDateString();
      const lastKnownDate = localStorage.getItem('lastDashboardDate');
      if (lastKnownDate && lastKnownDate !== currentDate) {
        console.log('Date changed detected, refreshing dashboard...');
        // Clear date-related cached data
        localStorage.removeItem('mood_updated');
        localStorage.removeItem('checkin_completed');
        // Refresh dashboard data
        fetchDashboardData();
      }

      // Update the stored date
      localStorage.setItem('lastDashboardDate', currentDate);
    };

    // Check immediately
    checkDateChange();

    // Set up interval to check every minute for date changes
    const interval = setInterval(checkDateChange, 60000);
    return () => clearInterval(interval);
  }, [user]);
  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data for user:', user?.id);

      // First, get user's couple relationship - get the most recent one
      const {
        data: coupleDataArray
      } = await supabase.from('couples').select('id, user1_id, user2_id').or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`).order('created_at', {
        ascending: false
      });

      // Filter out self-pairing and get the first valid couple
      const coupleData = coupleDataArray?.find(couple => couple.user1_id !== couple.user2_id) || coupleDataArray?.[0];
      console.log('Couple data fetched:', coupleData);
      const currentCoupleId = coupleData?.id;
      setCoupleId(currentCoupleId);

      // If no couple relationship exists, show setup message
      if (!currentCoupleId) {
        setUpcomingDate(null);
        setRecentMemory(null);
        setLastCheckin(null);
        setCheckinStreak(0);
        setStoryStreak(0);
        setUserMood(undefined);
        setPartnerMood(undefined);
        setIsLoaded(true);
        return;
      }
      const currentPartnerId = coupleData?.user1_id === user?.id ? coupleData?.user2_id : coupleData?.user1_id;
      setPartnerId(currentPartnerId);

      // Handle case where user is paired with themselves (testing scenario)
      const isTestingWithSelf = currentPartnerId === user?.id;

      // Note: Sync score calculation is now handled by useEnhancedSyncScore hook

      // Fetch upcoming scheduled date (only dates that have been scheduled but haven't passed yet)
      const today = new Date().toISOString().split('T')[0];
      const {
        data: dateData
      } = await supabase.from('date_ideas').select('*').eq('couple_id', currentCoupleId).eq('is_completed', true) // Only scheduled dates
      .gte('completed_date', today) // Future or today's dates only
      .not('notes', 'is', null) // Must have scheduling notes
      .ilike('notes', '%scheduled%') // Contains "scheduled" in notes
      .order('completed_date', {
        ascending: true
      }).limit(1).maybeSingle();

      // Count all scheduled dates for the "Upcoming dates" card
      const {
        count: scheduledCount
      } = await supabase.from('date_ideas').select('*', {
        count: 'exact',
        head: true
      }).eq('couple_id', currentCoupleId).eq('is_completed', true) // Only scheduled dates
      .gte('completed_date', today) // Future or today's dates only
      .not('notes', 'is', null) // Must have scheduling notes
      .ilike('notes', '%scheduled%'); // Contains "scheduled" in notes

      // Fetch recent memory
      const {
        data: memoryData
      } = await supabase.from('memories').select('*').eq('couple_id', currentCoupleId).order('created_at', {
        ascending: false
      }).limit(1).maybeSingle();

      // Fetch last checkin for current user
      const {
        data: checkinData
      } = await supabase.from('daily_checkins').select('*').eq('user_id', user?.id).eq('couple_id', currentCoupleId).order('checkin_date', {
        ascending: false
      }).limit(1).maybeSingle();

      // Calculate checkin streak
      const {
        data: allCheckins
      } = await supabase.from('daily_checkins').select('checkin_date, user_id').eq('couple_id', currentCoupleId).order('checkin_date', {
        ascending: false
      });
      let streak = 0;
      if (allCheckins && allCheckins.length > 0) {
        const todayStr = new Date().toDateString();
        let currentDate = new Date();

        // Group checkins by date
        const checkinsByDate = allCheckins.reduce((acc, checkin) => {
          const date = new Date(checkin.checkin_date).toDateString();
          if (!acc[date]) acc[date] = [];
          acc[date].push(checkin.user_id);
          return acc;
        }, {} as Record<string, string[]>);

        // Calculate consecutive days where both partners checked in
        while (true) {
          const dateStr = currentDate.toDateString();
          const dayCheckins = checkinsByDate[dateStr];
          if (dayCheckins && dayCheckins.length === 2) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // Get today's moods
      const todayForMood = new Date().toISOString().split('T')[0];
      const {
        data: userMoodData
      } = await supabase.from('daily_checkins').select('mood').eq('user_id', user?.id).eq('couple_id', currentCoupleId).eq('checkin_date', todayForMood).maybeSingle();
      const {
        data: partnerMoodData
      } = await supabase.from('daily_checkins').select('mood').eq('user_id', currentPartnerId).eq('couple_id', currentCoupleId).eq('checkin_date', todayForMood).maybeSingle();

      // Check for active stories
      await checkForStories(currentCoupleId, user?.id, currentPartnerId);
      console.log('User mood data:', {
        userId: user?.id,
        mood: userMoodData?.mood
      });
      console.log('Partner mood data:', {
        partnerId,
        mood: partnerMoodData?.mood
      });
      console.log('Is testing with self:', isTestingWithSelf);

      // Generate insights based on activity
      if (currentCoupleId) {
        await supabase.rpc('generate_relationship_insights', {
          p_couple_id: currentCoupleId
        });
      }
      setUpcomingDate(dateData);
      setScheduledDatesCount(scheduledCount || 0);
      setRecentMemory(memoryData);
      setLastCheckin(checkinData);
      setCheckinStreak(streak);
      setStoryStreak(streak); // For now, story streak = checkin streak
      setUserMood(userMoodData?.mood);

      // If testing with self, don't show partner mood as the same
      if (isTestingWithSelf) {
        setPartnerMood(undefined); // Show no partner mood for testing
      } else {
        setPartnerMood(partnerMoodData?.mood);
      }
      setIsLoaded(true);

      // Hide splash after data loads and animation completes (only if showing)
      if (showSplash) {
        setTimeout(() => {
          setShowSplash(false);
          sessionStorage.setItem('hasShownSplash', 'true');
        }, 2000);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsLoaded(true);
      // Hide splash even on error to prevent infinite loading (only if showing)
      if (showSplash) {
        setTimeout(() => {
          setShowSplash(false);
          sessionStorage.setItem('hasShownSplash', 'true');
        }, 1000);
      }
    }
  };

  // Fetch unread message count
  const fetchUnreadCount = async () => {
    if (!coupleId || !user?.id) return;
    try {
      // Get conversation for this couple
      const {
        data: conversation
      } = await supabase.from('conversations').select('id').eq('couple_id', coupleId).maybeSingle();
      if (!conversation) return;

      // Count unread messages
      const {
        count
      } = await supabase.from('messages').select('*', {
        count: 'exact',
        head: true
      }).eq('conversation_id', conversation.id).eq('is_read', false).neq('sender_id', user.id);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Update unread count when coupleId or user changes
  useEffect(() => {
    fetchUnreadCount();
  }, [coupleId, user?.id]);

  // Set up real-time subscription for unread messages
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase.channel('dashboard-messages').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages'
    }, () => {
      fetchUnreadCount();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  // Refresh data when navigating back from other pages
  const refreshDashboard = () => {
    if (user) {
      fetchDashboardData();
    }
  };

  // Add listener for storage events to detect mood updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mood_updated') {
        refreshDashboard();
        localStorage.removeItem('mood_updated');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);
  const handleCheckinClick = () => {
    console.log('Checkin clicked!', {
      coupleId,
      user: user?.id
    });
    if (coupleId) {
      console.log('Opening daily check-in flow');
      setShowDailyCheckin(true);
    } else {
      console.log('No couple ID found, showing setup message');
      toast({
        title: "Setup Required",
        description: "Please complete your couple setup first",
        variant: "destructive"
      });
    }
  };
  const handleMoodCheckinClick = () => {
    if (coupleId) {
      setShowMoodCheckin(true);
    } else {
      toast({
        title: "Setup Required",
        description: "Please complete your couple setup first",
        variant: "destructive"
      });
    }
  };
  const handlePlanDateClick = () => {
    navigate('/planner?tab=upcoming');
    toast({
      title: "Time to plan something special! ✨",
      description: "Let's find the perfect date idea for you two"
    });
  };

  // Story functionality
  const checkForStories = async (coupleId: string, userId: string, partnerId?: string) => {
    try {
      const now = new Date().toISOString();

      // Check for user's active stories
      const {
        data: userStories
      } = await supabase.from('stories').select('id').eq('couple_id', coupleId).eq('user_id', userId).gt('expires_at', now);
      setHasUserStory((userStories?.length || 0) > 0);

      // Check for partner's active stories
      if (partnerId && partnerId !== userId) {
        const {
          data: partnerStories
        } = await supabase.from('stories').select('id').eq('couple_id', coupleId).eq('user_id', partnerId).gt('expires_at', now);
        setHasPartnerStory((partnerStories?.length || 0) > 0);
      } else {
        setHasPartnerStory(false);
      }
    } catch (error) {
      console.error('Error checking for stories:', error);
    }
  };

  // Only handle story viewing if story exists
  const handleUserAvatarClick = () => {
    if (user?.id && coupleId && hasUserStory) {
      setStoryTargetUserId(user.id);
      setIsOwnStory(true);
      setShowUploadInterface(false); // Explicitly set to false for avatar clicks
      setShowStoryViewer(true);
    }
  };
  const handlePartnerAvatarClick = () => {
    if (partnerId && coupleId && partnerId !== user?.id && hasPartnerStory) {
      setStoryTargetUserId(partnerId);
      setIsOwnStory(false);
      setShowUploadInterface(false); // Explicitly set to false for avatar clicks
      setShowStoryViewer(true);
    }
  };

  // Separate camera handler for uploading new stories
  const [showUploadInterface, setShowUploadInterface] = useState(false);
  const handleCameraClick = () => {
    if (user?.id && coupleId) {
      setStoryTargetUserId(user.id);
      setIsOwnStory(true);
      setShowUploadInterface(true); // Set flag to show upload interface
      setShowStoryViewer(true);
    }
  };
  const handleStoryViewerClose = () => {
    setShowStoryViewer(false);
    setStoryTargetUserId(undefined);
    setIsOwnStory(false);
    setShowUploadInterface(false); // Reset upload interface flag
    // Refresh story status after closing
    if (coupleId && user?.id) {
      checkForStories(coupleId, user.id, partnerId);
    }
  };

  // Game handlers
  const handleStartGame = async (gameId: string) => {
    try {
      const session = await createGameSession(gameId);
      navigate(`/games/${session.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive"
      });
    }
  };
  return <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Splash Screen Overlay with Sync Score Animation */}
      {showSplash && isLoaded && <div className="fixed inset-0 bg-gradient-primary z-[100]" style={{
      animation: 'fade-out 0.3s ease-out 1.7s forwards'
    }}>
          
          {/* Sync Score - starts center, zooms to exact dashboard position */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="sync-score-container" style={{
          animation: 'zoom-to-position 1.2s ease-out 0.8s forwards',
          transform: 'scale(2.5)'
        }}>
              <SyncScoreCircle score={currentSyncScore} animated={true} />
            </div>
          </div>
          
          {/* Floating Partner Mood Emojis */}
          {partnerMood && <div className="absolute inset-0 pointer-events-none">
              {/* Multiple floating emojis */}
              {[...Array(5)].map((_, i) => <div key={i} className="absolute text-6xl opacity-90" style={{
          left: `${20 + i * 15}%`,
          top: `${30 + i % 2 * 40}%`,
          animation: `float-${i + 1} 2s ease-in-out infinite, fade-in 0.3s ease-out ${0.5 + i * 0.1}s both, fade-out 0.5s ease-out 1.3s forwards`
        }}>
                  {partnerMood}
                </div>)}
              
              {/* Partner mood text */}
              <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 text-center" style={{
          animation: 'fade-in 0.3s ease-out 0.8s both, fade-out 0.5s ease-out 1.3s forwards'
        }}>
                <p className="text-white/90 text-lg font-medium">
                  Partner's Mood
                </p>
              </div>
            </div>}
          
          {/* Welcome text */}
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-center" style={{
        animation: 'fade-in 0.3s ease-out 1s both, fade-out 0.3s ease-out 1.5s forwards'
      }}>
          </div>
        </div>}
      
      {/* Main Content - with loading states */}
      <div className={showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
        {/* Header with gradient background */}
        <div className="bg-gradient-primary py-12 px-6 -mx-6 -mt-8 mb-8 rounded-b-[4rem] relative overflow-hidden before:absolute before:bottom-0 before:left-0 before:right-0 before:h-12 before:bg-gradient-primary before:rounded-b-[5rem] before:-z-10 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-6 after:bg-gradient-primary after:rounded-b-[6rem] after:-z-20">
          <div className={`text-center space-y-2 ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
            
            <p className="text-lg font-bold text-white/90">{getTimeBasedMessage()}</p>
          </div>
        </div>
        
        <div className="container mx-auto px-6 space-y-6 pb-20">

          {/* Sync Score Section */}
          <div className={`${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{
          animationDelay: '100ms'
        }}>
            {isLoaded ? <div className="space-y-4">
                <SyncScoreCircle score={currentSyncScore} animated={true} />
              </div> : <SyncScoreSkeleton />}
          </div>

        {/* Couple Avatars with Good Sync Status */}
        <div className={`${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{
          animationDelay: '200ms'
        }}>
          {isLoaded ? <CoupleAvatars syncScore={currentSyncScore} animated={true} onUserAvatarClick={handleUserAvatarClick} onPartnerAvatarClick={handlePartnerAvatarClick} onCameraClick={handleCameraClick} hasUserStory={hasUserStory} hasPartnerStory={hasPartnerStory} isUserOnline={isUserOnline} isPartnerOnline={isPartnerOnline} /> : <div className="flex justify-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted animate-pulse rounded-full"></div>
                <div className="w-8 h-8 bg-accent animate-pulse rounded-full"></div>
                <div className="w-16 h-16 bg-muted animate-pulse rounded-full"></div>
              </div>
            </div>}
        </div>

        <div className={`${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{
          animationDelay: '300ms'
        }}>
          {isLoaded ? <CoupleMoodDisplay userMood={userMood} partnerMood={partnerMood} userId={user?.id} coupleId={coupleId} onMoodUpdate={refreshDashboard} /> : <MoodDisplaySkeleton />}
        </div>

        {/* Compact Dashboard Cards */}
        <div className={`grid grid-cols-2 gap-3 ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{
          animationDelay: '400ms'
        }}>
          {isLoaded ? <>
              {/* Last Check-in Card - Compact */}
              <div className="bg-card border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-105 duration-200" onClick={() => setShowCheckinInsights(true)}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <Heart className="text-white" size={16} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground">Last Check-in</p>
                    <p className="text-xs font-medium">
                      {lastCheckin ? format(new Date(lastCheckin.checkin_date), 'd MMMM') : '28 July'}
                    </p>
                    {lastCheckin && <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Mood: <span className="text-foreground font-medium capitalize">{lastCheckin.mood}</span>
                        </p>
                        {lastCheckin.energy_level && <p className="text-xs text-muted-foreground">
                            Energy: <span className="text-foreground font-medium">{lastCheckin.energy_level}/10</span>
                          </p>}
                        {lastCheckin.relationship_feeling && <p className="text-xs text-muted-foreground">
                            Feeling: <span className="text-foreground font-medium">{lastCheckin.relationship_feeling}</span>
                          </p>}
                      </div>}
                  </div>
                </div>
                
              </div>

              {/* Relationship Health Card - Dynamic */}
              <div className="bg-card border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-105 duration-200" onClick={() => setShowHealthTips(true)}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <Activity className="text-white" size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Relationship Health</p>
                    <div className="flex items-center gap-1">
                      <p className="text-lg font-bold text-secondary">{currentSyncScore}%</p>
                      <span className={`text-xs ${syncScoreData?.trend === 'up' ? 'text-accent' : syncScoreData?.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {syncScoreData?.trend === 'up' ? '↗' : syncScoreData?.trend === 'down' ? '↘' : '→'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentSyncScore >= 80 ? 'Thriving together' : currentSyncScore >= 60 ? 'Growing stronger' : currentSyncScore >= 40 ? 'Building connection' : 'Starting your journey'}
                </p>
              </div>
            </> : <>
              <CompactCardSkeleton />
              <CompactCardSkeleton />
            </>}
        </div>

        {/* Enhanced Streak Display */}
        <div className={`${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{
          animationDelay: '500ms'
        }}>
          {isLoaded ? <StreakDisplay checkinStreak={syncScoreData?.streaks?.checkinStreak || checkinStreak} storyStreak={syncScoreData?.streaks?.storyStreak || storyStreak} /> : <div className="animate-pulse bg-muted rounded-xl h-32"></div>}
        </div>

        {/* Action Cards Grid */}
        <div className={`grid grid-cols-2 gap-4 ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{
          animationDelay: '600ms'
        }}>
          {isLoaded ? <>
              {/* Daily Check-in */}
              <div className="bg-card border rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition-all shadow-sm hover:scale-105 duration-200" onClick={handleCheckinClick}>
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="text-white" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Daily Check-in</h3>
                <p className="text-xs text-muted-foreground">Keep the streak!</p>
              </div>

              {/* Weekly Planning */}
              <div className="bg-card border rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition-all shadow-sm hover:scale-105 duration-200" onClick={() => navigate('/planner')}>
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="text-accent-foreground" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Dates Planned</h3>
                <p className="text-xs text-muted-foreground">
                  {scheduledDatesCount > 0 ? `${scheduledDatesCount} dates scheduled` : 'No dates scheduled'}
                </p>
              </div>

              {/* Plan Date */}
              <div className="bg-card border rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition-all shadow-sm hover:scale-105 duration-200" onClick={handlePlanDateClick}>
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="text-white" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Plan Date</h3>
                <p className="text-xs text-muted-foreground">Create memories</p>
              </div>

              {/* Add Memory */}
              <div className="bg-card border rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition-all shadow-sm hover:scale-105 duration-200" onClick={() => navigate('/vault')}>
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="text-accent-foreground" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Add Memory</h3>
                <p className="text-xs text-muted-foreground">Capture the moment</p>
              </div>
            </> : <>
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
            </>}
        </div>

        {/* Get Relationship Insights Button */}
        <div className={`${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{
          animationDelay: '700ms'
        }}>
          {isLoaded ? <Button className="w-full rounded-xl py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-medium transition-all hover:scale-[1.02] duration-200" onClick={() => navigate('/coach')}>
              <Sparkles className="mr-2" size={18} />
              Get Relationship Insights
            </Button> : <div className="w-full h-12 bg-muted animate-pulse rounded-xl"></div>}
        </div>
        </div>
      </div>

      {/* Daily Check-in Flow Modal */}
      {showDailyCheckin && coupleId && user && <DailyCheckinFlow userId={user.id} coupleId={coupleId} currentStreak={checkinStreak} onComplete={() => {
      setShowDailyCheckin(false);
      refreshDashboard();
    }} onClose={() => setShowDailyCheckin(false)} />}

      {/* Mood Check Modal */}
      {showMoodCheckin && coupleId && user && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <MoodCheckin userId={user.id} coupleId={coupleId} currentMood={userMood} onMoodUpdate={mood => {
          setUserMood(mood);
          setShowMoodCheckin(false);
          refreshDashboard();
        }} />
            <div className="mt-4 text-center">
              <button onClick={() => setShowMoodCheckin(false)} className="text-white hover:text-gray-300 text-sm">
                Close
              </button>
            </div>
          </div>
        </div>}

      {/* Story Viewer Modal */}
      {showStoryViewer && storyTargetUserId && coupleId && <StoryViewer isOpen={showStoryViewer} onClose={handleStoryViewerClose} targetUserId={storyTargetUserId} coupleId={coupleId} isOwnStory={isOwnStory} showUploadInterface={showUploadInterface} />}

      {/* Floating Messages Button */}
      {!showSplash && coupleId && <div className="fixed bottom-20 right-4 z-40">
          <Button onClick={() => navigate('/messages')} size="icon" className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg relative">
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>}
          </Button>
        </div>}


      {/* Relationship Health Tips Modal */}
      <Dialog open={showHealthTips} onOpenChange={setShowHealthTips}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Relationship Enhancement Tips
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary mb-1">{currentSyncScore}%</div>
              <div className="text-sm text-muted-foreground">
                {currentSyncScore >= 80 ? 'Your relationship is thriving! 🌟' : currentSyncScore >= 60 ? 'You\'re growing stronger together! 💪' : currentSyncScore >= 40 ? 'Building a solid foundation! 🏗️' : 'Every journey starts with a single step! 🌱'}
              </div>
            </div>
            
            <div className="space-y-3">
              {currentSyncScore < 40 && <>
                  <div className="p-3 bg-card border rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Daily Connection
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Start with daily check-ins. Share how you're feeling and ask about your partner's day. Small daily connections build strong foundations.
                    </p>
                  </div>
                  <div className="p-3 bg-card border rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                      Open Communication
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Practice active listening. Put devices away during conversations and show genuine interest in what your partner shares.
                    </p>
                  </div>
                </>}
              
              {currentSyncScore >= 40 && currentSyncScore < 60 && <>
                  <div className="p-3 bg-card border rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-500" />
                      Quality Time
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Schedule regular date nights. Try new activities together to create shared memories and strengthen your bond.
                    </p>
                  </div>
                  <div className="p-3 bg-card border rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Appreciation
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Express gratitude daily. Notice the small things your partner does and acknowledge them verbally.
                    </p>
                  </div>
                </>}
              
              {currentSyncScore >= 60 && currentSyncScore < 80 && <>
                  <div className="p-3 bg-card border rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500" />
                      Deeper Intimacy
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Share your dreams, fears, and aspirations. Create space for vulnerable conversations that deepen emotional intimacy.
                    </p>
                  </div>
                  <div className="p-3 bg-card border rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Growth Together
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Set relationship goals together. Discuss what you both want to achieve as a couple and support each other's individual growth.
                    </p>
                  </div>
                </>}
              
              {currentSyncScore >= 80 && <>
                  <div className="p-3 bg-card border rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-gold-500" />
                      Maintain Excellence
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Keep nurturing what works! Continue your daily rituals and don't take your strong connection for granted.
                    </p>
                  </div>
                  <div className="p-3 bg-card border rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Inspire Others
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Your relationship is thriving! Consider mentoring other couples or sharing what's worked for you.
                    </p>
                  </div>
                </>}
            </div>
            
            <div className="pt-4 border-t">
              <Button className="w-full" onClick={() => setShowHealthTips(false)}>
                Start Improving Today!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check-in Insights Modal */}
      <Dialog open={showCheckinInsights} onOpenChange={setShowCheckinInsights}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Your Last Check-in
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-gradient-to-r from-secondary/10 to-primary/10 rounded-lg">
              <div className="text-lg font-bold text-secondary mb-1">
                {lastCheckin ? format(new Date(lastCheckin.checkin_date), 'd MMMM') : 'No recent check-in'}
              </div>
              <div className="text-sm text-muted-foreground">
                {lastCheckin ? 'Your responses from your last check-in' : 'Start your check-in journey today!'}
              </div>
              {checkinStreak > 0 && <div className="text-lg font-bold text-accent mt-2">
                  🔥 {checkinStreak} day streak!
                </div>}
            </div>
            
            {lastCheckin ? <div className="space-y-3">
                

                {lastCheckin.energy_level && <div className="p-3 bg-card rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">What's your energy level?</h4>
                    <p className="text-sm text-foreground">{lastCheckin.energy_level}/10</p>
                  </div>}

                {lastCheckin.relationship_feeling && <div className="p-3 bg-card rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">How are you feeling about your relationship?</h4>
                    <p className="text-sm text-foreground">{lastCheckin.relationship_feeling}</p>
                  </div>}

                {lastCheckin.gratitude && <div className="p-3 bg-card rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">What are you grateful for today?</h4>
                    <p className="text-sm text-foreground">{lastCheckin.gratitude}</p>
                  </div>}

                {lastCheckin.notes && <div className="p-3 bg-card rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Additional notes</h4>
                    <p className="text-sm text-foreground">{lastCheckin.notes}</p>
                  </div>}

                
              </div> : <div className="text-center p-4">
                <p className="text-sm text-muted-foreground">No check-in data available. Complete your first daily check-in to see your responses here!</p>
              </div>}
            
            <div className="pt-4 border-t space-y-2">
              <Button className="w-full" onClick={() => {
              setShowCheckinInsights(false);
              handleCheckinClick();
            }}>
                Start Today's Check-in
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setShowCheckinInsights(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Relationship Games Section */}
      {!showSplash && (
        <div className="px-4 pb-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Relationship Games
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Identity & Dreams Canvas */}
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg mb-2 text-purple-900 dark:text-purple-100">
                    Identity & Dreams Canvas
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-4 leading-relaxed">
                    Explore authentic selves, professional goals, and build deeper understanding through inclusive conversations.
                  </p>
                  <Button 
                    onClick={() => handleStartGame('identity-dreams')}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white border-0"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Playing
                  </Button>
                </div>
              </div>
            </Card>

            {/* Love Language Laboratory */}
            <Card className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 border-pink-200 dark:border-pink-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex-shrink-0">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg mb-2 text-pink-900 dark:text-pink-100">
                    Love Language Laboratory
                  </h3>
                  <p className="text-sm text-pink-700 dark:text-pink-300 mb-4 leading-relaxed">
                    Discover and practice love languages through interactive challenges and real-world experiments.
                  </p>
                  <Button 
                    onClick={() => handleStartGame('love-language')}
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Exploring
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Active Sessions & Achievements */}
          {(activeSessions.length > 0 || recentAchievements.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Active Sessions */}
              {activeSessions.length > 0 && (
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Active Sessions</h4>
                  </div>
                  <div className="space-y-2">
                    {activeSessions.slice(0, 2).map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-2 bg-white/60 dark:bg-white/10 rounded-lg">
                        <span className="text-sm font-medium">{session.card_games.name}</span>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/games/${session.id}`)}>
                          Continue
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Recent Achievements */}
              {recentAchievements.length > 0 && (
                <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-amber-600" />
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">Recent Achievements</h4>
                  </div>
                  <div className="space-y-2">
                    {recentAchievements.slice(0, 2).map((achievement) => (
                      <div key={achievement.id} className="p-2 bg-white/60 dark:bg-white/10 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🏆</span>
                          <div>
                            <p className="text-sm font-medium">{achievement.achievement_name}</p>
                            <p className="text-xs text-muted-foreground">{achievement.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation - hidden during splash */}
      {!showSplash && <BottomNavigation />}
    </div>;
};