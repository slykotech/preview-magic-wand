import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { Card } from '@/components/ui/card';
import { SubscriptionSection } from '@/components/SubscriptionSection';
import { Crown, AlertTriangle } from 'lucide-react';

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
      <Card className="max-w-2xl w-full p-6 bg-white/95 backdrop-blur-sm shadow-xl">
        <div className="space-y-6">
          <div className="text-center space-y-3">
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
                : 'Choose a plan to unlock all premium features with your 7-day free trial.'
              }
            </p>
          </div>

          {/* Subscription Plans Section */}
          <div className="space-y-4">
            <SubscriptionSection />
          </div>
        </div>
      </Card>
    </div>
  );
};