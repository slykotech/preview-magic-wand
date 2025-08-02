import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Heart, CheckCircle2, XCircle } from 'lucide-react';

const NewUserInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const email = searchParams.get('email');
  const senderId = searchParams.get('sender');
  const token = searchParams.get('token'); // Secure invitation token

  useEffect(() => {
    console.log('NewUserInvite component loaded with params:', {
      email, senderId, token
    });

    if (!email || !senderId) {
      setStatus('error');
      setMessage('Invalid invitation link. Please check the link and try again.');
    }
  }, [email, senderId, token]);

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
      console.log('Starting new user signup with auto-connection...');
      
      // Use direct signup with auto-connection as per documented logic
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            display_name: `${firstName} ${lastName}`.trim()
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Auto-connect with sender using accept-invitation function
        console.log('User created, now auto-connecting with sender...');
        
        const { data: connectionData, error: connectionError } = await supabase.functions.invoke('accept-invitation', {
          body: {
            senderUserId: senderId,
            recipientEmail: email,
            type: 'invite'
          }
        });

        if (connectionError) {
          console.error('Auto-connection failed:', connectionError);
          setStatus('error');
          setMessage('Account created successfully, but failed to connect with your partner. Please try connecting manually from your dashboard.');
        } else if (connectionData.success) {
          setStatus('success');
          setMessage(`Account created and connected successfully! Welcome to Love Sync. You're now connected with ${connectionData.partnerName}! 💕`);
          
          // Redirect to dashboard after success
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 3000);
        } else {
          setStatus('error');
          setMessage(connectionData.error || 'Failed to connect with your partner. Please try connecting manually from your dashboard.');
        }
      } else {
        setStatus('error');
        setMessage('Failed to create account. Please try again.');
      }
    } catch (error: any) {
      console.error('Error during signup process:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to create account');
      
      toast({
        title: "Signup Failed",
        description: error.message || 'Please try again or contact support.',
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

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
            {status === 'success' ? 'Almost There!' : 
             status === 'error' ? 'Signup Failed' :
             'Join Love Sync!'}
          </CardTitle>
          <CardDescription>
            {status === 'pending' && 'Create your account to connect with your partner'}
            {status === 'success' && 'Check your email to complete the verification process'}
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

          {status === 'pending' && (
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
              
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 mb-1">
                  <span className="font-semibold text-xs">📧 Email Verification Required</span>
                </div>
                <p className="text-xs text-amber-700">
                  After clicking "Create Account", you'll receive a verification email. Once verified, you'll automatically connect with your partner.
                </p>
              </div>
              
              <Button 
                onClick={handleSignup}
                disabled={processing || !firstName || !lastName || !password || !confirmPassword}
                className="w-full"
                size="lg"
                variant="romantic"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Verification Email...
                  </>
                ) : (
                  'Create Account & Send Verification'
                )}
              </Button>
              
              <p className="text-xs text-gray-600 text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-3">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">📧 Check Your Email!</h4>
                <p className="text-sm text-green-700 mb-3">
                  We've sent a verification link to <strong>{email}</strong>
                </p>
                <div className="text-xs text-green-600 space-y-1">
                  <p>• Click the verification link in your email</p>
                  <p>• Your account will be created automatically</p>
                  <p>• You'll then be able to sign in and connect</p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full"
                variant="outline"
              >
                Go to Sign In Page
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Try Signing In Instead
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NewUserInvite;