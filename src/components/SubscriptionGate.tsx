import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Clock, CreditCard, AlertTriangle } from 'lucide-react';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate = ({ children }: SubscriptionGateProps) => {
  const { user, loading: authLoading } = useAuth();
  const { premiumAccess, loading: subscriptionLoading } = useEnhancedSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth and subscription
  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Crown className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  // User is not authenticated
  if (!user) {
    return null; // Will redirect to auth
  }

  // User has premium access - show app
  if (premiumAccess.has_access) {
    return <>{children}</>;
  }

  // User needs to subscribe
  return (
    <div className="min-h-screen bg-gradient-primary p-4 flex items-center justify-center">
      <Card className="max-w-md w-full p-6 bg-white/95 backdrop-blur-sm shadow-xl">
        <div className="text-center space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              {premiumAccess.status === 'expired' ? (
                <AlertTriangle className="w-12 h-12 text-orange-500" />
              ) : (
                <Crown className="w-12 h-12 text-primary" />
              )}
            </div>
            
            <h1 className="text-2xl font-bold">
              {premiumAccess.status === 'expired' ? 'Subscription Expired' : 'Premium Required'}
            </h1>
            
            <p className="text-muted-foreground">
              {premiumAccess.status === 'expired' 
                ? 'Your subscription has expired. Renew now to continue enjoying all premium features.'
                : 'Get access to all premium features with your 7-day free trial.'
              }
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/subscription')}
              className="w-full bg-gradient-primary text-white hover:shadow-glow transition-all"
              size="lg"
            >
              <Crown className="w-4 h-4 mr-2" />
              {premiumAccess.status === 'expired' ? 'Renew Subscription' : 'Start Free Trial'}
            </Button>
            
            <div className="text-xs text-muted-foreground">
              ✓ 7-day free trial • ✓ Cancel anytime • ✓ No commitment
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};