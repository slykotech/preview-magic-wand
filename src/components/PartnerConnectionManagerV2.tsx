import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import { 
  Heart, 
  Users, 
  Mail, 
  Calendar as CalendarIcon, 
  Check, 
  X, 
  Clock, 
  Send, 
  UserX,
  Edit3,
  AlertTriangle,
  UserPlus
} from "lucide-react";
import { usePartnerConnectionV2 } from "@/hooks/usePartnerConnectionV2";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const PartnerConnectionManagerV2 = () => {
  const {
    loading,
    isProcessing,
    connectionStatus,
    coupleData,
    userProfile,
    partnerProfile,
    incomingRequests,
    outgoingRequests,
    sendPartnerRequest,
    acceptPartnerRequest,
    declinePartnerRequest,
    cancelOutgoingRequest,
    disconnectFromPartner,
    updateRelationshipDetails
  } = usePartnerConnectionV2();

  const [partnerEmail, setPartnerEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState(coupleData?.relationship_status || 'dating');
  const [anniversaryDate, setAnniversaryDate] = useState<Date | undefined>(
    coupleData?.anniversary_date ? new Date(coupleData.anniversary_date) : undefined
  );
  
  // Rate limiting state
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [buttonText, setButtonText] = useState("Send Partner Invitation");

  // Confirmation dialog states
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isRateLimited && countdown === 0) {
      setIsRateLimited(false);
      setButtonText("Resend Invitation");
    }
    return () => clearTimeout(timer);
  }, [countdown, isRateLimited]);

  // Handle sending partner request with rate limiting
  const handleSendRequest = async () => {
    if (!partnerEmail.trim() || isRateLimited) return;
    
    // Start rate limiting immediately
    setIsRateLimited(true);
    setCountdown(30);
    
    const success = await sendPartnerRequest(partnerEmail);
    if (success) {
      setPartnerEmail("");
    } else {
      // If failed, reset rate limiting
      setIsRateLimited(false);
      setCountdown(0);
    }
  };

  // Handle relationship details update
  const handleUpdateRelationship = async () => {
    const success = await updateRelationshipDetails(relationshipStatus, anniversaryDate);
    if (success) {
      setEditing(false);
    }
  };

  // Reset form when editing changes
  const handleEditToggle = () => {
    if (!editing) {
      setRelationshipStatus(coupleData?.relationship_status || 'dating');
      setAnniversaryDate(coupleData?.anniversary_date ? new Date(coupleData.anniversary_date) : undefined);
    }
    setEditing(!editing);
  };

  // Confirmation handlers
  const handleDisconnectConfirm = async () => {
    const success = await disconnectFromPartner();
    if (success) {
      setShowDisconnectDialog(false);
    }
  };

  const handleCancelRequestConfirm = async () => {
    if (selectedRequestId) {
      const success = await cancelOutgoingRequest(selectedRequestId);
      if (success) {
        setShowCancelDialog(false);
        setSelectedRequestId("");
      }
    }
  };

  const handleDeclineRequestConfirm = async () => {
    if (selectedRequestId) {
      const success = await declinePartnerRequest(selectedRequestId);
      if (success) {
        setShowDeclineDialog(false);
        setSelectedRequestId("");
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart size={20} />
              Partner Connection
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              connectionStatus === 'paired' && "bg-green-100 text-green-800",
              connectionStatus === 'pending' && "bg-yellow-100 text-yellow-800",
              connectionStatus === 'unpaired' && "bg-gray-100 text-gray-800"
            )}>
              {connectionStatus === 'paired' && '💕 Connected'}
              {connectionStatus === 'pending' && '⏳ Pending'}
              {connectionStatus === 'unpaired' && '💫 Ready to Connect'}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Paired State - Show partner details */}
      {connectionStatus === 'paired' && partnerProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={20} />
                Your Connection
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
                disabled={isProcessing}
              >
                <Edit3 size={16} className="mr-1" />
                {editing ? "Cancel" : "Edit"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Partner Info */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                  <Heart className="text-white" size={16} />
                </div>
                <h4 className="font-semibold text-pink-800">Connected Partner</h4>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white border border-pink-300 p-3 rounded-md">
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-semibold text-pink-800 uppercase tracking-wide">Name</span>
                    <span className="text-sm text-pink-700">{partnerProfile.display_name || 'Not set'}</span>
                  </div>
                </div>
                <div className="bg-white border border-pink-300 p-3 rounded-md">
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-semibold text-pink-800 uppercase tracking-wide">Status</span>
                    <span className="text-sm text-pink-700">Connected & Synced 💕</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Relationship Details */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <CalendarIcon className="text-white" size={16} />
                </div>
                <h4 className="font-semibold text-gray-800">Relationship Details</h4>
              </div>
              
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="relationshipStatus" className="text-sm font-medium text-gray-800">
                      Relationship Status
                    </Label>
                    <Select 
                      value={relationshipStatus} 
                      onValueChange={(value: "dating" | "engaged" | "married" | "partnered") => setRelationshipStatus(value)}
                    >
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
                    <Label className="text-sm font-medium text-gray-800">
                      Anniversary Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full mt-1 justify-start text-left font-normal",
                            !anniversaryDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {anniversaryDate ? format(anniversaryDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={anniversaryDate}
                          onSelect={setAnniversaryDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button
                    onClick={handleUpdateRelationship}
                    disabled={isProcessing}
                    className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-romantic"
                    size="sm"
                  >
                    {isProcessing ? (
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
                      <span className="text-sm text-gray-700 capitalize">{coupleData?.relationship_status}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-300 p-3 rounded-md">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Anniversary</span>
                      <span className="text-sm text-gray-700">
                        {coupleData?.anniversary_date 
                          ? format(new Date(coupleData.anniversary_date), "PPP")
                          : 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Disconnect Button */}
            {!editing && (
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
                  onClick={() => setShowDisconnectDialog(true)}
                  disabled={isProcessing}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  size="sm"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Disconnect from Partner
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite Partner - Show when unpaired */}
      {connectionStatus === 'unpaired' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus size={20} />
              Invite Your Partner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="partnerEmail">Partner's Email Address</Label>
              <Input
                id="partnerEmail"
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="partner@example.com"
                className="mt-1"
                disabled={isRateLimited}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Enter your partner's email to send a connection invitation
              </p>
            </div>
            <Button 
              onClick={handleSendRequest}
              disabled={isProcessing || !partnerEmail.trim() || isRateLimited}
              className="w-full bg-gradient-secondary hover:opacity-90 text-white shadow-romantic"
            >
              {isRateLimited ? (
                `Wait ${countdown}s before sending another invitation`
              ) : isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  {buttonText}
                </>
              )}
            </Button>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h4 className="font-semibold text-amber-800 mb-2">📧 Email Connection Only</h4>
              <p className="text-sm text-amber-700">
                For security, all partner connections must be verified through email. 
                Look for an invitation from Love Story in your inbox (check spam folder too!).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incoming Partner Requests */}
      {incomingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail size={20} />
              Incoming Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <div key={request.id} className="bg-blue-50 border border-blue-300 p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Invitation from: {request.requested_email}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        <Clock className="inline w-3 h-3 mr-1" />
                        Received {format(new Date(request.created_at), "PPP")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptPartnerRequest(request.id)}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequestId(request.id);
                          setShowDeclineDialog(true);
                        }}
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
          </CardContent>
        </Card>
      )}

      {/* Outgoing Partner Requests */}
      {outgoingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outgoingRequests.map((request) => (
                <div key={request.id} className="bg-yellow-50 border border-yellow-300 p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Sent to: {request.requested_email}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        <Clock className="inline w-3 h-3 mr-1" />
                        Sent {format(new Date(request.created_at), "PPP")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequestId(request.id);
                        setShowCancelDialog(true);
                      }}
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
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        title="Disconnect from Partner?"
        description="This will permanently delete all shared data including memories, sync scores, goals, and relationship insights. This action cannot be undone."
        confirmText="Yes, Disconnect"
        onConfirm={handleDisconnectConfirm}
        variant="destructive"
        isLoading={isProcessing}
      />

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Invitation?"
        description="Are you sure you want to cancel this partner invitation? You can send a new one later."
        confirmText="Yes, Cancel Invitation"
        onConfirm={handleCancelRequestConfirm}
        isLoading={isProcessing}
      />

      <ConfirmDialog
        open={showDeclineDialog}
        onOpenChange={setShowDeclineDialog}
        title="Decline Invitation?"
        description="Are you sure you want to decline this partner invitation? They will be notified of your decision."
        confirmText="Yes, Decline"
        onConfirm={handleDeclineRequestConfirm}
        variant="destructive"
        isLoading={isProcessing}
      />
    </div>
  );
};