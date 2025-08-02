import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Heart, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const CompleteSignup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'success' | 'error'>('success');
  const [message, setMessage] = useState('');
  const [autoRedirect, setAutoRedirect] = useState(true);

  const email = searchParams.get('email');

  useEffect(() => {
    console.log('CompleteSignup component loaded for:', email);

    // Set success message for standalone signup
    setStatus('success');
    setMessage('🎉 Welcome to Love Sync! Your account has been created successfully. You can now sign in and start exploring the app.');

    // Show success toast
    toast({
      title: "Account Created! 🎉",
      description: "Welcome to Love Sync! You can now sign in and start your journey.",
    });

    // Auto-redirect to sign in after 5 seconds
    if (autoRedirect) {
      const timer = setTimeout(() => {
        navigate('/auth');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [email, navigate, autoRedirect]);

  const handleSignIn = () => {
    navigate('/auth');
  };

  const handleExplore = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-romantic/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-romantic rounded-full flex items-center justify-center mb-4">
            {status === 'success' ? (
              <CheckCircle2 className="h-8 w-8 text-white" />
            ) : (
              <XCircle className="h-8 w-8 text-white" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'success' ? 'Welcome to Love Sync!' : 'Signup Error'}
          </CardTitle>
          <CardDescription>
            {status === 'success' ? 'Your account has been created successfully' : 'There was an issue with your signup'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {message && (
            <div className={`p-4 rounded-lg text-center ${
              status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">🚀 What's Next?</h4>
                <div className="text-sm text-purple-700 space-y-1 text-left">
                  <p>• Sign in with your new credentials</p>
                  <p>• Set up your profile</p>
                  <p>• Connect with your partner</p>
                  <p>• Start your Love Sync journey together!</p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-xs text-blue-700 text-center">
                  You'll be automatically redirected to sign in in 5 seconds, or click the button below.
                </p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleSignIn}
                  className="w-full"
                  variant="romantic"
                  size="lg"
                >
                  Sign In Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Button 
                  onClick={() => {
                    setAutoRedirect(false);
                    handleExplore();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Explore First
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/signup')}
                className="w-full"
                variant="romantic"
              >
                Try Signing Up Again
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                variant="outline"
                className="w-full"
              >
                Go to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteSignup;