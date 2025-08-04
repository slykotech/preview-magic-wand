import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  discount?: string;
  period: string;
  isPopular?: boolean;
  packageObj?: any; // RevenueCat package object
}

export interface SubscriptionInfo {
  isActive: boolean;
  planName?: string;
  nextBillingDate?: string;
  isLoading: boolean;
}

// Initialize RevenueCat
const initializeRevenueCat = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    // You'll need to set these API keys in your Supabase secrets or environment
    const apiKey = Capacitor.getPlatform() === 'ios' 
      ? 'your_ios_api_key_here' // Replace with your iOS API key
      : 'your_android_api_key_here'; // Replace with your Android API key
    
    await Purchases.configure({
      apiKey,
      appUserID: null, // Optional: set a custom user ID
    });
    
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
};

export const useSubscription = () => {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    isActive: false,
    isLoading: true
  });
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    // Initialize RevenueCat on mount
    initializeRevenueCat();
    
    // Check subscription status
    const checkSubscriptionStatus = async () => {
      try {
        setSubscriptionInfo(prev => ({ ...prev, isLoading: true }));
        
        if (Capacitor.isNativePlatform()) {
          // Use RevenueCat to check subscription status
          try {
            const customerInfo: any = await Purchases.getCustomerInfo();
            const hasActiveSubscription = customerInfo.entitlements?.active && Object.keys(customerInfo.entitlements.active).length > 0;
            
            if (hasActiveSubscription) {
              // Get the first active entitlement
              const activeEntitlement = Object.values(customerInfo.entitlements.active)[0] as any;
              const expirationDate = new Date(activeEntitlement.expirationDate);
              
              setSubscriptionInfo({
                isActive: true,
                planName: activeEntitlement.productIdentifier,
                nextBillingDate: expirationDate.toLocaleDateString(),
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
            // Fallback to localStorage for development
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

    // Load available plans
    const loadPlans = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const offerings: any = await Purchases.getOfferings();
          
          if (offerings.current?.availablePackages) {
            const revenueCatPlans: SubscriptionPlan[] = [];
            
            // Convert RevenueCat packages to our plan format
            offerings.current.availablePackages.forEach((pkg: any) => {
              const plan: SubscriptionPlan = {
                id: pkg.identifier,
                name: pkg.storeProduct?.title || pkg.identifier,
                price: pkg.storeProduct?.priceString || '$0.00',
                period: pkg.packageType,
                packageObj: pkg,
                isPopular: pkg.packageType === 'ANNUAL' // Mark annual as popular
              };
              
              // Add discount text for longer periods
              if (pkg.packageType === 'ANNUAL') {
                plan.discount = '36% off';
              } else if (pkg.packageType === 'SIX_MONTH') {
                plan.discount = '17% off';
              } else if (pkg.packageType === 'THREE_MONTH') {
                plan.discount = '11% off';
              }
              
              revenueCatPlans.push(plan);
            });
            
            setPlans(revenueCatPlans);
          } else {
            // Fallback to mock plans if no offerings
            setPlans([
              {
                id: 'monthly',
                name: 'Monthly',
                price: '$8.99',
                period: 'month'
              },
              {
                id: 'yearly',
                name: 'Yearly',
                price: '$68.99',
                discount: '36% off',
                period: 'year',
                isPopular: true
              }
            ]);
          }
        } catch (error) {
          console.error('Error loading RevenueCat offerings:', error);
          // Fallback to mock plans
          setPlans([
            {
              id: 'monthly',
              name: 'Monthly',
              price: '$8.99',
              period: 'month'
            },
            {
              id: 'yearly',
              name: 'Yearly',
              price: '$68.99',
              discount: '36% off',
              period: 'year',
              isPopular: true
            }
          ]);
        }
      } else {
        // Web fallback plans
        setPlans([
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
        ]);
      }
    };

    checkSubscriptionStatus();
    loadPlans();
  }, []);

  const subscribeToPlan = async (planId: string): Promise<boolean> => {
    try {
      console.log(`Subscribing to plan: ${planId}`);
      
      const plan = plans.find(p => p.id === planId);
      if (!plan) return false;

      if (Capacitor.isNativePlatform()) {
        // Use RevenueCat for in-app purchases
        try {
          if (plan.packageObj) {
            const purchaseResult: any = await Purchases.purchasePackage({ aPackage: plan.packageObj });
            const customerInfo = purchaseResult.customerInfo;
            const hasActiveSubscription = customerInfo.entitlements?.active && Object.keys(customerInfo.entitlements.active).length > 0;
            
            if (hasActiveSubscription) {
              const activeEntitlement = Object.values(customerInfo.entitlements.active)[0] as any;
              const expirationDate = new Date(activeEntitlement.expirationDate);
              
              setSubscriptionInfo({
                isActive: true,
                planName: plan.name,
                nextBillingDate: expirationDate.toLocaleDateString(),
                isLoading: false
              });
              
              return true;
            }
          }
          return false;
        } catch (error) {
          console.error('RevenueCat purchase error:', error);
          // Fallback for development
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
      // Use RevenueCat's customer center or direct to store
      try {
        // RevenueCat Customer Center (if configured)
        // Purchases.showCustomerCenter();
        
        // Or direct to store subscription management
        if (Capacitor.getPlatform() === 'ios') {
          window.open('https://apps.apple.com/account/subscriptions', '_system');
        } else if (Capacitor.getPlatform() === 'android') {
          window.open('https://play.google.com/store/account/subscriptions', '_system');
        }
      } catch (error) {
        console.error('Error opening subscription management:', error);
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
        // Use RevenueCat restore purchases
        try {
          const customerInfo: any = await Purchases.restorePurchases();
          const hasActiveSubscription = customerInfo.entitlements?.active && Object.keys(customerInfo.entitlements.active).length > 0;
          
          if (hasActiveSubscription) {
            const activeEntitlement = Object.values(customerInfo.entitlements.active)[0] as any;
            const expirationDate = new Date(activeEntitlement.expirationDate);
            
            setSubscriptionInfo({
              isActive: true,
              planName: activeEntitlement.productIdentifier,
              nextBillingDate: expirationDate.toLocaleDateString(),
              isLoading: false
            });
          }
          
          return hasActiveSubscription;
        } catch (error) {
          console.error('RevenueCat restore error:', error);
          // Fallback for development
          await new Promise(resolve => setTimeout(resolve, 1000));
          return localStorage.getItem('hasActiveSubscription') === 'true';
        }
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