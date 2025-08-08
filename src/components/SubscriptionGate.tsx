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

  // Redirect unauthenticated subscribers to trial flow
  if (!subscriptionInfo.isActive) {
    navigate('/subscription/trial');
    return null;
  }

  // User has active subscription, render children
  return <>{children}</>;
};