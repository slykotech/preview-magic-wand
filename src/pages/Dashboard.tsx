import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CoupleAvatars } from "@/components/CoupleAvatars";
import { SyncScoreCircle } from "@/components/SyncScoreCircle";
import { DashboardCard } from "@/components/DashboardCard";
import { BottomNavigation } from "@/components/BottomNavigation";
import { StreakDisplay } from "@/components/StreakDisplay";
import { CoupleMoodDisplay } from "@/components/CoupleMoodDisplay";
import { MoodCheckin } from "@/components/MoodCheckin";
import { DailyCheckinFlow } from "@/components/DailyCheckinFlow";
import { Calendar, Heart, MessageCircle, Sparkles, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Dashboard = () => {
  const [syncScore, setSyncScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showDailyCheckin, setShowDailyCheckin] = useState(false);
  const [showMoodCheckin, setShowMoodCheckin] = useState(false);
  const [upcomingDate, setUpcomingDate] = useState<any>(null);
  const [lastCheckin, setLastCheckin] = useState<any>(null);
  const [recentMemory, setRecentMemory] = useState<any>(null);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [loveStreak, setLoveStreak] = useState(0);
  const [userMood, setUserMood] = useState<string>();
  const [partnerMood, setPartnerMood] = useState<string>();
  const [coupleId, setCoupleId] = useState<string>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

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

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data for user:', user?.id);
      
      // First, get user's couple relationship
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .maybeSingle();

      console.log('Couple data fetched:', coupleData);
      const currentCoupleId = coupleData?.id;
      setCoupleId(currentCoupleId);
      
      // If no couple relationship exists, show setup message
      if (!currentCoupleId) {
        setSyncScore(75);
        setUpcomingDate(null);
        setRecentMemory(null);
        setLastCheckin(null);
        setCheckinStreak(0);
        setLoveStreak(0);
        setUserMood(undefined);
        setPartnerMood(undefined);
        setIsLoaded(true);
        return;
      }
      
      const partnerId = coupleData?.user1_id === user?.id ? coupleData?.user2_id : coupleData?.user1_id;
      
      // Handle case where user is paired with themselves (testing scenario)
      const isTestingWithSelf = partnerId === user?.id;

      // Fetch or calculate sync score
      let syncScore = 75; // Default
      const { data: syncData } = await supabase
        .from('sync_scores')
        .select('score')
        .eq('couple_id', currentCoupleId)
        .order('calculated_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syncData) {
        syncScore = syncData.score;
      } else if (currentCoupleId) {
        // Calculate and store new sync score
        const { data: calculatedScore } = await supabase
          .rpc('calculate_sync_score', { p_couple_id: currentCoupleId });
        
        if (calculatedScore) {
          syncScore = calculatedScore;
          // Store the calculated score
          await supabase
            .from('sync_scores')
            .upsert({
              couple_id: currentCoupleId,
              score: syncScore,
              calculated_date: new Date().toISOString().split('T')[0]
            });
        }
      }

      // Fetch upcoming date idea
      const { data: dateData } = await supabase
        .from('date_ideas')
        .select('*')
        .eq('couple_id', currentCoupleId)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch recent memory
      const { data: memoryData } = await supabase
        .from('memories')
        .select('*')
        .eq('couple_id', currentCoupleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch last checkin for current user
      const { data: checkinData } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user?.id)
        .eq('couple_id', currentCoupleId)
        .order('checkin_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate checkin streak
      const { data: allCheckins } = await supabase
        .from('daily_checkins')
        .select('checkin_date, user_id')
        .eq('couple_id', currentCoupleId)
        .order('checkin_date', { ascending: false });

      let streak = 0;
      if (allCheckins && allCheckins.length > 0) {
        const today = new Date().toDateString();
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
      const today = new Date().toISOString().split('T')[0];
      
      const { data: userMoodData } = await supabase
        .from('daily_checkins')
        .select('mood')
        .eq('user_id', user?.id)
        .eq('couple_id', currentCoupleId)
        .eq('checkin_date', today)
        .maybeSingle();

      const { data: partnerMoodData } = await supabase
        .from('daily_checkins')
        .select('mood')
        .eq('user_id', partnerId)
        .eq('couple_id', currentCoupleId)
        .eq('checkin_date', today)
        .maybeSingle();

      console.log('User mood data:', { userId: user?.id, mood: userMoodData?.mood });
      console.log('Partner mood data:', { partnerId, mood: partnerMoodData?.mood });
      console.log('Is testing with self:', isTestingWithSelf);

      setSyncScore(syncScore);
      
      // Generate insights based on activity
      if (currentCoupleId) {
        await supabase.rpc('generate_relationship_insights', { p_couple_id: currentCoupleId });
      }
      setUpcomingDate(dateData);
      setRecentMemory(memoryData);
      setLastCheckin(checkinData);
      setCheckinStreak(streak);
      setLoveStreak(streak); // For now, love streak = checkin streak
      setUserMood(userMoodData?.mood);
      
      // If testing with self, don't show partner mood as the same
      if (isTestingWithSelf) {
        setPartnerMood(undefined); // Show no partner mood for testing
      } else {
        setPartnerMood(partnerMoodData?.mood);
      }
      setIsLoaded(true);
      
      // Show splash animation for 2 seconds to allow zoom animation
      setTimeout(() => setShowSplash(false), 2000);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsLoaded(true);
    }
  };

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
    console.log('Checkin clicked!', { coupleId, user: user?.id });
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
    navigate('/planner');
    toast({
      title: "Time to plan something special! ✨",
      description: "Let's find the perfect date idea for you two",
    });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Splash Screen Overlay with Sync Score Animation */}
      {showSplash && isLoaded && (
        <div className="fixed inset-0 bg-gradient-primary z-[100]" 
             style={{ 
               animation: 'fade-out 0.3s ease-out 1.7s forwards' 
             }}>
          
          {/* Sync Score - starts center, zooms to exact dashboard position */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="sync-score-container"
                 style={{ 
                   animation: 'zoom-to-position 1.2s ease-out 0.8s forwards',
                   transform: 'scale(2.5)'
                 }}>
              <SyncScoreCircle score={syncScore} animated={true} />
            </div>
          </div>
          
          {/* Floating Partner Mood Emojis */}
          {partnerMood && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Multiple floating emojis */}
              {[...Array(5)].map((_, i) => (
                <div key={i} 
                     className="absolute text-6xl opacity-90"
                     style={{
                       left: `${20 + i * 15}%`,
                       top: `${30 + (i % 2) * 40}%`,
                       animation: `float-${i + 1} 2s ease-in-out infinite, fade-in 0.3s ease-out ${0.5 + i * 0.1}s both, fade-out 0.5s ease-out 1.3s forwards`
                     }}>
                  {partnerMood}
                </div>
              ))}
              
              {/* Partner mood text */}
              <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 text-center"
                   style={{ animation: 'fade-in 0.3s ease-out 0.8s both, fade-out 0.5s ease-out 1.3s forwards' }}>
                <p className="text-white/90 text-lg font-medium">
                  Partner's Mood
                </p>
              </div>
            </div>
          )}
          
          {/* Welcome text */}
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-center"
               style={{ animation: 'fade-in 0.3s ease-out 1s both, fade-out 0.3s ease-out 1.5s forwards' }}>
            <h2 className="text-xl font-bold mb-1">Welcome Back! 💕</h2>
            <p className="text-white/80 text-sm">Your love sync is ready...</p>
          </div>
        </div>
      )}
      
      {/* Main Content - hidden during splash */}
      <div className={showSplash ? 'opacity-0' : 'opacity-100'}>
        {/* Header with gradient background */}
        <div className="bg-gradient-primary py-12 px-6 -mx-6 -mt-8 mb-8">
          <div className={`text-center space-y-2 ${isLoaded && !showSplash ? 'animate-fade-in' : 'opacity-0'}`}>
            <h1 className="text-3xl font-bold text-white">
              {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return "Good Morning";
                if (hour < 17) return "Good Afternoon";
                return "Good Evening";
              })()}
            </h1>
            <p className="text-lg text-white/90">
              Hey lovebirds! Track your relationship harmony and connection
            </p>
          </div>
        </div>
        
        <div className="container mx-auto px-6 space-y-6 pb-20">

          {/* Sync Score Section */}
          <div className={`${isLoaded && !showSplash ? 'animate-fade-in' : 'opacity-0'}`}>
            <SyncScoreCircle score={syncScore} animated={isLoaded && !showSplash} />
          </div>

        {/* Couple Avatars with Good Sync Status */}
        <div className={`${isLoaded && !showSplash ? 'animate-fade-in' : 'opacity-0'}`}>
          <CoupleAvatars syncScore={syncScore} animated={isLoaded && !showSplash} />
        </div>

        <div className={`${isLoaded && !showSplash ? 'animate-fade-in' : 'opacity-0'}`}>
          <CoupleMoodDisplay 
            userMood={userMood} 
            partnerMood={partnerMood} 
            userId={user?.id}
            coupleId={coupleId}
            onMoodUpdate={refreshDashboard}
          />
        </div>

        {/* Compact Dashboard Cards */}
        <div className={`grid grid-cols-2 gap-3 ${isLoaded && !showSplash ? 'animate-fade-in' : 'opacity-0'}`}>
          {/* Last Check-in Card - Compact */}
          <div className="bg-card border rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <Heart className="text-white" size={16} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Check-in</p>
                <p className="text-xs font-medium">
                  {lastCheckin ? new Date(lastCheckin.checkin_date).toLocaleDateString() : 'Jul 28, 6:45 AM'}
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {lastCheckin ? `Feeling ${lastCheckin.mood}...` : 'Feeling Ne...'}
            </p>
          </div>

          {/* Relationship Health Card - Compact */}
          <div className="bg-card border rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <Heart className="text-white" size={16} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Relationship Health</p>
                <div className="flex items-center gap-1">
                  <p className="text-lg font-bold text-secondary">50%</p>
                  <span className="text-secondary text-xs">↗</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Growing together</p>
          </div>
        </div>

        {/* Streak Banner */}
        <div className={`bg-gradient-romance rounded-xl p-4 text-center text-white shadow-sm ${isLoaded && !showSplash ? 'animate-fade-in' : 'opacity-0'}`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl font-bold">{checkinStreak || 3}</span>
            <span className="text-lg">day streak!</span>
          </div>
          <p className="text-sm opacity-90">Keep the love alive - check in daily! 🔥</p>
        </div>

        {/* Action Cards Grid */}
        <div className={`grid grid-cols-2 gap-4 ${isLoaded && !showSplash ? 'animate-fade-in' : 'opacity-0'}`}>
          {/* Daily Check-in */}
          <div 
            className="bg-card border rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition-all shadow-sm"
            onClick={handleCheckinClick}
          >
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="text-white" size={24} />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Daily Check-in</h3>
            <p className="text-xs text-muted-foreground">Keep the streak!</p>
          </div>

          {/* Mood Check */}
          <div 
            className="bg-card border rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition-all shadow-sm"
            onClick={handleMoodCheckinClick}
          >
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
              <Heart className="text-accent-foreground" size={24} />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Mood Check</h3>
            <p className="text-xs text-muted-foreground">How are you feeling?</p>
          </div>

          {/* Plan Date */}
          <div 
            className="bg-card border rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition-all shadow-sm"
            onClick={handlePlanDateClick}
          >
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="text-white" size={24} />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Plan Date</h3>
            <p className="text-xs text-muted-foreground">Create memories</p>
          </div>

          {/* Add Memory */}
          <div 
            className="bg-card border rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition-all shadow-sm"
            onClick={() => navigate('/vault')}
          >
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="text-accent-foreground" size={24} />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Add Memory</h3>
            <p className="text-xs text-muted-foreground">Capture the moment</p>
          </div>
        </div>

        {/* Get Relationship Insights Button */}
        <div className={`${isLoaded && !showSplash ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '800ms' }}>
          <Button 
            className="w-full rounded-xl py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-medium transition-all"
            onClick={() => navigate('/coach')}
          >
            <Sparkles className="mr-2" size={18} />
            Get Relationship Insights
          </Button>
        </div>
        </div>
      </div>

      {/* Daily Check-in Flow Modal */}
      {showDailyCheckin && coupleId && user && (
        <DailyCheckinFlow
          userId={user.id}
          coupleId={coupleId}
          currentStreak={checkinStreak}
          onComplete={() => {
            setShowDailyCheckin(false);
            refreshDashboard();
          }}
          onClose={() => setShowDailyCheckin(false)}
        />
      )}

      {/* Mood Check Modal */}
      {showMoodCheckin && coupleId && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <MoodCheckin
              userId={user.id}
              coupleId={coupleId}
              currentMood={userMood}
              onMoodUpdate={(mood) => {
                setUserMood(mood);
                setShowMoodCheckin(false);
                refreshDashboard();
              }}
            />
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowMoodCheckin(false)}
                className="text-white hover:text-gray-300 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation - hidden during splash */}
      {!showSplash && <BottomNavigation />}
    </div>
  );
};