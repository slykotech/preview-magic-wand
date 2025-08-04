import { useState, useEffect } from 'react';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  discount?: string;
  period: string;
  isPopular?: boolean;
}

export interface SubscriptionInfo {
  isActive: boolean;
  planName?: string;
  nextBillingDate?: string;
  isLoading: boolean;
}

// Mock subscription plans based on the prompt
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$8.99',
    period: 'month'
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    price: '$23.99',
    discount: '11% off',
    period: '3 months'
  },
  {
    id: 'half_yearly',
    name: 'Half-Yearly',
    price: '$44.99',
    discount: '17% off',
    period: '6 months'
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$68.99',
    discount: '36% off',
    period: 'year',
    isPopular: true
  }
];

export const useSubscription = () => {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    isActive: false,
    isLoading: true
  });
  const [plans] = useState(SUBSCRIPTION_PLANS);

  useEffect(() => {
    // Simulate checking subscription status
    // In a real app, this would check RevenueCat or your backend
    const checkSubscriptionStatus = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock subscription check - in real app, check with RevenueCat
        const hasActiveSubscription = localStorage.getItem('hasActiveSubscription') === 'true';
        const activePlan = localStorage.getItem('activePlan');
        
        if (hasActiveSubscription && activePlan) {
          const nextBilling = new Date();
          nextBilling.setMonth(nextBilling.getMonth() + 1);
          
          setSubscriptionInfo({
            isActive: true,
            planName: activePlan,
            nextBillingDate: nextBilling.toLocaleDateString(),
            isLoading: false
          });
        } else {
          setSubscriptionInfo({
            isActive: false,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        setSubscriptionInfo({
          isActive: false,
          isLoading: false
        });
      }
    };

    checkSubscriptionStatus();
  }, []);

  const subscribeToPlan = async (planId: string): Promise<boolean> => {
    try {
      // In a real app, this would trigger RevenueCat purchase flow
      // For now, simulate successful purchase
      console.log(`Subscribing to plan: ${planId}`);
      
      const plan = plans.find(p => p.id === planId);
      if (!plan) return false;

      // Simulate purchase process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful subscription
      localStorage.setItem('hasActiveSubscription', 'true');
      localStorage.setItem('activePlan', plan.name);
      
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      
      setSubscriptionInfo({
        isActive: true,
        planName: plan.name,
        nextBillingDate: nextBilling.toLocaleDateString(),
        isLoading: false
      });
      
      return true;
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      return false;
    }
  };

  const manageBilling = () => {
    // In a real app, this would open App Store/Play Store subscription management
    // For web, this might redirect to Stripe customer portal
    console.log('Opening subscription management...');
    window.open('https://support.apple.com/en-us/HT202039', '_blank');
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      // In a real app, this would call RevenueCat.restorePurchases()
      console.log('Restoring purchases...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock restore - check if there's a stored subscription
      const hasActiveSubscription = localStorage.getItem('hasActiveSubscription') === 'true';
      return hasActiveSubscription;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    }
  };

  return {
    subscriptionInfo,
    plans,
    subscribeToPlan,
    manageBilling,
    restorePurchases
  };
};