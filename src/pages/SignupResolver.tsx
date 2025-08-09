import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import CompleteSignup from './CompleteSignup';

type FlowType = 'loading' | 'complete' | 'already' | 'error';

const SignupResolver = () => {
  const [searchParams] = useSearchParams();
  const [flow, setFlow] = useState<FlowType>('loading');
  const [error, setError] = useState<string>('');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const resolveSignup = async () => {
      console.log('SignupResolver: Starting signup resolution with params:', {
        token, email
      });

      // Validate required parameters
      if (!token || !email) {
        console.error('Missing required parameters');
        setFlow('error');
        setError('Invalid verification link. Missing required parameters.');
        return;
      }

      try {
        console.log('Verifying signup token...');
        
        // Verify the signup token
        const { data, error: verifyError } = await supabase.functions.invoke('verify-signup-token', {
          body: { token, email }
        });
        
        if (verifyError || !data?.success) {
          console.error('Token verification failed:', verifyError || data?.error);
          // If token invalid/expired, check if the user already has an account
          try {
            const { data: existsData } = await supabase.functions.invoke('check-user-exists', {
              body: { email }
            });
            if (existsData?.exists) {
              console.log('Email already registered. Showing already verified message');
              setFlow('already');
              return;
            }
          } catch (existsErr) {
            console.warn('check-user-exists failed, falling back to generic error', existsErr);
          }
          setFlow('error');
          setError(data?.error || verifyError?.message || 'This verification link is invalid or has expired. Please try signing up again.');
          return;
        }

        console.log('Token verification successful, proceeding to complete signup');
        setFlow('complete');
        // Redirect straight to the app sign-in with prefilled email
        try {
          if (email) {
            window.location.href = `/auth?email=${encodeURIComponent(email)}`;
          } else {
            window.location.href = '/auth';
          }
        } catch {/* noop */}
        
      } catch (error: any) {
        console.error('Error in signup resolution:', error);
        setFlow('error');
        setError(error.message || 'Failed to process signup verification');
      }
    };

    resolveSignup();
  }, [token, email]);

  // Loading state
  if (flow === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-romantic/10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Verifying your signup...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (flow === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-romantic/10 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold text-red-600">Verification Failed</h2>
          <p className="text-gray-600">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.href = '/signup'}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 w-full"
            >
              Try Signing Up Again
            </button>
            <button 
              onClick={() => window.location.href = '/auth'}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:opacity-90 w-full"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Already verified / account exists state
  if (flow === 'already') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-romantic/10 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold text-primary">Account Already Verified</h2>
          <p className="text-gray-600">It looks like this email is already registered. You can sign in to continue.</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.href = `/auth?email=${encodeURIComponent(email || '')}`}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 w-full"
            >
              Go to Sign In
            </button>
            <button 
              onClick={() => window.location.href = '/signup'}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:opacity-90 w-full"
            >
              Use a Different Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Route to complete signup
  if (flow === 'complete') {
    console.log('Rendering CompleteSignup component');
    return <CompleteSignup />;
  }

  return null;
};

export default SignupResolver;