import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crown, Loader2 } from 'lucide-react';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate = ({ children }: SubscriptionGateProps) => {
  const { user, loading: authLoading } = useAuth();
  const { subscriptionInfo } = useSubscription();
  const navigate = useNavigate();

  // Redirect to auth if not authenticated
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  // Show loading while checking authentication and subscription
  if (authLoading || subscriptionInfo.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // Show premium access required if user doesn't have access
  if (!subscriptionInfo.isActive) {
    return (
      <div className="min-h-screen bg-gradient-primary p-4 flex items-center justify-center">
        <Card className="max-w-md w-full p-6 bg-white/95 backdrop-blur-sm shadow-xl">
          <div className="text-center space-y-6">
            <div className="space-y-3">
              <Crown className="w-12 h-12 text-primary mx-auto" />
              <h1 className="text-2xl font-bold">Premium Required</h1>
              <p className="text-muted-foreground">
                Get access to all premium features with your 7-day free trial.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/subscription/trial')}
                className="w-full"
              >
                <Crown className="w-4 h-4 mr-2" />
                Get Premium Access
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Continue with Free
              </Button>
              
              <div className="text-xs text-muted-foreground">
                ✓ 7-day free trial • ✓ Cancel anytime • ✓ No commitment
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // User has active subscription, render children
  return <>{children}</>;
};