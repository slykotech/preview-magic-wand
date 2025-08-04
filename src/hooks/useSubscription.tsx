import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

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
    // Check subscription status
    const checkSubscriptionStatus = async () => {
      try {
        setSubscriptionInfo(prev => ({ ...prev, isLoading: true }));
        
        if (Capacitor.isNativePlatform()) {
          // On mobile, use RevenueCat to check subscription status
          // This is where you'd integrate RevenueCat SDK
          try {
            // Example RevenueCat integration (requires RevenueCat plugin)
            // const customerInfo = await Purchases.getCustomerInfo();
            // const isPro = typeof customerInfo.entitlements.active["pro"] !== "undefined";
            
            // For now, use localStorage fallback
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
            console.error('RevenueCat error:', error);
            setSubscriptionInfo({ isActive: false, isLoading: false });
          }
        } else {
          // Web fallback - simulate subscription check
          await new Promise(resolve => setTimeout(resolve, 1000));
          
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
      console.log(`Subscribing to plan: ${planId}`);
      
      const plan = plans.find(p => p.id === planId);
      if (!plan) return false;

      if (Capacitor.isNativePlatform()) {
        // On mobile, use RevenueCat for in-app purchases
        try {
          // Example RevenueCat purchase flow:
          // const offerings = await Purchases.getOfferings();
          // const packageToPurchase = offerings.current?.monthly; // or quarterly, etc.
          // const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
          // const isPro = typeof customerInfo.entitlements.active["pro"] !== "undefined";
          
          // For now, simulate successful purchase
          await new Promise(resolve => setTimeout(resolve, 2000));
          
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
          console.error('RevenueCat purchase error:', error);
          return false;
        }
      } else {
        // Web fallback - simulate purchase process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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
      }
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      return false;
    }
  };

  const manageBilling = () => {
    if (Capacitor.isNativePlatform()) {
      // On mobile, deep link to App Store/Play Store subscription management
      if (Capacitor.getPlatform() === 'ios') {
        window.open('https://apps.apple.com/account/subscriptions', '_system');
      } else if (Capacitor.getPlatform() === 'android') {
        window.open('https://play.google.com/store/account/subscriptions', '_system');
      }
    } else {
      // Web fallback
      window.open('https://support.apple.com/en-us/HT202039', '_blank');
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      console.log('Restoring purchases...');
      
      if (Capacitor.isNativePlatform()) {
        // On mobile, use RevenueCat restore purchases
        // const customerInfo = await Purchases.restorePurchases();
        // const isPro = typeof customerInfo.entitlements.active["pro"] !== "undefined";
        // return isPro;
        
        // For now, check localStorage
        await new Promise(resolve => setTimeout(resolve, 1000));
        return localStorage.getItem('hasActiveSubscription') === 'true';
      } else {
        // Web fallback
        await new Promise(resolve => setTimeout(resolve, 1000));
        return localStorage.getItem('hasActiveSubscription') === 'true';
      }
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