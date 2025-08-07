import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface PremiumAccessDetails {
  has_access: boolean;
  access_type?: 'own_subscription' | 'partner_linked';
  status?: 'trial' | 'active' | 'cancelled' | 'expired' | 'billing_issue';
  plan_type?: 'premium' | 'family';
  trial_end_date?: string;
  current_period_end?: string;
  subscription_id?: string;
  granted_by?: string;
  billing_issue?: boolean;
  grace_period_end?: string;
}

interface SubscriptionData {
  id: string;
  status: 'trial' | 'active' | 'cancelled' | 'expired' | 'billing_issue';
  plan_type: 'premium' | 'family';
  trial_start_date?: string;
  trial_end_date?: string;
  current_period_end?: string;
  auto_charge_date?: string;
  card_last_four?: string;
  card_brand?: string;
  billing_issue?: boolean;
  grace_period_end?: string;
  last_synced_at?: string;
  revenue_cat_customer_id?: string;
}

interface SubscriptionNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_required?: boolean;
}

interface NetworkRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: NetworkRetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000
};

export const useEnhancedSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccessDetails>({ has_access: false });
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [notifications, setNotifications] = useState<SubscriptionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

  // Enhanced network retry logic
  const retryWithBackoff = async <T,>(
    operation: () => Promise<T>,
    config: NetworkRetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        setNetworkError(null); // Clear error on success
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Operation failed, attempt ${attempt + 1}/${config.maxRetries + 1}:`, error);
        
        if (attempt < config.maxRetries) {
          const delay = Math.min(
            config.baseDelay * Math.pow(2, attempt),
            config.maxDelay
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    setNetworkError(lastError!.message);
    throw lastError!;
  };

  // Multi-device subscription sync
  const syncSubscriptionAcrossDevices = useCallback(async () => {
    if (!user) return;

    try {
      setLastSyncAttempt(new Date());
      
      // Get RevenueCat status if on native platform
      let revenueCatStatus = null;
      if (Capacitor.isNativePlatform()) {
        try {
          const customerInfo: any = await Purchases.getCustomerInfo();
          revenueCatStatus = {
            hasActiveSubscription: customerInfo.entitlements?.active && Object.keys(customerInfo.entitlements.active).length > 0,
            customerInfo
          };
        } catch (error) {
          console.warn('Failed to get RevenueCat status:', error);
        }
      }

      // Sync with database
      const { data: syncResult, error } = await supabase.rpc('sync_subscription_status', {
        p_user_id: user.id,
        p_revenue_cat_status: revenueCatStatus,
        p_device_id: await getDeviceId()
      }) as { data: any; error: any };

      if (error) throw error;

      if (syncResult?.status_changed) {
        await refreshSubscriptionData();
        
        toast({
          title: 'Subscription Synced',
          description: 'Your subscription status has been updated across devices.'
        });
      }

    } catch (error) {
      console.error('Failed to sync subscription:', error);
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: 'Could not sync subscription status. Please check your connection.'
      });
    }
  }, [user]);

  // Get unique device identifier
  const getDeviceId = async (): Promise<string> => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Use Capacitor Device API if available
        const deviceIdModule = await import('@capacitor/device').catch(() => null);
        if (deviceIdModule) {
          const info = await deviceIdModule.Device.getId();
          return info.identifier;
        }
      } catch {
        // Fallback to timestamp if device API fails
      }
    }
    // Fallback for web or if device API not available
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'web-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  // Check for billing issues and payment recovery
  const checkBillingStatus = useCallback(async () => {
    if (!user || !subscription) return;

    try {
      const { data, error } = await retryWithBackoff(async () => {
        const response = await supabase.rpc('check_billing_status', {
          p_user_id: user.id,
          p_subscription_id: subscription.id
        }) as { data: any; error: any };
        if (response.error) throw new Error(response.error.message);
        return response;
      });

      if (data?.billing_issue) {
        setPremiumAccess(prev => ({
          ...prev,
          billing_issue: true,
          grace_period_end: data.grace_period_end
        }));

        // Show payment recovery notification
        if (data.action_required) {
          toast({
            variant: 'destructive',
            title: 'Payment Issue Detected',
            description: 'Please update your payment method to continue using premium features.',
            duration: 8000
          });

          // Create notification in database
          await supabase.from('subscription_notifications').insert({
            user_id: user.id,
            notification_type: 'billing_issue',
            title: 'Payment Method Needs Update',
            message: `Your payment method failed. Please update it by ${new Date(data.grace_period_end).toLocaleDateString()} to avoid service interruption.`,
            action_required: true
          });
        }
      }
    } catch (error) {
      console.error('Failed to check billing status:', error);
    }
  }, [user, subscription]);

  // Enhanced premium access check with retry logic
  const checkPremiumAccess = useCallback(async () => {
    if (!user) {
      setPremiumAccess({ has_access: false });
      setLoading(false);
      return;
    }

    try {
      // First check if user is whitelisted (highest priority)
      if (user.email) {
        try {
          const { data: whitelistData, error: whitelistError } = await supabase
            .from('admin_whitelist')
            .select('full_access, notes')
            .eq('email', user.email)
            .single();

          if (!whitelistError && whitelistData?.full_access) {
            setPremiumAccess({
              has_access: true,
              access_type: 'own_subscription',
              status: 'active',
              plan_type: 'premium'
            });
            setLoading(false);
            return;
          }
        } catch (error) {
          console.log('No whitelist entry found, checking normal subscription');
        }
      }

      const { data, error } = await retryWithBackoff(async () => {
        const response = await supabase.rpc('get_premium_access_details', {
          p_user_id: user.id
        }) as { data: any; error: any };
        if (response.error) throw new Error(response.error.message);
        return response;
      });

      const accessDetails = (data as any) || { has_access: false };
      setPremiumAccess(accessDetails);
      
      // Check billing status if user has access
      if (accessDetails.has_access) {
        await checkBillingStatus();
      }
    } catch (error) {
      console.error('Error checking premium access:', error);
      setPremiumAccess({ has_access: false });
      
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Unable to verify subscription status. Some features may be limited.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [user, checkBillingStatus]);

  // Enhanced subscription fetch with network handling
  const fetchSubscription = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await retryWithBackoff(async () => {
        const response = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (response.error) throw new Error(response.error.message);
        return response;
      });

      setSubscription(data as SubscriptionData);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  }, [user]);

  // Enhanced notifications fetch
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await retryWithBackoff(async () => {
        const response = await supabase
          .from('subscription_notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (response.error) throw new Error(response.error.message);
        return response;
      });

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  // Refresh all subscription data
  const refreshSubscriptionData = useCallback(async () => {
    await Promise.all([
      checkPremiumAccess(),
      fetchSubscription(),
      fetchNotifications()
    ]);
  }, [checkPremiumAccess, fetchSubscription, fetchNotifications]);

  // Handle failed payment recovery
  const updatePaymentMethod = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Direct to app store for payment method update
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') {
          window.open('https://apps.apple.com/account/subscriptions', '_system');
        } else if (platform === 'android') {
          window.open('https://play.google.com/store/account/subscriptions', '_system');
        }
      } else {
        // Web fallback - direct to support
        window.open('https://support.apple.com/en-us/HT202039', '_blank');
      }

      toast({
        title: 'Redirecting to Payment Settings',
        description: 'Please update your payment method in your app store settings.'
      });
    } catch (error) {
      console.error('Error opening payment settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to open payment settings. Please check your app store manually.'
      });
    }
  };

  // Enhanced trial initiation with better mock support
  const startTrial = async (cardDetails?: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardBrand?: string;
  }) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingSubscription) {
        return { success: false, error: 'Subscription already exists' };
      }

      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      // Create subscription record with enhanced trial tracking
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: 'premium',
          status: 'trial',
          trial_start_date: trialStartDate.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          is_trial: true,
          payment_method_collected: !!cardDetails,
          next_billing_date: trialEndDate.toISOString(),
          price: 9.99,
          billing_period: 'monthly'
        });

      if (subscriptionError) throw subscriptionError;

      // Create trial event tracking
      await supabase
        .from('subscription_events')
        .insert({
          user_id: user.id,
          event_type: 'trial_started',
          event_data: {
            trial_length_days: 7,
            payment_method_collected: !!cardDetails,
            card_brand: cardDetails?.cardBrand,
            start_date: trialStartDate.toISOString(),
            end_date: trialEndDate.toISOString()
          }
        });

      // Create welcome notification
      await supabase
        .from('subscription_notifications')
        .insert({
          user_id: user.id,
          notification_type: 'trial_started',
          title: '🎉 Welcome to Premium!',
          message: `Your 7-day free trial has started! Enjoy unlimited access to all features until ${trialEndDate.toLocaleDateString()}.`
        });

      await refreshSubscriptionData();
      
      toast({
        title: 'Trial Started! 🎉',
        description: 'Welcome to 7 days of premium features!'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error starting trial:', error);
      toast({
        title: 'Trial Start Failed',
        description: error.message || 'Unable to start trial. Please try again.',
        variant: 'destructive'
      });
      return { success: false, error: error.message };
    }
  };

  // Enhanced functions with existing logic...
  const grantPartnerAccess = async (partnerUserId: string) => {
    if (!user || !subscription) return { success: false, error: 'No subscription found' };

    try {
      await retryWithBackoff(async () => {
        const { error } = await supabase
          .from('partner_subscriptions')
          .insert({
            premium_user_id: user.id,
            partner_user_id: partnerUserId,
            subscription_id: subscription.id,
            access_type: 'partner-linked'
          });

        if (error) throw error;
      });

      toast({
        title: 'Partner Access Granted',
        description: 'Your partner now has premium access linked to your subscription!'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error granting partner access:', error);
      return { success: false, error: error.message };
    }
  };

  const shouldPromptSubscription = () => {
    return !premiumAccess.has_access && !loading;
  };

  const hasPremiumBenefits = () => {
    return premiumAccess.has_access && !premiumAccess.billing_issue;
  };

  const getTrialDaysRemaining = () => {
    if (!premiumAccess.trial_end_date) return 0;
    const trialEnd = new Date(premiumAccess.trial_end_date);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getTrialTimeRemaining = () => {
    if (!premiumAccess.trial_end_date) return null;
    const trialEnd = new Date(premiumAccess.trial_end_date);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    
    if (diffTime <= 0) return { expired: true };
    
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes, expired: false };
  };

  const isTrialExpiringSoon = () => {
    const daysRemaining = getTrialDaysRemaining();
    return daysRemaining <= 2 && daysRemaining > 0;
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await retryWithBackoff(async () => {
        const { error } = await supabase
          .from('subscription_notifications')
          .update({ is_read: true })
          .eq('id', notificationId);

        if (error) throw error;
      });

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const cancelSubscription = async () => {
    if (!user || !subscription) return { success: false, error: 'No subscription found' };

    try {
      await retryWithBackoff(async () => {
        const { error } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (error) throw error;
      });

      // Revoke partner access if any
      await supabase
        .from('partner_subscriptions')
        .update({ 
          is_active: false,
          revoked_at: new Date().toISOString()
        })
        .eq('subscription_id', subscription.id);

      // Create cancellation notification
      await supabase
        .from('subscription_notifications')
        .insert({
          user_id: user.id,
          notification_type: 'cancelled',
          title: 'Subscription Cancelled',
          message: 'Your subscription has been cancelled. Premium features will remain active until your current period ends.'
        });

      await refreshSubscriptionData();

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled successfully.'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      return { success: false, error: error.message };
    }
  };

  // Auto-sync on app focus/network reconnection
  useEffect(() => {
    const handleFocus = () => {
      if (user && premiumAccess.has_access) {
        syncSubscriptionAcrossDevices();
      }
    };

    const handleOnline = () => {
      if (user && networkError) {
        refreshSubscriptionData();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [user, premiumAccess.has_access, networkError, syncSubscriptionAcrossDevices]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      refreshSubscriptionData();
      
      // Sync across devices on login
      syncSubscriptionAcrossDevices();
    }
  }, [user]);

  // Set up real-time notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'subscription_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as SubscriptionNotification;
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show urgent notifications
          if (newNotification.action_required) {
            toast({
              variant: newNotification.notification_type === 'billing_issue' ? 'destructive' : 'default',
              title: newNotification.title,
              description: newNotification.message,
              duration: 8000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    premiumAccess,
    subscription,
    notifications,
    loading,
    networkError,
    lastSyncAttempt,
    refreshSubscriptionData,
    updatePaymentMethod,
    startTrial,
    grantPartnerAccess,
    shouldPromptSubscription,
    hasPremiumBenefits,
    getTrialDaysRemaining,
    getTrialTimeRemaining,
    isTrialExpiringSoon,
    markNotificationAsRead,
    cancelSubscription
  };
};