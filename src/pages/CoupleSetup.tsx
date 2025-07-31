import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Heart, Users, Plus, ArrowLeft, Edit, User, Mail, Calendar, Trash2, Check, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export const CoupleSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profileData, setProfileData] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState<string>('dating');
  const [anniversaryDate, setAnniversaryDate] = useState<Date | null>(null);
  const [partnerRequests, setPartnerRequests] = useState<any[]>([]);

  // Check if user is in demo mode (paired with themselves)
  const isDemoMode = coupleData?.user1_id === coupleData?.user2_id;

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

      // Check if user is in a couple
      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .maybeSingle();

      setCoupleData(couple);

      // If couple exists, fetch partner profile and set form data
      if (couple) {
        const partnerId = couple.user1_id === user?.id ? couple.user2_id : couple.user1_id;
        const { data: partner } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', partnerId)
          .maybeSingle();
        
        setPartnerProfile(partner);
        setRelationshipStatus(couple.relationship_status || 'dating');
        if (couple.anniversary_date) {
          setAnniversaryDate(new Date(couple.anniversary_date));
        }
      }

      // Fetch pending partner requests
      const { data: requests } = await supabase
        .from('partner_requests')
        .select('*')
        .or(`requested_email.eq.${user?.email},requested_user_id.eq.${user?.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPartnerRequests(requests || []);
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

      // Refresh the data and close edit mode
      await fetchUserData();
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

  const sendPartnerRequest = async () => {
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
      const { data, error } = await supabase.functions.invoke('send-partner-request', {
        body: { partnerEmail: partnerEmail.trim() }
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Request Failed",
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Partner Request Sent! 💕",
        description: data.message,
      });

      // Refresh the data
      await fetchUserData();
      setEditing(false);
      setPartnerEmail("");
    } catch (error) {
      console.error('Error sending partner request:', error);
      toast({
        title: "Error",
        description: "Failed to send partner request",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const acceptPartnerRequest = async (requestId: string) => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('accept-partner-request', {
        body: { requestId }
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Accept Failed",
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Partner Request Accepted! 💕",
        description: data.message,
      });

      // Refresh the data
      await fetchUserData();
    } catch (error) {
      console.error('Error accepting partner request:', error);
      toast({
        title: "Error",
        description: "Failed to accept partner request",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const declinePartnerRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('partner_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Declined",
        description: "Partner request has been declined",
      });

      // Refresh the data
      await fetchUserData();
    } catch (error) {
      console.error('Error declining partner request:', error);
      toast({
        title: "Error",
        description: "Failed to decline partner request",
        variant: "destructive"
      });
    }
  };

  const updateRelationshipDetails = async () => {
    if (!coupleData) return;

    setUpdating(true);
    try {
      const updates: any = {
        relationship_status: relationshipStatus,
      };

      if (anniversaryDate) {
        updates.anniversary_date = anniversaryDate.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('couples')
        .update(updates)
        .eq('id', coupleData.id);

      if (error) throw error;

      toast({
        title: "Relationship Updated! 💕",
        description: "Your relationship details have been updated",
      });

      // Refresh the data
      await fetchUserData();
      setEditing(false);
    } catch (error) {
      console.error('Error updating relationship details:', error);
      toast({
        title: "Error",
        description: "Failed to update relationship details",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const removePartner = async () => {
    if (!coupleData) return;
    
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('remove-partner', {
        body: { coupleId: coupleData.id }
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Remove Failed",
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Partner Removed! 💔",
        description: data.message,
      });

      // Refresh the data
      await fetchUserData();
      setEditing(false);
      setPartnerEmail("");
    } catch (error) {
      console.error('Error removing partner:', error);
      toast({
        title: "Error",
        description: "Failed to remove partner",
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

      window.location.reload(); // Simple refresh to reset all data
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
      if (partnerEmail.trim()) {
        // Invite partner flow
        const { data, error } = await supabase.functions.invoke('invite-partner', {
          body: { 
            partnerEmail: partnerEmail.trim(),
            userDisplayName: displayName.trim()
          }
        });

        if (error) throw error;

        if (!data.success) {
          toast({
            title: "Invitation Failed",
            description: data.error,
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Partner Invitation Sent! 💕",
          description: data.message,
        });

        // Redirect to dashboard after successful setup
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        // Demo mode - use seed-data function
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
          title: "Demo Profile Created! 💕",
          description: "Sample data has been added. You can now use all features!",
        });

        // Redirect to dashboard after successful setup
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
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
                  {editing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="editDisplayName" className="text-sm font-medium text-blue-800">
                          Your Display Name
                        </Label>
                        <Input
                          id="editDisplayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your name"
                          className="mt-1 bg-white"
                        />
                        <p className="text-xs text-blue-600 mt-1">
                          This is how you'll appear in the app
                        </p>
                      </div>
                      <Button
                        onClick={updateNames}
                        disabled={updating}
                        className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-romantic"
                        size="sm"
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
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white border border-blue-300 p-3 rounded-md">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Name</span>
                          <span className="text-sm text-blue-700">{profileData?.display_name || 'Not set'}</span>
                        </div>
                      </div>
                      <div className="bg-white border border-blue-300 p-3 rounded-md">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">User ID</span>
                          <span className="text-sm text-blue-700 font-mono break-all">{user?.id}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Partner Profile */}
                <div className="bg-pink-50 border border-pink-200 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                      <Heart className="text-white" size={16} />
                    </div>
                    <h4 className="font-semibold text-pink-800">Partner</h4>
                  </div>
                  {editing ? (
                    <div className="space-y-4">
                      {/* Partner's Name - Read Only */}
                      <div className="bg-white border border-pink-300 p-3 rounded-md">
                        <p className="text-sm text-pink-800">
                          <span className="font-medium">Name:</span> {partnerProfile?.display_name || 'Not available'}
                        </p>
                        <p className="text-xs text-pink-600 mt-1">
                          Partner's name is automatically fetched from their profile
                        </p>
                      </div>
                      
                      {/* Connect to Different Partner */}
                      <div>
                        <Label htmlFor="newPartnerEmail" className="text-sm font-medium text-pink-800">
                          Connect to Different Partner
                        </Label>
                        <Input
                          id="newPartnerEmail"
                          type="email"
                          value={partnerEmail}
                          onChange={(e) => setPartnerEmail(e.target.value)}
                          placeholder="partner@example.com"
                          className="mt-1 bg-white"
                        />
                        <p className="text-xs text-pink-600 mt-1">
                          Enter email of someone with a LoveSync account
                        </p>
                      </div>
                       <div className="flex gap-2">
                         <Button
                           onClick={sendPartnerRequest}
                           disabled={updating}
                           className="flex-1 bg-gradient-secondary hover:opacity-90 text-white shadow-romantic"
                           size="sm"
                         >
                           {updating ? (
                             <>
                               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                               Sending...
                             </>
                           ) : (
                             'Send Partner Request'
                           )}
                         </Button>
                         {!isDemoMode && (
                           <Button
                             variant="outline"
                             onClick={removePartner}
                             disabled={updating}
                             className="text-red-600 border-red-200 hover:bg-red-50"
                             size="sm"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         )}
                       </div>
                    </div>
                  ) : (
                    <>
                      {partnerProfile ? (
                        <div className="space-y-3">
                          <div className="bg-white border border-pink-300 p-3 rounded-md">
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs font-semibold text-pink-800 uppercase tracking-wide">Name</span>
                              <span className="text-sm text-pink-700">{partnerProfile.display_name || 'Not set'}</span>
                            </div>
                          </div>
                          <div className="bg-white border border-pink-300 p-3 rounded-md">
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs font-semibold text-pink-800 uppercase tracking-wide">User ID</span>
                              <span className="text-sm text-pink-700 font-mono break-all">{partnerProfile.user_id}</span>
                            </div>
                          </div>
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
                              You are currently in demo mode. Add a real partner above.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Show remove partner option for real couples */}
                      {coupleData?.user1_id !== coupleData?.user2_id && !editing && (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            onClick={removePartner}
                            disabled={updating}
                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Partner
                          </Button>
                        </div>
                      )}
                    </>
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
                  {editing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="relationshipStatus" className="text-sm font-medium text-gray-800">
                          Relationship Status
                        </Label>
                        <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dating">Dating</SelectItem>
                            <SelectItem value="engaged">Engaged</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="partnered">Partnered</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="anniversaryDate" className="text-sm font-medium text-gray-800">
                          Anniversary Date
                        </Label>
                        <div className="mt-1">
                          <DatePicker
                            selected={anniversaryDate}
                            onChange={(date) => setAnniversaryDate(date)}
                            dateFormat="MM/dd/yyyy"
                            placeholderText="Select anniversary date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxDate={new Date()}
                          />
                        </div>
                      </div>
                      <Button
                        onClick={updateRelationshipDetails}
                        disabled={updating}
                        className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-romantic"
                        size="sm"
                      >
                        {updating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating...
                          </>
                        ) : (
                          'Update Relationship Details'
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white border border-gray-300 p-3 rounded-md">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Status</span>
                          <span className="text-sm text-gray-700 capitalize">{coupleData?.relationship_status || 'dating'}</span>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-300 p-3 rounded-md">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Anniversary</span>
                          <span className="text-sm text-gray-700">
                            {coupleData?.anniversary_date 
                              ? new Date(coupleData.anniversary_date).toLocaleDateString() 
                              : 'Not set'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-300 p-3 rounded-md">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Created</span>
                          <span className="text-sm text-gray-700">{new Date(coupleData.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Partner Requests */}
                {partnerRequests.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <Mail className="text-white" size={16} />
                      </div>
                      <h4 className="font-semibold text-blue-800">Partner Requests</h4>
                    </div>
                    <div className="space-y-3">
                      {partnerRequests.map((request) => (
                        <div key={request.id} className="bg-white border border-blue-300 p-3 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-800">
                                {request.requester_id === user?.id ? (
                                  `Sent to: ${request.requested_email}`
                                ) : (
                                  `From: ${request.requested_email}`
                                )}
                              </p>
                              <p className="text-xs text-blue-600">
                                <Clock className="inline w-3 h-3 mr-1" />
                                {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {request.requester_id !== user?.id && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => acceptPartnerRequest(request.id)}
                                  disabled={updating}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => declinePartnerRequest(request.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* Edit Mode Cancel Button */}
                {editing && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                      setEditing(false);
                      setPartnerEmail("");
                      setDisplayName(profileData?.display_name || '');
                      setRelationshipStatus(coupleData?.relationship_status || 'dating');
                      if (coupleData?.anniversary_date) {
                        setAnniversaryDate(new Date(coupleData.anniversary_date));
                      }
                      }}
                      className="px-8"
                    >
                      Cancel
                    </Button>
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
                  <p className="text-sm text-muted-foreground mt-1">
                    This is how you'll appear in the app
                  </p>
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
                    Enter your partner's email to invite them. If they already have an account, you'll be connected immediately. If not, they'll need to create one first.
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
                  We'll add demo data so you can explore everything immediately. Partner names are automatically fetched from their profiles.
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