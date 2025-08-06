import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import NewUserInvite from './NewUserInvite';
import ExistingUserConnect from './ExistingUserConnect';

type FlowType = 'loading' | 'signup' | 'connect' | 'error';

const InviteResolver = () => {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [flow, setFlow] = useState<FlowType>('loading');
  const [error, setError] = useState<string>('');

  const email = searchParams.get('email');
  const senderId = searchParams.get('sender');
  const type = searchParams.get('type');

  useEffect(() => {
    const resolveFlow = async () => {
      console.log('InviteResolver: Starting flow resolution with params:', {
        email, senderId, type, user: user?.id, authLoading
      });

      // Wait for auth to complete loading
      if (authLoading) {
        console.log('Auth still loading, waiting...');
        return;
      }

      // Validate required parameters
      if (!email || !senderId) {
        console.error('Missing required parameters');
        setFlow('error');
        setError('Invalid invitation link. Missing required parameters.');
        return;
      }

      try {
        // If user is authenticated and email matches, go to connect flow
        if (user && user.email?.toLowerCase() === email.toLowerCase()) {
          console.log('User authenticated with matching email, routing to connect flow');
          setFlow('connect');
          return;
        }

        // If user is authenticated but email doesn't match, show error
        if (user && user.email?.toLowerCase() !== email.toLowerCase()) {
          console.log('User authenticated but email mismatch');
          setFlow('error');
          setError(`You're signed in as ${user.email}, but this invitation is for ${email}. Please sign out and sign in with the correct email.`);
          return;
        }

        // If type is explicitly set, use it
        if (type === 'invite') {
          console.log('Type=invite detected, routing to signup flow');
          setFlow('signup');
          return;
        }
        
        if (type === 'connect') {
          console.log('Type=connect detected, routing to connect flow');
          setFlow('connect');
          return;
        }

        // Fallback: Check if user exists by calling a Supabase function
        console.log('No explicit type, checking if user exists...');
        const { data, error: checkError } = await supabase.functions.invoke('check-email-exists', {
          body: { email }
        });
        
        if (checkError) {
          console.error('Error checking user existence:', checkError);
          // Default to connect flow if we can't check
          setFlow('connect');
          return;
        }

        const userExists = data?.exists || false;
        console.log('User existence check result:', userExists);
        
        setFlow(userExists ? 'connect' : 'signup');
        
      } catch (error: any) {
        console.error('Error in flow resolution:', error);
        setFlow('error');
        setError(error.message || 'Failed to process invitation');
      }
    };

    resolveFlow();
  }, [email, senderId, type, user, authLoading]);

  // Loading state
  if (flow === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-romantic/10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Processing your invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (flow === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-romantic/10 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold text-red-600">Invalid Invitation</h2>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Route to appropriate flow
  if (flow === 'signup') {
    console.log('Rendering NewUserInvite component');
    return <NewUserInvite />;
  }

  if (flow === 'connect') {
    console.log('Rendering ExistingUserConnect component');
    return <ExistingUserConnect />;
  }

  return null;
};

export default InviteResolver;