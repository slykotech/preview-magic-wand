import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import { 
  Users, 
  Edit3, 
  UserX, 
  Send, 
  UserPlus,
  AlertTriangle,
  Check,
  X,
  Clock,
  Mail,
  AlertCircle
} from "lucide-react";
import { usePartnerConnectionV2 } from "@/hooks/usePartnerConnectionV2";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export const PartnerConnectionSection = () => {
  const { user } = useAuth();
  const {
    isProcessing,
    connectionStatus,
    partnerProfile,
    incomingRequests,
    outgoingRequests,
    sendPartnerRequest,
    acceptPartnerRequest,
    declinePartnerRequest,
    cancelOutgoingRequest,
    disconnectFromPartner
  } = usePartnerConnectionV2();

  const [isEditing, setIsEditing] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    exists: boolean;
    available: boolean;
    message: string;
    isChecking: boolean;
    showInviteToJoin: boolean;
  }>({ isValid: false, exists: false, available: false, message: "", isChecking: false, showInviteToJoin: false });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPartnerEmail("");
    setEmailValidation({ isValid: false, exists: false, available: false, message: "", isChecking: false, showInviteToJoin: false });
  };

  const handleSendRequest = async () => {
    if (!partnerEmail.trim() || !emailValidation.isValid || !emailValidation.exists || !emailValidation.available) return;
    
    try {
      // Send connection email first
      const { data, error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          type: 'connect',
          email: partnerEmail
        }
      });

      if (error) {
        console.error('Error sending connection email:', error);
        // Still proceed with the partner request even if email fails
        console.log('Proceeding with partner request despite email error...');
      } else {
        console.log('Connection email sent successfully:', data);
      }

      // Then send the partner request through the existing flow
      const success = await sendPartnerRequest(partnerEmail);
      if (success) {
        setPartnerEmail("");
        setIsEditing(false);
        setEmailValidation({ isValid: false, exists: false, available: false, message: "", isChecking: false, showInviteToJoin: false });
      }
    } catch (error) {
      console.error('Error in send request flow:', error);
      // Still try to send the partner request
      const success = await sendPartnerRequest(partnerEmail);
      if (success) {
        setPartnerEmail("");
        setIsEditing(false);
        setEmailValidation({ isValid: false, exists: false, available: false, message: "", isChecking: false, showInviteToJoin: false });
      }
    }
  };

  const handleInviteToJoin = async () => {
    if (!partnerEmail.trim() || !emailValidation.isValid) return;

    try {
      // Use unified manage-partner-connection function according to documented logic
      const { data, error } = await supabase.functions.invoke('manage-partner-connection', {
        body: {
          action: 'send_request',
          partnerEmail: partnerEmail.trim()
        }
      });

      if (error) {
        console.error('Error sending invitation:', error);
        setEmailValidation(prev => ({ 
          ...prev, 
          message: "Failed to send invitation. Please try again." 
        }));
        return;
      }

      console.log('Invitation sent successfully:', data);
      
      if (data && data.success) {
        setEmailValidation(prev => ({ 
          ...prev, 
          message: data.message || `Invitation sent successfully! ${partnerEmail} will receive an email with instructions.`
        }));
        
        // Clear the form after successful invite
        setTimeout(() => {
          setPartnerEmail("");
          setEmailValidation({ 
            isValid: false, 
            exists: false, 
            available: false, 
            message: "", 
            isChecking: false, 
            showInviteToJoin: false 
          });
        }, 3000);
      } else {
        setEmailValidation(prev => ({ 
          ...prev, 
          message: data?.error || "Failed to send invitation. Please try again." 
        }));
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setEmailValidation(prev => ({ 
        ...prev, 
        message: "Failed to send invitation. Please try again." 
      }));
    }
  };

  // Email validation function
  const validateEmail = async (email: string) => {
    if (!email.trim()) {
      setEmailValidation({ isValid: false, exists: false, available: false, message: "", isChecking: false, showInviteToJoin: false });
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValidation({ 
        isValid: false, 
        exists: false, 
        available: false,
        message: "Please enter a valid email address", 
        isChecking: false,
        showInviteToJoin: false
      });
      return;
    }

    // Email format is valid - now check if user exists
    setEmailValidation(prev => ({ 
      ...prev, 
      isValid: true, 
      isChecking: true, 
      message: "Checking if user exists...",
      showInviteToJoin: false
    }));

    try {
      // Use direct fetch since invoke doesn't support query params well
      const session = await supabase.auth.getSession();
      const response = await fetch(`https://kdbgwmtihgmialrmaecn.supabase.co/functions/v1/check-email-exists?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYmd3bXRpaGdtaWFscm1hZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjA0MzAsImV4cCI6MjA2OTI5NjQzMH0.9tugXDyBuaIaf8fAS0z6cyb-y8Rtykl2zrPxd8bnnOw',
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!result.success) {
        setEmailValidation({
          isValid: true,
          exists: false,
          available: false,
          message: result.error || "Error checking user existence",
          isChecking: false,
          showInviteToJoin: false
        });
        return;
      }

      if (!result.exists) {
        setEmailValidation({
          isValid: true,
          exists: false,
          available: false,
          message: "This email is not registered with Love Sync.",
          isChecking: false,
          showInviteToJoin: true
        });
        return;
      }

      if (!result.available) {
        setEmailValidation({
          isValid: true,
          exists: true,
          available: false,
          message: "This user is already in a couple relationship.",
          isChecking: false,
          showInviteToJoin: false
        });
        return;
      }

      // User exists and is available
      setEmailValidation({
        isValid: true,
        exists: true,
        available: true,
        message: "Ready to invite this user",
        isChecking: false,
        showInviteToJoin: false
      });

    } catch (error) {
      console.error('Error checking email:', error);
      setEmailValidation({
        isValid: true,
        exists: false,
        available: false,
        message: "Error checking user existence",
        isChecking: false,
        showInviteToJoin: false
      });
    }
  };

  // Debounce email validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (partnerEmail) {
        validateEmail(partnerEmail);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [partnerEmail]);

  const handleDisconnectConfirm = async () => {
    const success = await disconnectFromPartner();
    if (success) {
      setShowDisconnectDialog(false);
      setIsEditing(false);
    }
  };

  const handleCancelRequestConfirm = async () => {
    if (selectedRequestId) {
      const success = await cancelOutgoingRequest(selectedRequestId);
      if (success) {
        setShowCancelDialog(false);
        setSelectedRequestId("");
        setIsEditing(false);
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={20} />
              Partner Connection
            </div>
            {(connectionStatus === 'unpaired' || connectionStatus === 'pending') && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="text-xs"
              >
                <Edit3 size={14} className="mr-1" />
                Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Paired State */}
          {connectionStatus === 'paired' && partnerProfile && !isEditing && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Partner Name</Label>
                <p className="text-sm font-medium mt-1">
                  {partnerProfile.display_name || 'Not set'}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Partner User ID</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                  {partnerProfile.user_id}
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="text-red-600" size={20} />
                  <h4 className="font-semibold text-red-800">Disconnect Partner</h4>
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
            </div>
          )}

          {/* Unpaired State */}
          {connectionStatus === 'unpaired' && (
            <>
              {!isEditing ? (
                <div className="text-center py-4">
                  <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No partner connected</p>
                  <p className="text-xs text-muted-foreground mt-1">Click Edit to invite your partner</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="partnerEmail">Partner's Email Address</Label>
                    <Input
                      id="partnerEmail"
                      type="email"
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      placeholder="partner@example.com"
                      className={`mt-1 ${
                        partnerEmail && !emailValidation.isValid && !emailValidation.isChecking 
                          ? 'border-red-500 focus:border-red-500' 
                          : partnerEmail && emailValidation.isValid && emailValidation.exists && emailValidation.available
                          ? 'border-green-500 focus:border-green-500'
                          : partnerEmail && emailValidation.isValid && (!emailValidation.exists || !emailValidation.available)
                          ? 'border-yellow-500 focus:border-yellow-500'
                          : ''
                      }`}
                    />
                    {emailValidation.isChecking && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-primary mr-1"></div>
                        Validating email...
                      </div>
                    )}
                    {partnerEmail && !emailValidation.isChecking && !emailValidation.isValid && emailValidation.message && (
                      <div className="text-xs text-red-600 mt-1 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {emailValidation.message}
                      </div>
                    )}
                    {partnerEmail && emailValidation.isValid && emailValidation.exists && emailValidation.available && emailValidation.message && (
                      <div className="text-xs text-green-600 mt-1 flex items-center">
                        <Check className="w-3 h-3 mr-1" />
                        {emailValidation.message}
                      </div>
                    )}
                    {partnerEmail && emailValidation.isValid && emailValidation.exists && !emailValidation.available && emailValidation.message && (
                      <div className="text-xs text-yellow-600 mt-1 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {emailValidation.message}
                      </div>
                    )}
                    {partnerEmail && emailValidation.isValid && !emailValidation.exists && emailValidation.message && (
                      <div className="text-xs text-yellow-600 mt-1 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {emailValidation.message}
                      </div>
                    )}
                    {emailValidation.showInviteToJoin && (
                      <button
                        onClick={handleInviteToJoin}
                        className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 flex items-center"
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Invite your partner to join Love Sync
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSendRequest}
                      disabled={isProcessing || !partnerEmail.trim() || !emailValidation.isValid || !emailValidation.exists || !emailValidation.available || emailValidation.isChecking}
                      className="flex-1 bg-gradient-secondary hover:opacity-90 text-white"
                      size="sm"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={14} className="mr-1" />
                          Send Invite
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                      disabled={isProcessing}
                    >
                      <X size={14} className="mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Pending State */}
          {connectionStatus === 'pending' && (
            <>
              {!isEditing ? (
                <div className="text-center py-4">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Connection pending</p>
                  <p className="text-xs text-muted-foreground mt-1">Click Edit to manage pending invitations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Outgoing Requests */}
                  {outgoingRequests.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Pending Invitations</h4>
                      <div className="space-y-2">
                        {outgoingRequests.map((request) => (
                          <div key={request.id} className="bg-yellow-50 border border-yellow-300 p-3 rounded-md">
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
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    className="w-full"
                  >
                    Done
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Incoming Requests (always show if exist) */}
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

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        title="Disconnect Partner"
        description="Disconnecting will permanently delete all shared data—including memories, Sync Scores, and relationship insights. This action cannot be undone. Proceed?"
        confirmText="Disconnect"
        cancelText="Keep Connected"
        onConfirm={handleDisconnectConfirm}
        variant="destructive"
        isLoading={isProcessing}
      />

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Invitation"
        description="Are you sure you want to cancel this partner invitation?"
        confirmText="Cancel Invitation"
        onConfirm={handleCancelRequestConfirm}
        isLoading={isProcessing}
      />

      <ConfirmDialog
        open={showDeclineDialog}
        onOpenChange={setShowDeclineDialog}
        title="Decline Invitation"
        description="Are you sure you want to decline this partner invitation?"
        confirmText="Decline"
        onConfirm={handleDeclineRequestConfirm}
        isLoading={isProcessing}
      />
    </>
  );
};