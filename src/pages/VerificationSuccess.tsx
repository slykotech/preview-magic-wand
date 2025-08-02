import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Heart, Loader2 } from 'lucide-react';

const VerificationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState<any>(null);

  const success = searchParams.get('success') === 'true';
  const autoConnected = searchParams.get('auto_connected') === 'true';
  const partnerName = searchParams.get('partner_name');
  const message = searchParams.get('message');

  useEffect(() => {
    // Simulate processing time to show the success state
    const timer = setTimeout(() => {
      setLoading(false);
      if (success) {
        setVerificationData({
          autoConnected,
          partnerName,
          message: decodeURIComponent(message || '')
        });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [success, autoConnected, partnerName, message]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-romantic/10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Completing your account setup...</p>
        </div>
      </div>
    );
  }

  if (!success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-romantic/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">Verification Failed</CardTitle>
            <CardDescription>
              There was an issue with your email verification. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-romantic/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-romantic rounded-full flex items-center justify-center mb-4">
            {verificationData?.autoConnected ? (
              <Heart className="h-8 w-8 text-white" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-white" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {verificationData?.autoConnected ? 'Connected Successfully! 💕' : 'Account Created! ✅'}
          </CardTitle>
          <CardDescription>
            {verificationData?.autoConnected 
              ? 'Your account has been created and you\'re now connected with your partner'
              : 'Your account has been verified and created successfully'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {verificationData?.message && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-sm text-green-800 text-center">
                {verificationData.message}
              </p>
            </div>
          )}

          {verificationData?.autoConnected && verificationData?.partnerName && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">🎉 Partnership Created!</h4>
              <p className="text-sm text-purple-700">
                You are now connected with <strong>{verificationData.partnerName}</strong>. Both of your profiles have been automatically paired.
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full"
              size="lg"
            >
              Sign In to Your Account
            </Button>
            
            {verificationData?.autoConnected && (
              <p className="text-xs text-center text-muted-foreground">
                After signing in, you'll see your partner connection in the dashboard.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationSuccess;