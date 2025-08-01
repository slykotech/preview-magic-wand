import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ProfileSection } from "@/components/ProfileSection";
import { PartnerConnectionSection } from "@/components/PartnerConnectionSection";
import { Heart, Users, Plus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const CoupleSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Listen for focus events to refresh data when user returns to page
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        console.log('Page focused, refreshing couple data...');
        fetchUserData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setUserProfile(profile);
        setDisplayName(profile.display_name || '');
      }

      // Check if user is in a couple - prioritize real partnerships over demo mode
      const { data: couples } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      // Find the best couple record - prefer real partnerships over demo mode
      let couple = null;
      if (couples && couples.length > 0) {
        // First try to find a real partnership (user1_id !== user2_id)
        couple = couples.find(c => c.user1_id !== c.user2_id);
        // If no real partnership, use the most recent record
        if (!couple) {
          couple = couples[0];
        }
      }

      setCoupleData(couple);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your display name",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);
    try {
      // Update user's profile
      await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('user_id', user?.id);

      toast({
        title: "Profile Updated! 💕",
        description: "Your profile has been updated successfully",
      });

      // Refresh the data
      await fetchUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update your profile",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const createInitialCouple = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your display name first",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    
    try {
      // Create demo mode couple (user paired with themselves)
      console.log('Creating couple profile for user:', user?.id);
      const { data, error } = await supabase.functions.invoke('seed-data', {
        body: { userId: user?.id }
      });

      console.log('Seed data response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Update the user's display name in their profile
      await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          display_name: displayName
        });

      toast({
        title: "Profile Created! 💕",
        description: "Your couple profile has been set up. You can now explore all features!",
      });

      // Refresh data and redirect to dashboard
      await fetchUserData();
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      
      // More detailed error handling
      let errorMessage = "Failed to create couple profile";
      if (error.message?.includes('duplicate key')) {
        errorMessage = "You already have a profile! Redirecting to dashboard...";
        // If it's a duplicate key error, they already have a profile, so redirect
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-romance text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile')}
            className="text-white hover:bg-white/20 p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-poppins">Manage Couple Profile</h1>
            <p className="text-white/80 text-sm font-inter font-bold">
              {coupleData ? 'Update your connection' : 'Get started with LoveSync'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {coupleData ? (
          <>
            {/* Your Profile Section */}
            <ProfileSection 
              userProfile={userProfile} 
              onProfileUpdate={fetchUserData}
            />

            {/* Partner Connection Section */}
            <PartnerConnectionSection />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Go to Dashboard
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Initial Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart size={20} />
                  Create Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="setupDisplayName">Your Name</Label>
                  <Input
                    id="setupDisplayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    This is how you'll appear in the app
                  </p>
                </div>
                <Button 
                  onClick={createInitialCouple} 
                  className="w-full" 
                  disabled={creating || !displayName.trim()}
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      Create Profile & Explore Features
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Getting Started</h3>
                <p className="text-blue-700 text-sm">
                  Create your profile to start exploring LoveSync! You'll begin in demo mode 
                  where you can try all features. When you're ready, invite your partner to 
                  connect and share your relationship journey together.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};