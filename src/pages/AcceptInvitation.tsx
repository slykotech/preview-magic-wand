import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Heart, CheckCircle2, XCircle } from 'lucide-react';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'pending' | 'success' | 'error' | 'expired'>('pending');
  const [message, setMessage] = useState('');

  const email = searchParams.get('email');
  const senderId = searchParams.get('sender');
  const invitationType = searchParams.get('type');

  useEffect(() => {
    if (!authLoading && !email && !senderId) {
      setStatus('error');
      setMessage('Invalid invitation link. Please check the link and try again.');
    }
  }, [authLoading, email, senderId]);

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to auth if not logged in
      navigate(`/auth?redirect=/accept-invitation?${searchParams.toString()}`);
      return;
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
             'Love Sync Invitation'}
          </CardTitle>
          <CardDescription>
            {status === 'pending' && !user && 'Please sign in to accept this invitation'}
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

          {status === 'pending' && !user && (
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
              onClick={handleAcceptInvitation}
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