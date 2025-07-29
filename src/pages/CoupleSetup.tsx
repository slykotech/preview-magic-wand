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
  const [partnerDisplayName, setPartnerDisplayName] = useState("");
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
        setPartnerDisplayName(partner?.display_name || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateNames = async () => {
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
      // Update user's own profile only
      await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('user_id', user?.id);

      toast({
        title: "Your Name Updated! 💕",
        description: "Your display name has been updated successfully",
      });

      // Refresh the data
      fetchUserData();
      setEditing(false);
    } catch (error) {
      console.error('Error updating name:', error);
      toast({
        title: "Error",
        description: "Failed to update your name",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
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

    if (!coupleData) {
      toast({
        title: "Error",
        description: "No couple relationship found",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-partner', {
        body: { 
          partnerEmail: partnerEmail.trim(),
          coupleId: coupleData.id 
        }
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Update Failed",
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Partner Updated! 💕",
        description: data.message,
      });

      // Refresh the data
      fetchUserData();
      setEditing(false);
      setPartnerEmail("");
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
              <CardContent className="space-y-6">
                {/* Your Profile */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="text-white" size={16} />
                    </div>
                    <h4 className="font-semibold text-blue-800">You</h4>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Name:</span> {profileData?.display_name || 'Not set'}
                    </p>
                    <p className="text-sm text-blue-700 font-mono">
                      <span className="font-medium">User ID:</span> {user?.id?.substring(0, 8)}...
                    </p>
                  </div>
                </div>

                {/* Partner Profile */}
                <div className="bg-pink-50 border border-pink-200 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                      <Heart className="text-white" size={16} />
                    </div>
                    <h4 className="font-semibold text-pink-800">Partner</h4>
                  </div>
                  {partnerProfile ? (
                    <div className="space-y-2">
                      <p className="text-sm text-pink-700">
                        <span className="font-medium">Name:</span> {partnerProfile.display_name || 'Not set'}
                      </p>
                      <p className="text-sm text-pink-700 font-mono">
                        <span className="font-medium">User ID:</span> {partnerProfile.user_id?.substring(0, 8)}...
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-pink-700">Partner profile not found</p>
                  )}
                  
                  {/* Show if user is paired with themselves */}
                  {coupleData?.user1_id === coupleData?.user2_id && (
                    <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">⚠️</span>
                        <span className="text-yellow-800 text-sm font-medium">
                          You are currently paired with yourself (demo mode)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Relationship Details */}
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <Calendar className="text-white" size={16} />
                    </div>
                    <h4 className="font-semibold text-gray-800">Relationship Info</h4>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Status:</span> {coupleData?.relationship_status || 'Dating'}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Anniversary:</span> {coupleData?.anniversary_date ? new Date(coupleData.anniversary_date).toLocaleDateString() : 'Not set'}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Created:</span> {new Date(coupleData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Edit Section */}
                {editing && (
                  <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg space-y-6">
                    <div>
                      <h4 className="font-semibold text-orange-800 mb-4 flex items-center gap-2">
                        <Edit size={16} />
                        Edit Names
                      </h4>
                      <div className="space-y-4">
                         <div>
                           <Label htmlFor="editDisplayName" className="text-sm font-medium text-orange-800">
                             Your Name
                           </Label>
                           <Input
                             id="editDisplayName"
                             value={displayName}
                             onChange={(e) => setDisplayName(e.target.value)}
                             placeholder="Enter your name"
                             className="mt-1"
                           />
                         </div>
                         {partnerProfile && (
                           <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                             <p className="text-sm text-yellow-800">
                               <span className="font-medium">Partner's Name:</span> {partnerProfile.display_name || 'Not set'}
                             </p>
                             <p className="text-xs text-yellow-600 mt-1">
                               Your partner needs to update their own name. Only they can change it for security reasons.
                             </p>
                           </div>
                         )}
                         <div className="flex gap-3">
                           <Button
                             onClick={updateNames}
                             disabled={updating}
                             className="flex-1 bg-green-600 hover:bg-green-700"
                           >
                             {updating ? (
                               <>
                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                 Updating...
                               </>
                             ) : (
                               'Update Your Name'
                             )}
                           </Button>
                         </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-orange-800 mb-4 flex items-center gap-2">
                        <Mail size={16} />
                        Update Partner Connection
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="newPartnerEmail" className="text-sm font-medium text-orange-800">
                            New Partner's Email
                          </Label>
                          <Input
                            id="newPartnerEmail"
                            type="email"
                            value={partnerEmail}
                            onChange={(e) => setPartnerEmail(e.target.value)}
                            placeholder="partner@example.com"
                            className="mt-1"
                          />
                          <p className="text-xs text-orange-600 mt-1">
                            Enter the email of someone who already has a LoveSync account
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={updatePartnerConnection}
                            disabled={updating}
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                          >
                            {updating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Updating...
                              </>
                            ) : (
                              'Update Partner'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditing(false);
                          setPartnerEmail("");
                          // Reset names to original values
                          setDisplayName(profileData?.display_name || '');
                          setPartnerDisplayName(partnerProfile?.display_name || '');
                        }}
                        className="px-6"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2 border-t border-gray-200">
                  <Button 
                    onClick={() => navigate('/dashboard')} 
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={resetCoupleData}
                    className="flex items-center gap-2 px-6"
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