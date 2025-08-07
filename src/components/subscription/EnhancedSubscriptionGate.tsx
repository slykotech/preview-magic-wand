import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';
import { Navigate } from 'react-router-dom';
import { EnhancedPaywall } from './EnhancedPaywall';
import { SubscriptionPromptModal } from './SubscriptionPromptModal';

interface EnhancedSubscriptionGateProps {
  children: React.ReactNode;
  featureName?: string;
  requireDirectSubscription?: boolean;
  fallbackComponent?: React.ReactNode;
}

export const EnhancedSubscriptionGate: React.FC<EnhancedSubscriptionGateProps> = ({
  children,
  featureName,
  requireDirectSubscription = false,
  fallbackComponent
}) => {
  const { user, loading: authLoading } = useAuth();
  const { premiumAccess, loading: subscriptionLoading, hasPremiumBenefits } = useEnhancedSubscription();
  const { checkFeatureAccess, showPrompt, promptFeature, closePrompt } = useSubscriptionGate();
  const [showPaywall, setShowPaywall] = useState(false);

  // Redirect to auth if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading while checking subscription status
  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin text-4xl">💕</div>
          <p className="text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  // Check if user has adequate access
  const hasAccess = () => {
    // If requiring direct subscription, partner access isn't enough
    if (requireDirectSubscription) {
      return premiumAccess.has_access && premiumAccess.access_type === 'own_subscription';
    }
    
    // Otherwise, any premium access (including partner) is sufficient
    return hasPremiumBenefits();
  };

  // If user doesn't have access, show paywall or fallback
  if (!hasAccess()) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    // Check if we should trigger the subscription gate
    if (!checkFeatureAccess(featureName)) {
      // Show modal prompt
      return (
        <>
          {children}
          {showPrompt && (
            <EnhancedPaywall
              featureName={featureName}
              onClose={closePrompt}
            />
          )}
          {showPaywall && (
            <EnhancedPaywall
              featureName={featureName}
              onClose={() => setShowPaywall(false)}
            />
          )}
        </>
      );
    }

    // Show enhanced paywall directly
    return (
      <EnhancedPaywall
        featureName={featureName}
        isPartnerInvited={premiumAccess.access_type === 'partner_linked' && premiumAccess.has_access}
        onClose={() => {
          // If no fallback, redirect to dashboard
          window.location.href = '/dashboard';
        }}
      />
    );
  }

  // User has access, render children
  return <>{children}</>;
};
