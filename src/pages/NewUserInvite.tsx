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

    if (!email || !senderId || !token) {
      setStatus('error');
      setMessage('Invalid invitation link. Please check the link and try again.');
    }
  }, [email, senderId, token]);

  const handleSignup = async () => {
    if (!email || !senderId || !token || !firstName || !lastName || !password) {
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
      console.log('Starting new user signup process...');
      
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
        console.log('User created successfully, processing invitation token...');
        
        // Accept the signup invitation using the secure token
        const { data, error } = await supabase.rpc('accept_signup_invitation', {
          p_invitation_token: token,
          p_new_user_id: authData.user.id
        });

        if (error) {
          console.error('Token processing error:', error);
          throw error;
        }

        const invitationResult = data as any;
        if (invitationResult && invitationResult.success) {
          setStatus('success');
          setMessage('Account created and connected successfully! Welcome to Love Sync.');
          
          toast({
            title: "Welcome to Love Sync! 💕",
            description: "Your account has been created and you're now connected with your partner.",
          });
        } else {
          throw new Error(invitationResult?.error || 'Failed to process invitation token');
        }
      } else {
        throw new Error('User creation failed');
      }
    } catch (error: any) {
      console.error('Error during signup and connect:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to create account and connect');
      
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
            {status === 'success' ? 'Welcome to Love Sync!' : 
             status === 'error' ? 'Signup Failed' :
             'Join Love Sync!'}
          </CardTitle>
          <CardDescription>
            {status === 'pending' && 'Create your account to connect with your partner'}
            {status === 'success' && 'You are now connected and ready to start your journey!'}
            {status === 'error' && 'There was an issue creating your account'}
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
              
              <Button 
                onClick={handleSignup}
                disabled={processing || !firstName || !lastName || !password || !confirmPassword || !token}
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

          {status === 'success' && (
            <div className="text-center space-y-3">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">🎉 Welcome to Love Sync!</h4>
                <p className="text-sm text-green-700">
                  Your account has been created and you're automatically connected with your partner. You can now start your Love Sync journey together!
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