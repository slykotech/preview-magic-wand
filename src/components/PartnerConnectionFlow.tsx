import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Heart, 
  Users, 
  Send, 
  UserX,
  AlertTriangle,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Home,
  UserMinus,
  Calendar,
  Edit3,
  Check,
  X,
  Timer
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { usePartnerConnectionV2 } from "@/hooks/usePartnerConnectionV2";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const PartnerConnectionFlow = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const {
    connectionStatus,
    couple,
    incomingRequests,
    outgoingRequests,
    isLoading,
    isProcessing,
    sendPartnerRequest,
    acceptRequest,
    declineRequest,
    removePartner,
    updateRelationshipDetails
  } = usePartnerConnectionV2();
  
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState(couple?.relationship_status || 'dating');
  const [anniversaryDate, setAnniversaryDate] = useState(couple?.anniversary_date || '');

  // Rate limiting countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const isRateLimited = countdown > 0;

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle send invitation
  const handleSendRequest = async () => {
    if (!email.trim() || !isValidEmail(email) || isRateLimited) return;

    setIsInviting(true);
    
    const result = await sendPartnerRequest(email.trim());
    
    if (result.success) {
      setEmail("");
      setLastRequestTime(Date.now());
      setCountdown(30); // 30 second cooldown
    } else {
      toast({
        title: "Failed to send invitation",
        description: result.error,
        variant: "destructive"
      });
    }
    
    setIsInviting(false);
  };

  // Handle accept request
  const handleAcceptRequest = async (requestId: string) => {
    const result = await acceptRequest(requestId);
    if (!result.success) {
      toast({
        title: "Failed to accept request",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  // Handle decline request
  const handleDeclineRequest = async (requestId: string) => {
    const result = await declineRequest(requestId);
    if (!result.success) {
      toast({
        title: "Failed to decline request",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  // Handle remove partner
  const handleRemovePartner = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to disconnect from your partner? This action cannot be undone and will remove all shared data."
    );
    
    if (!confirmed) return;

    const result = await removePartner();
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      toast({
        title: "Failed to disconnect",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  // Handle save relationship details
  const handleSaveDetails = async () => {
    const success = await updateRelationshipDetails(relationshipStatus, anniversaryDate);
    if (success) {
      setIsEditing(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart size={20} />
              Partner Connection
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              💫 Loading...
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading connection status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show paired state
  if (connectionStatus === 'paired' && couple) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart size={20} />
              Partner Connection
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              💕 Connected
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Connected Status */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center">
                  <Heart className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-pink-800">💕 Successfully Connected!</h4>
                  <p className="text-sm text-pink-700">You are connected with your partner</p>
                </div>
              </div>
              
              {/* Partner Info */}
              <div className="bg-white border border-pink-300 p-4 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center">
                    <Users className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-medium">Your Partner</p>
                    <p className="text-sm text-muted-foreground">Connected & Synced</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Relationship Details */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <Calendar className="text-white" size={16} />
                  </div>
                  <h4 className="font-semibold text-gray-800">Relationship Details</h4>
                </div>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-8 px-3"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status">Relationship Status</Label>
                    <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
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
                    <Label htmlFor="anniversary">Anniversary Date</Label>
                    <Input
                      id="anniversary"
                      type="date"
                      value={anniversaryDate}
                      onChange={(e) => setAnniversaryDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveDetails}
                      disabled={isProcessing}
                      className="flex-1 bg-gradient-secondary hover:opacity-90"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setRelationshipStatus(couple.relationship_status);
                        setAnniversaryDate(couple.anniversary_date || '');
                      }}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white border border-gray-300 p-3 rounded-md">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Status</span>
                      <span className="text-sm text-gray-700 capitalize">{couple.relationship_status}</span>
                    </div>
                  </div>
                  
                  {couple.anniversary_date && (
                    <div className="bg-white border border-gray-300 p-3 rounded-md">
                      <div className="flex flex-col space-y-1">
                        <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Anniversary</span>
                        <span className="text-sm text-gray-700">
                          {new Date(couple.anniversary_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Home size={16} className="mr-2" />
                Go to Dashboard
              </Button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="text-red-600" size={20} />
                <h4 className="font-semibold text-red-800">Danger Zone</h4>
              </div>
              <p className="text-sm text-red-700 mb-3">
                Disconnecting will permanently delete all shared data including memories, sync scores, and relationship insights.
              </p>
              <Button
                variant="outline"
                onClick={handleRemovePartner}
                disabled={isProcessing}
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                <UserX className="h-4 w-4 mr-2" />
                Disconnect from Partner
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show pending state
  if (connectionStatus === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart size={20} />
              Partner Connection
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              ⏳ Pending
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <UserPlus className="text-blue-600" size={20} />
                  Incoming Invitations
                </h3>
                <div className="space-y-3">
                  {incomingRequests.map((request) => (
                    <div key={request.id} className="bg-blue-50 border border-blue-300 p-4 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            Invitation from: {request.requested_email}
                          </p>
                          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Received {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeclineRequest(request.id)}
                            disabled={isProcessing}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Send className="text-yellow-600" size={20} />
                  Pending Invitations
                </h3>
                <div className="space-y-3">
                  {outgoingRequests.map((request) => (
                    <div key={request.id} className="bg-yellow-50 border border-yellow-300 p-4 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-800">
                            Sent to: {request.requested_email}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Sent {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeclineRequest(request.id)}
                          disabled={isProcessing}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Send New Invitation */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <UserPlus className="text-primary" size={20} />
                Send New Invitation
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="partnerEmail">Partner's Email Address</Label>
                  <Input
                    id="partnerEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@example.com"
                    className="mt-1"
                    disabled={isRateLimited}
                  />
                </div>
                <Button 
                  onClick={handleSendRequest}
                  disabled={!email.trim() || !isValidEmail(email) || isInviting || isRateLimited}
                  className="w-full bg-gradient-secondary hover:opacity-90 text-white"
                >
                  {isRateLimited ? (
                    <>
                      <Timer size={16} className="mr-2" />
                      Wait {countdown}s before sending another invitation
                    </>
                  ) : isInviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Send Partner Invitation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show unpaired state (invite partner)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={20} />
            Partner Connection
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            💫 Ready to Connect
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Invite Partner Card */}
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Invite Your Partner</h3>
            <p className="text-muted-foreground mb-6">
              Connect with your partner to start tracking your relationship journey together.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="partnerEmail">Partner's Email Address</Label>
              <Input
                id="partnerEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@example.com"
                className="mt-1"
                disabled={isRateLimited}
              />
              <p className="text-sm text-muted-foreground mt-1">
                We'll send them an invitation to join Love Sync
              </p>
            </div>
            <Button 
              onClick={handleSendRequest}
              disabled={!email.trim() || !isValidEmail(email) || isInviting || isRateLimited}
              className="w-full bg-gradient-secondary hover:opacity-90 text-white shadow-romantic"
            >
              {isRateLimited ? (
                <>
                  <Timer size={16} className="mr-2" />
                  Wait {countdown}s before sending another invitation
                </>
              ) : isInviting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Send Partner Invitation
                </>
              )}
            </Button>
          </div>

          {/* Info Section */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              📧 How It Works
            </h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Your partner will receive an email invitation</li>
              <li>• If they don't have an account, they can sign up with the invitation</li>
              <li>• Once they accept, you'll be automatically connected</li>
              <li>• Start tracking your relationship journey together!</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};