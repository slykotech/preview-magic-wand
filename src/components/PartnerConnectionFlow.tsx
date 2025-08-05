import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Heart, 
  Users, 
  Mail, 
  Send, 
  UserX,
  AlertTriangle,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Home,
  UserMinus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCoupleData } from "@/hooks/useCoupleData";

type EmailCheckStatus = 'idle' | 'checking' | 'exists_available' | 'exists_unavailable' | 'not_exists';
type ConnectionStep = 'input' | 'validation' | 'sending' | 'success';

interface EmailCheckResult {
  success: boolean;
  exists: boolean;
  available?: boolean;
  status?: string;
  message?: string;
  error?: string;
}

export const PartnerConnectionFlow = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { coupleData, userProfile, partnerProfile, getPartnerDisplayName, refreshCoupleData, loading } = useCoupleData();
  
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailCheckStatus>('idle');
  const [currentStep, setCurrentStep] = useState<ConnectionStep>('input');
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState<EmailCheckResult | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  // Reset state when email changes
  useEffect(() => {
    if (email.trim() === '') {
      setEmailStatus('idle');
      setCurrentStep('input');
      setEmailCheckResult(null);
    }
  }, [email]);

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if email exists and user's availability
  const checkEmailAvailability = async () => {
    if (!email.trim() || !isValidEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setEmailStatus('checking');
    setCurrentStep('validation');

    try {
      const { data, error } = await supabase.functions.invoke('check-email-exists', {
        body: { email: email.trim() }
      });

      if (error) throw error;

      const result = data as EmailCheckResult;
      setEmailCheckResult(result);

      if (result.success) {
        if (result.exists) {
          if (result.available) {
            setEmailStatus('exists_available');
          } else {
            setEmailStatus('exists_unavailable');
          }
        } else {
          setEmailStatus('not_exists');
        }
      } else {
        throw new Error(result.error || 'Failed to check email');
      }
    } catch (error: any) {
      console.error('Error checking email:', error);
      toast({
        title: "Error checking email",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setEmailStatus('idle');
      setCurrentStep('input');
    }
  };

  // Send invitation based on user existence
  const sendInvitation = async () => {
    if (!emailCheckResult) return;

    setIsProcessing(true);
    setCurrentStep('sending');

    try {
      const { data, error } = await supabase.functions.invoke('partner-connection-v2', {
        body: {
          action: 'send_request',
          email: email.trim()
        }
      });

      if (error) throw error;

      if (data.success) {
        setCurrentStep('success');
        toast({
          title: "Invitation sent! 💕",
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Failed to send invitation');
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setCurrentStep('validation');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset flow to start over
  const resetFlow = () => {
    setEmail("");
    setEmailStatus('idle');
    setCurrentStep('input');
    setEmailCheckResult(null);
    setIsProcessing(false);
  };

  // Disconnect from partner
  const disconnectPartner = async () => {
    if (!coupleData) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to disconnect from your partner? This action cannot be undone and will remove all shared data."
    );
    
    if (!confirmed) return;

    setIsDisconnecting(true);
    try {
      console.log('Starting disconnect process for couple:', coupleData.id);
      
      const { error } = await supabase
        .from('couples')
        .delete()
        .eq('id', coupleData.id);

      if (error) {
        console.error('Database error during disconnect:', error);
        throw error;
      }

      console.log('Successfully disconnected from partner');
      
      // Clear the couple data immediately
      refreshCoupleData();
      
      toast({
        title: "Disconnected successfully",
        description: "You have been disconnected from your partner. Redirecting...",
      });

      // Wait a moment for the toast to show, then navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);

    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Failed to disconnect",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Render different states based on current step
  const renderContent = () => {
    switch (currentStep) {
      case 'input':
        return (
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
                disabled={emailStatus === 'checking'}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Enter your partner's email to check their availability
              </p>
            </div>
            <Button 
              onClick={checkEmailAvailability}
              disabled={!email.trim() || !isValidEmail(email) || emailStatus === 'checking'}
              className="w-full bg-gradient-secondary hover:opacity-90 text-white"
            >
              {emailStatus === 'checking' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Checking email...
                </>
              ) : (
                <>
                  <UserPlus size={16} className="mr-2" />
                  Check Email Availability
                </>
              )}
            </Button>
          </div>
        );

      case 'validation':
        if (!emailCheckResult) return null;

        return (
          <div className="space-y-6">
            {/* Email Status Display */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    emailStatus === 'exists_available' ? 'bg-green-100' :
                    emailStatus === 'exists_unavailable' ? 'bg-red-100' :
                    'bg-yellow-100'
                  }`}>
                    {emailStatus === 'exists_available' ? (
                      <CheckCircle className="text-green-600" size={20} />
                    ) : emailStatus === 'exists_unavailable' ? (
                      <XCircle className="text-red-600" size={20} />
                    ) : (
                      <UserPlus className="text-yellow-600" size={20} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{email}</p>
                    <p className="text-sm text-muted-foreground">
                      {emailCheckResult.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Condition A: Email exists and available */}
              {emailStatus === 'exists_available' && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="text-green-600" size={20} />
                    <h4 className="font-semibold text-green-800">✅ User is a Love Sync member</h4>
                  </div>
                  <p className="text-sm text-green-700 mb-4">
                    This user is already registered on Love Sync and is available to connect. 
                    Send them an invitation request?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={sendInvitation}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Send size={16} className="mr-2" />
                      Send Invitation
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetFlow}
                      disabled={isProcessing}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}

              {/* Condition A: Email exists but unavailable */}
              {emailStatus === 'exists_unavailable' && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <XCircle className="text-red-600" size={20} />
                    <h4 className="font-semibold text-red-800">❌ User is already connected</h4>
                  </div>
                  <p className="text-sm text-red-700 mb-4">
                    This user is already connected with another partner. You cannot send a connection request.
                  </p>
                  <Button
                    variant="outline"
                    onClick={resetFlow}
                    className="w-full"
                  >
                    Try Different Email
                  </Button>
                </div>
              )}

              {/* Condition B: Email doesn't exist */}
              {emailStatus === 'not_exists' && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <UserPlus className="text-yellow-600" size={20} />
                    <h4 className="font-semibold text-yellow-800">⚠️ Email not registered on Love Sync</h4>
                  </div>
                  <p className="text-sm text-yellow-700 mb-4">
                    This email is not registered on Love Sync. Invite them to join?
                    They'll receive a signup link and will be automatically connected after registration.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={sendInvitation}
                      disabled={isProcessing}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <Send size={16} className="mr-2" />
                      Send Invitation
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetFlow}
                      disabled={isProcessing}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'sending':
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Sending Invitation...</h3>
            <p className="text-muted-foreground">
              Please wait while we send the invitation to your partner.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8 space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                🎉 Invitation Sent Successfully!
              </h3>
              <p className="text-green-700 mb-4">
                {emailCheckResult?.exists
                  ? "Your partner will receive an email with a verification link. When they click it, you'll be automatically connected!"
                  : "Your partner will receive an email with a signup link. After they register, you'll be automatically connected!"
                }
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-primary hover:bg-primary/90"
              >
                <Home size={16} className="mr-2" />
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={resetFlow}
              >
                Send Another Invitation
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Important:</strong> Do not auto-redirect to the dashboard. 
                Your partner needs to complete their action first.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart size={20} />
            Partner Connection
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

  // Show connected state if user has a partner
  if (coupleData && partnerProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart size={20} />
            Partner Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Connected Status */}
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">💕 Successfully Connected!</h4>
                  <p className="text-sm text-green-700">You are connected with your partner</p>
                </div>
              </div>
              
              {/* Partner Info */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <Users className="text-white" size={20} />
                </div>
                <div>
                  <p className="font-medium">{getPartnerDisplayName()}</p>
                  <p className="text-sm text-muted-foreground">Your Partner</p>
                </div>
              </div>
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
              
              <Button
                variant="outline"
                onClick={disconnectPartner}
                disabled={isDisconnecting}
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                {isDisconnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <UserMinus size={16} className="mr-2" />
                    Disconnect Partner
                  </>
                )}
              </Button>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-amber-600" size={16} />
                <h4 className="font-semibold text-amber-800">Important</h4>
              </div>
              <p className="text-sm text-amber-700">
                Disconnecting will remove all shared data and cannot be undone. 
                You'll need to send a new invitation to reconnect.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show invitation flow if not connected
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart size={20} />
          Partner Connection
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
        
        {/* Info Section */}
        {currentStep === 'input' && (
          <div className="mt-6 bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-800 mb-2">📧 Email Connection Only</h4>
            <p className="text-sm text-amber-700">
              For security, all partner connections must be verified through email. 
              Look for an invitation from Love Sync in your inbox (check spam folder too!).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};