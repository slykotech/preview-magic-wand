import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Heart, CheckCircle2, XCircle } from 'lucide-react';

const ExistingUserConnect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');

  const email = searchParams.get('email');
  const senderId = searchParams.get('sender');
  const token = searchParams.get('token'); // For future token validation

  useEffect(() => {
    console.log('ExistingUserConnect component loaded with params:', {
      email, senderId, token, user: !!user, authLoading
    });

    if (!authLoading && !email && !senderId) {
      setStatus('error');
      setMessage('Invalid invitation link. Please check the link and try again.');
    }
  }, [authLoading, email, senderId, token, user]);

  const handleAcceptConnection = async () => {
    if (!user) {
      // Redirect to auth with proper redirect URL that includes all search params
      const redirectUrl = `/invite-resolver?${searchParams.toString()}`;
      navigate(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    if (!email || !senderId) {
      setStatus('error');
      setMessage('Invalid invitation parameters');
      return;
    }

    setProcessing(true);
    try {
      console.log('Accepting connection for existing user...');
      
      // Call the accept invitation function
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: {
          senderUserId: senderId,
          recipientEmail: email,
          type: 'connect'
        }
      });

      if (error) {
        console.error('Accept connection error:', error);
        throw error;
      }

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Connection successful! You are now paired with your partner.');
        
        toast({
          title: "Connection Successful! 💕",
          description: "You are now connected with your partner.",
        });

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to accept connection');
      }
    } catch (error: any) {
      console.error('Error accepting connection:', error);
      setStatus('error');
      setMessage(error.message || 'An unexpected error occurred');
      
      toast({
        title: "Connection Failed",
        description: error.message || 'Please try again or contact support.',
        variant: "destructive",
      });
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
             'Love Sync Connection Request'}
          </CardTitle>
          <CardDescription>
            {status === 'pending' && !user && 'Please sign in to accept this connection request'}
            {status === 'pending' && user && 'Ready to connect with your partner'}
            {status === 'success' && 'You are now connected!'}
            {status === 'error' && 'There was an issue with your connection'}
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

          {status === 'pending' && !user && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800 text-center">
                  You have a connection request waiting! Please sign in to your Love Sync account to accept it.
                </p>
              </div>
              
              <Button 
                onClick={() => {
                  const redirectUrl = `/invite-resolver?${searchParams.toString()}`;
                  navigate(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
                }}
                className="w-full"
                size="lg"
              >
                Sign In to Accept Connection
              </Button>
            </div>
          )}

          {status === 'pending' && user && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 p-4 rounded-lg">
                <p className="text-sm text-pink-800 text-center">
                  Someone wants to connect with you on Love Sync! Click below to accept the connection and start your journey together.
                </p>
              </div>
              
              <Button 
                onClick={handleAcceptConnection}
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
                  'Accept Connection Request'
                )}
              </Button>
            </div>
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
                onClick={() => window.location.reload()}
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

export default ExistingUserConnect;