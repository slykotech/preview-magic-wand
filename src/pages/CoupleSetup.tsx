import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Heart, Users, Plus, ArrowLeft, Edit, User, Mail, Calendar, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const CoupleSetup = () => {
  const [loading, setLoading] = useState(true);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [coupleData, setCoupleData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
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
        setProfileData(profile);
        setDisplayName(profile.display_name || '');
      }

      // Fetch couple relationship
      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .maybeSingle();

      setCoupleData(couple);

      // If couple exists, fetch partner profile
      if (couple) {
        const partnerId = couple.user1_id === user?.id ? couple.user2_id : couple.user1_id;
        const { data: partner } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', partnerId)
          .maybeSingle();
        
        setPartnerProfile(partner);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePartnerConnection = async () => {
    if (!partnerEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your partner's email",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);
    try {
      // Find partner by email (this would need to be implemented via a function)
      // For now, we'll just update the display to show the intention
      toast({
        title: "Feature Coming Soon",
        description: "Partner connection updates will be available soon. Currently using demo data.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating partner:', error);
      toast({
        title: "Error",
        description: "Failed to update partner connection",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const resetCoupleData = async () => {
    if (!coupleData) return;
    
    try {
      // Delete couple relationship (this will allow them to start fresh)
      await supabase
        .from('couples')
        .delete()
        .eq('id', coupleData.id);

      toast({
        title: "Couple Data Reset",
        description: "You can now create a new couple profile",
      });

      setCoupleData(null);
      setPartnerProfile(null);
    } catch (error) {
      console.error('Error resetting couple data:', error);
      toast({
        title: "Error",
        description: "Failed to reset couple data",
        variant: "destructive"
      });
    }
  };

  const createCouple = async () => {
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
      // Use the seed-data edge function to create complete test data
      const { data, error } = await supabase.functions.invoke('seed-data', {
        body: { userId: user?.id }
      });

      if (error) throw error;

      // Update the user's display name in their profile
      await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          display_name: displayName
        });

      toast({
        title: "Couple Profile Created! 💕",
        description: "Sample data has been added. You can now use all features!",
      });

      fetchUserData();
      // Redirect to dashboard after successful setup
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error creating couple:', error);
      toast({
        title: "Error",
        description: "Failed to create couple relationship",
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
            <h1 className="text-xl font-extrabold font-poppins">Couple Setup</h1>
            <p className="text-white/80 text-sm font-inter font-bold">Get started with LoveSync</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {coupleData ? (
          <>
            {/* Current Couple Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart size={20} />
                    Current Couple Details
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(!editing)}
                  >
                    <Edit size={16} className="mr-2" />
                    Edit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Your Profile */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <User className="text-blue-600" size={20} />
                    <h4 className="font-semibold text-blue-800">You</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    <strong>Name:</strong> {profileData?.display_name || 'Not set'}
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>User ID:</strong> {user?.id}
                  </p>
                </div>

                {/* Partner Profile */}
                <div className="bg-pink-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Heart className="text-pink-600" size={20} />
                    <h4 className="font-semibold text-pink-800">Partner</h4>
                  </div>
                  {partnerProfile ? (
                    <>
                      <p className="text-sm text-pink-700">
                        <strong>Name:</strong> {partnerProfile.display_name || 'Not set'}
                      </p>
                      <p className="text-sm text-pink-700">
                        <strong>User ID:</strong> {partnerProfile.user_id}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-pink-700">Partner profile not found</p>
                  )}
                  
                  {/* Show if user is paired with themselves */}
                  {coupleData?.user1_id === coupleData?.user2_id && (
                    <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-xs">
                      ⚠️ You are currently paired with yourself (demo mode)
                    </div>
                  )}
                </div>

                {/* Relationship Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="text-gray-600" size={20} />
                    <h4 className="font-semibold text-gray-800">Relationship Info</h4>
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Status:</strong> {coupleData?.relationship_status || 'Dating'}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Anniversary:</strong> {coupleData?.anniversary_date ? new Date(coupleData.anniversary_date).toLocaleDateString() : 'Not set'}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Created:</strong> {new Date(coupleData.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Edit Section */}
                {editing && (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-semibold text-orange-800 mb-3">Update Partner Connection</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="newPartnerEmail">New Partner's Email</Label>
                        <Input
                          id="newPartnerEmail"
                          type="email"
                          value={partnerEmail}
                          onChange={(e) => setPartnerEmail(e.target.value)}
                          placeholder="partner@example.com"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={updatePartnerConnection}
                          disabled={updating}
                          className="flex-1"
                        >
                          {updating ? 'Updating...' : 'Update Partner'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditing(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={() => navigate('/dashboard')} 
                    className="flex-1"
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={resetCoupleData}
                    className="flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Profile Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart size={20} />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="displayName">Your Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <Label htmlFor="partnerEmail">Partner's Email (Optional)</Label>
                  <Input
                    id="partnerEmail"
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="partner@example.com"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    For now, we'll create demo data so you can explore all features!
                  </p>
                </div>
                <Button 
                  onClick={createCouple} 
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
                      Create Couple Profile
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
                  Creating your couple profile will enable daily check-ins, mood tracking, 
                  relationship insights, sample memories, date ideas, and all other LoveSync features. 
                  We'll add demo data so you can explore everything immediately.
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