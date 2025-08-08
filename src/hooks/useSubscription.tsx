import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

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

// Initialize RevenueCat with production configuration
const initializeRevenueCat = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('RevenueCat: Not on native platform, using web fallback');
    return false;
  }
  
  try {
    const platform = Capacitor.getPlatform();
    console.log(`RevenueCat: Initializing for platform: ${platform}`);
    
    // Get API key from Supabase edge function
    const response = await fetch('https://kdbgwmtihgmialrmaecn.supabase.co/functions/v1/get-revenuecat-config', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYmd3bXRpaGdtaWFscm1hZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjA0MzAsImV4cCI6MjA2OTI5NjQzMH0.9tugXDyBuaIaf8fAS0z6cyb-y8Rtykl2zrPxd8bnnOw`
      },
      body: JSON.stringify({ platform })
    });
    
    const config = await response.json();
    console.log('RevenueCat config response:', config);
    
    if (!config.configured) {
      console.log('RevenueCat: API keys not configured, using fallback mode');
      return false;
    }
    
    await Purchases.configure({
      apiKey: config.apiKey,
      appUserID: null // Let RevenueCat generate anonymous user ID
    });
    
    console.log('RevenueCat: Successfully initialized with production config');
    return true;
  } catch (error) {
    console.error('RevenueCat: Failed to initialize -', error);
    return false;
  }
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    isActive: false,
    isLoading: true
  });
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isRevenueCatConfigured, setIsRevenueCatConfigured] = useState(false);

  useEffect(() => {
    // Initialize RevenueCat on mount and check configuration
    const init = async () => {
      const configured = await initializeRevenueCat();
      setIsRevenueCatConfigured(configured);
    };
    init();
    
    // Check subscription status
    const checkSubscriptionStatus = async () => {
      try {
        setSubscriptionInfo(prev => ({ ...prev, isLoading: true }));
        
        // First check if user is whitelisted (highest priority)
        if (user?.email) {
          try {
            const { data: whitelistData, error: whitelistError } = await supabase
              .from('admin_whitelist')
              .select('full_access')
              .eq('email', user.email)
              .single();

            if (!whitelistError && whitelistData?.full_access) {
              setSubscriptionInfo({
                isActive: true,
                planName: 'Admin Access',
                nextBillingDate: 'Unlimited',
                isLoading: false
              });
              return;
            }
          } catch (error) {
            console.log('No whitelist entry found, checking normal subscription');
          }
        }
        
        if (Capacitor.isNativePlatform() && isRevenueCatConfigured) {
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
      if (Capacitor.isNativePlatform() && isRevenueCatConfigured) {
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

      if (Capacitor.isNativePlatform() && isRevenueCatConfigured) {
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
      
      if (Capacitor.isNativePlatform() && isRevenueCatConfigured) {
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