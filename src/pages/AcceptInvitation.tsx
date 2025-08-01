import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Heart, CheckCircle2, XCircle } from 'lucide-react';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'pending' | 'success' | 'error' | 'expired'>('pending');
  const [message, setMessage] = useState('');
  
  // New user signup states
  const [showSignup, setShowSignup] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const email = searchParams.get('email');
  const senderId = searchParams.get('sender');
  const invitationType = searchParams.get('type');

  useEffect(() => {
    if (!authLoading && !email && !senderId) {
      setStatus('error');
      setMessage('Invalid invitation link. Please check the link and try again.');
    }
    
    // For new user invitations (type=invite), show signup form if not authenticated
    if (!authLoading && invitationType === 'invite' && !user && email && senderId) {
      setShowSignup(true);
    }
  }, [authLoading, email, senderId, invitationType, user]);

  const handleSignup = async () => {
    if (!email || !senderId || !firstName || !lastName || !password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      // Sign up the new user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            display_name: `${firstName} ${lastName}`.trim(),
          }
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        throw signUpError;
      }

      if (authData.user) {
        // Wait a moment for the session to be fully established
        setTimeout(async () => {
          try {
            await handleAcceptInvitation(authData.user);
          } catch (error) {
            console.error('Error during auto-connection:', error);
            setStatus('error');
            setMessage('Account created successfully, but failed to connect automatically. Please try connecting manually.');
          }
        }, 1000);
      } else {
        throw new Error('User creation failed');
      }
    } catch (error: any) {
      console.error('Error during signup:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to create account and connect');
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptInvitation = async (userOverride?: any) => {
    const currentUser = userOverride || user;
    
    if (!currentUser) {
      // For existing users, redirect to auth if not logged in
      if (invitationType === 'connect') {
        navigate(`/auth?redirect=/accept-invitation?${searchParams.toString()}`);
        return;
      } else {
        // For new users, this shouldn't happen as we handle signup above
        setStatus('error');
        setMessage('Authentication required');
        return;
      }
    }

    if (!email || !senderId) {
      setStatus('error');
      setMessage('Invalid invitation parameters');
      return;
    }

    setProcessing(true);
    try {
      // Call the accept invitation function
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: {
          senderUserId: senderId,
          recipientEmail: email,
          type: invitationType
        }
      });

      if (error) {
        console.error('Accept invitation error:', error);
        throw error;
      }

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Connection successful! You are now paired with your partner.');
        
        // Show success toast
        toast({
          title: "Connection Successful! 💕",
          description: "You are now connected with your partner. Redirecting to dashboard...",
        });

        // Stay on confirmation page - don't auto redirect
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to accept invitation');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
      setMessage(error.message || 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-romantic/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-romantic rounded-full flex items-center justify-center mb-4">
            {status === 'success' ? (
              <CheckCircle2 className="h-8 w-8 text-white" />
            ) : status === 'error' ? (
              <XCircle className="h-8 w-8 text-white" />
            ) : (
              <Heart className="h-8 w-8 text-white" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'success' ? 'Connection Successful!' : 
             status === 'error' ? 'Connection Failed' :
             showSignup ? 'Join Love Sync!' :
             'Love Sync Invitation'}
          </CardTitle>
          <CardDescription>
            {showSignup && 'Create your account to connect with your partner'}
            {status === 'pending' && !user && !showSignup && 'Please sign in to accept this invitation'}
            {status === 'pending' && user && 'Ready to connect with your partner'}
            {status === 'success' && 'You are now connected!'}
            {status === 'error' && 'There was an issue with your invitation'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {message && (
            <div className={`p-4 rounded-lg text-center ${
              status === 'success' ? 'bg-green-50 text-green-800' :
              status === 'error' ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {message}
            </div>
          )}

          {showSignup && status === 'pending' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 p-4 rounded-lg">
                <p className="text-sm text-purple-800 text-center">
                  You've been invited to join Love Sync! Fill out the details below to create your account and automatically connect with your partner.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email || ''} 
                    disabled 
                    className="bg-gray-50" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      disabled={processing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      disabled={processing}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="password">Create Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a secure password"
                    disabled={processing}
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    disabled={processing}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSignup}
                disabled={processing || !firstName || !lastName || !password || !confirmPassword}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account & Connecting...
                  </>
                ) : (
                  'Create Account & Connect'
                )}
              </Button>
              
              <p className="text-xs text-gray-600 text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}

          {status === 'pending' && !user && !showSignup && (
            <Button 
              onClick={() => navigate(`/auth?redirect=/accept-invitation?${searchParams.toString()}`)}
              className="w-full"
              size="lg"
            >
              Sign In to Accept Invitation
            </Button>
          )}

          {status === 'pending' && user && (
            <Button 
              onClick={() => handleAcceptInvitation()}
              disabled={processing}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Accept Connection'
              )}
            </Button>
          )}

          {status === 'success' && (
            <div className="text-center space-y-3">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">🎉 Connection Successful!</h4>
                <p className="text-sm text-green-700">
                  You and your partner are now connected. Both of your profiles have been automatically updated to "Paired" status.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="w-full"
                size="lg"
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;