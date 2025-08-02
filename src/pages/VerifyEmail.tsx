import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Heart, CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token || !email) {
        setStatus('error');
        setMessage('Invalid verification link. Please check the link and try again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Call the verification function
        const { data, error } = await supabase.functions.invoke('verify-email-and-signup', {
          body: {
            token,
            email
          }
        });

        if (error) throw error;

        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified and account created successfully!');
          
          toast({
            title: "Account created! 🎉",
            description: "Your email has been verified and your account is ready. You can now sign in."
          });
        } else {
          if (data.error.includes('expired')) {
            setStatus('expired');
            setMessage('Your verification link has expired. Please request a new verification email.');
          } else {
            setStatus('error');
            setMessage(data.error || 'Verification failed');
          }
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(error.message || 'An unexpected error occurred during verification');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, email, toast]);

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <Loader2 className="h-8 w-8 text-white animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-8 w-8 text-white" />;
      case 'error':
      case 'expired':
        return <XCircle className="h-8 w-8 text-white" />;
      default:
        return <Mail className="h-8 w-8 text-white" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'verifying':
        return 'Verifying Email...';
      case 'success':
        return 'Email Verified!';
      case 'expired':
        return 'Link Expired';
      case 'error':
        return 'Verification Failed';
      default:
        return 'Email Verification';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'verifying':
        return 'Please wait while we verify your email address and create your account';
      case 'success':
        return 'Your account has been created successfully. You can now sign in.';
      case 'expired':
        return 'This verification link has expired. Please request a new one.';
      case 'error':
        return 'There was an issue verifying your email. Please try again.';
      default:
        return 'Verifying your email address...';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-romance flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-pulse">
            <Heart size={32} className="text-white sm:w-10 sm:h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins text-white mb-2">
            Love Sync
          </h1>
          <p className="text-sm sm:text-base text-white/80 font-inter font-bold px-2">
            Email verification
          </p>
        </div>

        <Card className="shadow-romantic mx-2 sm:mx-0">
          <CardHeader className="text-center">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              status === 'success' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
              status === 'error' || status === 'expired' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
              'bg-gradient-to-br from-primary to-romantic'
            }`}>
              {getStatusIcon()}
            </div>
            <CardTitle className="text-2xl">
              {getStatusTitle()}
            </CardTitle>
            <CardDescription>
              {getStatusDescription()}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {message && (
              <div className={`p-4 rounded-lg text-center ${
                status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                status === 'error' || status === 'expired' ? 'bg-red-50 text-red-800 border border-red-200' :
                'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {message}
              </div>
            )}

            {loading && status === 'verifying' && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">🎉 Welcome to Love Sync!</h4>
                  <p className="text-sm text-green-700">
                    Your account is ready to use. You can now sign in with your credentials and start your relationship journey.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/auth')}
                  className="w-full"
                  size="lg"
                  variant="romantic"
                >
                  Sign In to Your Account
                </Button>
              </div>
            )}

            {status === 'expired' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-800 mb-2">⏰ Link Expired</h4>
                  <p className="text-sm text-amber-700">
                    Verification links expire after 24 hours for security. You can request a new verification email below.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/signup')}
                  className="w-full"
                  size="lg"
                  variant="romantic"
                >
                  Request New Verification Email
                </Button>
                <Button 
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">❌ Verification Failed</h4>
                  <p className="text-sm text-red-700">
                    The verification link may be invalid or have already been used. Please try requesting a new verification email.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/signup')}
                  className="w-full"
                  size="lg"
                  variant="romantic"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            )}

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Need help?{" "}
                <a href="mailto:hi@slyko.tech" className="text-primary font-semibold hover:underline">
                  Contact Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};