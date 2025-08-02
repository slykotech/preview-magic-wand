import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SyncScoreBreakdown } from "@/components/SyncScoreBreakdown";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GradientHeader } from "@/components/GradientHeader";
import { User, Heart, Settings, Award, Calendar, LogOut, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCoupleData } from '@/hooks/useCoupleData';
import { useEnhancedSyncScore } from "@/hooks/useEnhancedSyncScore";
import { supabase } from "@/integrations/supabase/client";
import coupleImage from "@/assets/couple-avatars.jpg";

interface ProfileMenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

const ProfileMenuItem = ({ icon, title, subtitle, onClick, variant = 'default' }: ProfileMenuItemProps) => (
  <div
    onClick={onClick}
    className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 cursor-pointer ${
      variant === 'danger' 
        ? 'hover:bg-destructive/10 active:bg-destructive/20' 
        : 'hover:bg-muted/50 active:bg-muted'
    } transform hover:scale-102`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-full ${
        variant === 'danger' 
          ? 'bg-destructive/20 text-destructive' 
          : 'bg-sunrise-coral/20 text-sunrise-coral'
      }`}>
        {icon}
      </div>
      <div>
        <h3 className={`font-poppins font-bold ${
          variant === 'danger' ? 'text-destructive' : 'text-foreground'
        }`}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground font-inter font-semibold">{subtitle}</p>
        )}
      </div>
    </div>
    <ChevronRight size={20} className="text-muted-foreground" />
  </div>
);

export const Profile = () => {
  const [relationshipStats, setRelationshipStats] = useState({
    daysConnected: 0,
    memoryCount: 0,
    dateCount: 0,
    averageSync: 0
  });
  const [loading, setLoading] = useState(true);
  const [showSyncBreakdown, setShowSyncBreakdown] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getUserDisplayName, getPartnerDisplayName, coupleData, loading: coupleLoading } = useCoupleData();
  
  // Use enhanced sync score hook
  const { 
    syncScoreData, 
    loading: syncScoreLoading
  } = useEnhancedSyncScore(coupleData?.id);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user, coupleData]);

  // Add real-time listener for couple data changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('couple-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couples',
          filter: `user1_id=eq.${user.id}`
        },
        () => {
          console.log('Couple data changed, refreshing...');
          fetchProfileData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couples',
          filter: `user2_id=eq.${user.id}`
        },
        () => {
          console.log('Couple data changed, refreshing...');
          fetchProfileData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchProfileData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // If we have couple data, use it; otherwise set defaults
      if (coupleData && coupleData.user1_id !== coupleData.user2_id) {
        // Calculate relationship stats
        const createdDate = new Date(coupleData.created_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Get memories count
        const { count: memoryCount } = await supabase
          .from('memories')
          .select('*', { count: 'exact', head: true })
          .eq('couple_id', coupleData.id);

        // Get completed dates count
        const { count: dateCount } = await supabase
          .from('date_ideas')
          .select('*', { count: 'exact', head: true })
          .eq('couple_id', coupleData.id)
          .eq('is_completed', true);

        // Get latest sync score
        const { data: syncScore } = await supabase
          .from('sync_scores')
          .select('score')
          .eq('couple_id', coupleData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setRelationshipStats({
          daysConnected: diffDays,
          memoryCount: memoryCount || 0,
          dateCount: dateCount || 0,
          averageSync: syncScore?.score || 0
        });
      } else {
        // No partner connected, set default stats
        setRelationshipStats({
          daysConnected: 0,
          memoryCount: 0,
          dateCount: 0,
          averageSync: 0
        });
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      // Set fallback stats on error
      setRelationshipStats({
        daysConnected: 0,
        memoryCount: 0,
        dateCount: 0,
        averageSync: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (action: string, route?: string) => {
    if (route) {
      navigate(route);
    }
    toast({
      title: `${action} clicked! ⚙️`,
      description: action === "Edit Profile" ? "Update your profile information" : 
                  action === "Preferences" ? "Customize your relationship settings" :
                  action === "Quests" ? "View your relationship challenges" :
                  action === "Date History" ? "See all your amazing dates" :
                  action === "Settings" ? "Manage app preferences" : 
                  "This feature is coming soon",
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast({
        title: "Come back soon! 👋",
        description: "You've been logged out successfully",
        variant: "destructive"
      });
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Gradient Header with Couple Info */}
      <GradientHeader
        title={coupleLoading ? 'Loading...' : 
          coupleData && coupleData.user1_id !== coupleData.user2_id ? 
            `${getUserDisplayName()} & ${getPartnerDisplayName()}` :
            getUserDisplayName() || 'Setup Your Profile'
        }
        subtitle={coupleData?.anniversary_date && coupleData.user1_id !== coupleData.user2_id ? 
          `Together since ${new Date(coupleData.anniversary_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} 💕` :
          coupleData && coupleData.user1_id !== coupleData.user2_id ? 'Together since joining LoveSync 💕' : 
          'Ready to start your journey? 💕'
        }
        icon={<User size={24} />}
        showBackButton={false}
      >
        {/* Couple Avatars */}
        <div className="flex items-center justify-center mt-4">
          <div className="flex -space-x-4">
            <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden shadow-lg">
              <img 
                src={coupleImage} 
                alt="Your Avatar" 
                className="w-full h-full object-cover object-left"
              />
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden shadow-lg">
              <img 
                src={coupleImage} 
                alt="Partner Avatar" 
                className="w-full h-full object-cover object-right"
              />
            </div>
          </div>
        </div>
      </GradientHeader>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Personal Section */}
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold font-poppins text-foreground mb-4">Personal</h2>
          <div className="bg-card rounded-2xl p-2 shadow-soft">
            <ProfileMenuItem
              icon={<User size={20} />}
              title={coupleData ? "Manage Couple Profile" : "Setup Couple Profile"}
              subtitle={coupleData ? "Edit your relationship settings" : "Required for daily check-ins"}
              onClick={() => handleMenuClick("Setup Couple", "/couple-setup")}
            />
            <ProfileMenuItem
              icon={<Heart size={20} />}
              title="Relationship Info"
              subtitle="Customize your love language"
              onClick={() => handleMenuClick("Preferences", "/preferences")}
            />
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold font-poppins text-foreground mb-4">Progress</h2>
          <div className="bg-card rounded-2xl p-2 shadow-soft">
            <ProfileMenuItem
              icon={<Award size={20} />}
              title="LoveLog: Dates That Matter"
              subtitle="Manage important dates & milestones"
              onClick={() => handleMenuClick("Important Dates", "/important-dates")}
            />
            <ProfileMenuItem
              icon={<Calendar size={20} />}
              title="Date History"
              subtitle={`${relationshipStats.dateCount} amazing dates`}
              onClick={() => handleMenuClick("Date History", "/planner")}
            />
          </div>
        </div>

        {/* Settings Section */}
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold font-poppins text-foreground mb-4">Settings</h2>
          <div className="bg-card rounded-2xl p-2 shadow-soft">
            <ProfileMenuItem
              icon={<Award size={20} />}
              title="View Score Breakdown"
              subtitle="See detailed sync score analysis"
              onClick={() => setShowSyncBreakdown(true)}
            />
            <ProfileMenuItem
              icon={<Settings size={20} />}
              title="App Settings"
              subtitle="Notifications, privacy & more"
              onClick={() => handleMenuClick("Settings", "/app-settings")}
            />
            <ProfileMenuItem
              icon={<LogOut size={20} />}
              title="Sign Out"
              onClick={handleLogout}
              variant="danger"
            />
          </div>
        </div>

        {/* Relationship Milestones */}
        <div className="bg-gradient-glow rounded-2xl p-6 text-center">
          <Heart className="mx-auto text-gold-accent mb-3 animate-heart-pulse" size={32} />
          <h3 className="font-poppins font-extrabold text-foreground mb-2">
            Love Level: Soulmates ✨
          </h3>
          <p className="text-muted-foreground font-inter text-sm font-semibold">
            You've unlocked the highest relationship tier! Keep nurturing your beautiful connection.
          </p>
        </div>
      </div>

      {/* Sync Score Breakdown Dialog */}
      {showSyncBreakdown && syncScoreData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <SyncScoreBreakdown
              score={syncScoreData.score}
              breakdown={syncScoreData.breakdown}
              onClose={() => setShowSyncBreakdown(false)}
            />
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};