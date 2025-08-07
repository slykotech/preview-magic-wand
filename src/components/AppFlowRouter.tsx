import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { useCoupleData } from '@/hooks/useCoupleData';
import { supabase } from '@/integrations/supabase/client';
import SplashScreen from './SplashScreen';
import AppMottoPage from '../pages/AppMotto';
import EnhancedOnboarding from '../pages/EnhancedOnboarding';
import { Auth } from '../pages/Auth';
import { FreeTrialStart } from '../pages/FreeTrialStart';
import { PlanSelection } from '../pages/PlanSelection';
import { PaymentDetails } from '../pages/PaymentDetails';
import { PartnerInvitation } from '../pages/PartnerInvitation';
import { Dashboard } from '../pages/Dashboard';
import { useNavigate, useLocation } from 'react-router-dom';

export type AppFlowStep = 
  | 'splash'
  | 'motto' 
  | 'onboarding'
  | 'auth'
  | 'free-trial'
  | 'plan-selection'
  | 'payment-details'
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

  // Check if user is connected to someone with subscription (partner linking)
  const checkPartnerSubscriptionLink = useCallback(async (): Promise<boolean> => {
    if (!user || !coupleData) return false;

    try {
      // Check if partner has premium access that could cover this user
      const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id;
      
      const { data, error } = await supabase.rpc('get_premium_access_details', {
        p_user_id: partnerId
      });

      if (error) {
        console.error('Error checking partner subscription:', error);
        return false;
      }

      // If partner has access, check if they can share with this user
      const accessDetails = data as any;
      if (accessDetails?.has_access && accessDetails?.plan_type === 'family') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking partner subscription link:', error);
      return false;
    }
  }, [user, coupleData]);

  // Determine the correct step based on user state and completed steps
  useEffect(() => {
    if (authLoading || subscriptionLoading || coupleLoading) return;

    const determineNextStep = async () => {
      const { userData, completedSteps } = flowState;
      let nextStep: AppFlowStep = 'splash';

      // Skip directly to dashboard if bypassing flow (e.g., direct URL access)
      const isDirectAccess = location.pathname !== '/' && 
                            location.pathname !== '/splash' &&
                            location.pathname !== '/motto' &&
                            location.pathname !== '/onboarding' &&
                            location.pathname !== '/auth' &&
                            location.pathname !== '/subscription' &&
                            location.pathname !== '/subscription/trial' &&
                            location.pathname !== '/subscription/plans' &&
                            location.pathname !== '/subscription/payment' &&
                            location.pathname !== '/subscription/partner-invite';

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
        } else {
          // NEW LOGIC: Check subscription requirements after authentication
          
          // Case 1: User already has direct premium access
          if (userData.hasSubscription) {
            if (!userData.hasPartner) {
              nextStep = 'partner-invitation';
            } else {
              nextStep = 'dashboard';
            }
          }
          // Case 2: User has partner connection - check if partner has subscription
          else if (userData.hasPartner) {
            const hasPartnerAccess = await checkPartnerSubscriptionLink();
            if (hasPartnerAccess) {
              // Partner has family plan, skip subscription
              nextStep = 'dashboard';
            } else {
              // Partner doesn't have family plan, user needs own subscription
              nextStep = 'free-trial';
            }
          }
          // Case 3: Fresh user - needs subscription
          else {
            nextStep = 'free-trial';
          }
        }
      }

      if (nextStep !== flowState.currentStep) {
        setFlowState(prev => ({
          ...prev,
          currentStep: nextStep
        }));
      }
    };

    determineNextStep();
  }, [flowState, location.pathname, authLoading, subscriptionLoading, coupleLoading, checkPartnerSubscriptionLink]);

  const completeStep = (step: AppFlowStep, userData?: Partial<AppFlowState['userData']>) => {
    setFlowState(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, step],
      userData: userData ? { ...prev.userData, ...userData } : prev.userData
    }));
  };

  const handleSplashComplete = () => {
    completeStep('splash');
  };

  const handleMottoComplete = () => {
    completeStep('motto', { hasSeenMotto: true });
  };

  const handleOnboardingComplete = () => {
    completeStep('onboarding', { hasCompletedOnboarding: true });
  };

  const handleAuthComplete = () => {
    // Auth completion is handled by useAuth hook
    completeStep('auth');
  };

  const handleFreeTrialComplete = () => {
    completeStep('free-trial');
  };

  const handlePlanSelectionComplete = () => {
    completeStep('plan-selection');
  };

  const handlePaymentDetailsComplete = () => {
    completeStep('payment-details', { hasSubscription: true });
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
    
    case 'free-trial':
      return <FreeTrialStart />;
    
    case 'plan-selection':
      return <PlanSelection />;
    
    case 'payment-details':
      return <PaymentDetails />;
    
    case 'partner-invitation':
      return <PartnerInvitation />;
    
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