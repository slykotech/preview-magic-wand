import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { useCoupleData } from '@/hooks/useCoupleData';
import SplashScreen from './SplashScreen';
import AppMottoPage from '../pages/AppMotto';
import EnhancedOnboarding from '../pages/EnhancedOnboarding';
import { Auth } from '../pages/Auth';
import { SubscriptionOnboarding } from '../pages/SubscriptionOnboarding';
import { PartnerConnectionManagerV2 } from './PartnerConnectionManagerV2';
import { Dashboard } from '../pages/Dashboard';
import { useNavigate, useLocation } from 'react-router-dom';

export type AppFlowStep = 
  | 'splash'
  | 'motto' 
  | 'onboarding'
  | 'auth'
  | 'subscription'
  | 'partner-invitation'
  | 'verification'
  | 'dashboard';

interface AppFlowState {
  currentStep: AppFlowStep;
  completedSteps: AppFlowStep[];
  userData: {
    hasSeenMotto: boolean;
    hasCompletedOnboarding: boolean;
    isAuthenticated: boolean;
    hasSubscription: boolean;
    hasPartner: boolean;
    isVerified: boolean;
  };
}

const STORAGE_KEY = 'love-sync-app-flow';

export const AppFlowRouter: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { premiumAccess, loading: subscriptionLoading } = useEnhancedSubscription();
  const { coupleData, loading: coupleLoading } = useCoupleData();
  const navigate = useNavigate();
  const location = useLocation();

  const [flowState, setFlowState] = useState<AppFlowState>(() => {
    // Load from localStorage or set defaults
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall back to defaults if parsing fails
      }
    }
    
    return {
      currentStep: 'splash',
      completedSteps: [],
      userData: {
        hasSeenMotto: false,
        hasCompletedOnboarding: false,
        isAuthenticated: false,
        hasSubscription: false,
        hasPartner: false,
        isVerified: false,
      }
    };
  });

  // Save flow state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flowState));
  }, [flowState]);

  // Update user data based on auth and subscription state
  useEffect(() => {
    if (authLoading || subscriptionLoading || coupleLoading) return;

    setFlowState(prev => ({
      ...prev,
      userData: {
        ...prev.userData,
        isAuthenticated: !!user,
        hasSubscription: premiumAccess.has_access,
        hasPartner: !!coupleData,
        isVerified: !!user?.email_confirmed_at,
      }
    }));
  }, [user, premiumAccess.has_access, coupleData, authLoading, subscriptionLoading, coupleLoading]);

  // Determine the correct step based on user state and completed steps
  useEffect(() => {
    if (authLoading || subscriptionLoading || coupleLoading) return;

    const { userData, completedSteps } = flowState;
    let nextStep: AppFlowStep = 'splash';

    console.log('Flow determination - userData:', userData, 'completedSteps:', completedSteps);

    // Skip directly to dashboard if bypassing flow (e.g., direct URL access)
    const isDirectAccess = location.pathname !== '/' && 
                          location.pathname !== '/splash' &&
                          location.pathname !== '/motto' &&
                          location.pathname !== '/onboarding' &&
                          location.pathname !== '/auth' &&
                          location.pathname !== '/subscription';

    if (isDirectAccess && userData.isAuthenticated) {
      nextStep = 'dashboard';
    } else {
      // Follow the proper flow sequence
      if (!completedSteps.includes('splash')) {
        nextStep = 'splash';
      } else if (!userData.hasSeenMotto && !completedSteps.includes('motto')) {
        nextStep = 'motto';
      } else if (!userData.hasCompletedOnboarding && !completedSteps.includes('onboarding')) {
        nextStep = 'onboarding';
      } else if (!userData.isAuthenticated) {
        nextStep = 'auth';
      } else if (!userData.hasSubscription) {
        nextStep = 'subscription';
      } else if (!userData.hasPartner) {
        nextStep = 'partner-invitation';
      } else if (!userData.isVerified) {
        nextStep = 'verification';
      } else {
        nextStep = 'dashboard';
      }
    }

    console.log('Determined next step:', nextStep, 'current step:', flowState.currentStep);

    if (nextStep !== flowState.currentStep) {
      setFlowState(prev => ({
        ...prev,
        currentStep: nextStep
      }));
    }
  }, [flowState, location.pathname, authLoading, subscriptionLoading, coupleLoading]);

  const completeStep = (step: AppFlowStep, userData?: Partial<AppFlowState['userData']>) => {
    console.log('completeStep called with:', step, userData);
    setFlowState(prev => {
      const newState = {
        ...prev,
        completedSteps: [...prev.completedSteps, step],
        userData: userData ? { ...prev.userData, ...userData } : prev.userData
      };
      console.log('New flow state:', newState);
      return newState;
    });
  };

  const handleSplashComplete = () => {
    completeStep('splash');
  };

  const handleMottoComplete = () => {
    console.log('handleMottoComplete called');
    completeStep('motto', { hasSeenMotto: true });
  };

  const handleOnboardingComplete = () => {
    completeStep('onboarding', { hasCompletedOnboarding: true });
  };

  const handleAuthComplete = () => {
    // Auth completion is handled by useAuth hook
    completeStep('auth');
  };

  const handleSubscriptionComplete = () => {
    // Subscription completion is handled by subscription hook
    completeStep('subscription');
  };

  const handlePartnerInvitationComplete = () => {
    completeStep('partner-invitation');
  };

  const handleVerificationComplete = () => {
    completeStep('verification', { isVerified: true });
  };

  const resetFlow = () => {
    localStorage.removeItem(STORAGE_KEY);
    setFlowState({
      currentStep: 'splash',
      completedSteps: [],
      userData: {
        hasSeenMotto: false,
        hasCompletedOnboarding: false,
        isAuthenticated: false,
        hasSubscription: false,
        hasPartner: false,
        isVerified: false,
      }
    });
  };

  // Show loading spinner while checking auth state
  if (authLoading || subscriptionLoading || coupleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">💕</div>
          <p className="text-muted-foreground">Loading Love Sync...</p>
        </div>
      </div>
    );
  }

  // Render the appropriate step
  switch (flowState.currentStep) {
    case 'splash':
      return <SplashScreen onComplete={handleSplashComplete} />;
    
    case 'motto':
      return (
        <AppMottoPage 
          onNext={handleMottoComplete}
          onBack={() => {/* No back from motto */}}
        />
      );
    
    case 'onboarding':
      // EnhancedOnboarding navigates on its own, so we just render it
      return <EnhancedOnboarding />;
    
    case 'auth':
      // Auth navigates on its own, so we just render it
      return <Auth />;
    
    case 'subscription':
      // SubscriptionOnboarding navigates on its own, so we just render it
      return <SubscriptionOnboarding />;
    
    case 'partner-invitation':
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
          <div className="max-w-2xl mx-auto pt-8">
            <PartnerConnectionManagerV2 />
          </div>
        </div>
      );
    
    case 'verification':
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="text-6xl mb-4">✉️</div>
            <h1 className="text-3xl font-bold text-foreground">Check Your Email</h1>
            <p className="text-muted-foreground">
              We've sent you a verification link. Please check your email and click the link to complete your setup.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Didn't receive the email? Check your spam folder or wait a few minutes.</p>
            </div>
          </div>
        </div>
      );
    
    case 'dashboard':
    default:
      return <Dashboard />;
  }
};

export default AppFlowRouter;