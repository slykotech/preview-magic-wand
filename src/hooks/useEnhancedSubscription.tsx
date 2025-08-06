import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface PremiumAccessDetails {
  has_access: boolean;
  access_type?: 'own_subscription' | 'partner_linked';
  status?: 'trial' | 'active' | 'cancelled' | 'expired';
  plan_type?: 'premium' | 'family';
  trial_end_date?: string;
  current_period_end?: string;
  subscription_id?: string;
  granted_by?: string;
}

interface SubscriptionData {
  id: string;
  status: 'trial' | 'active' | 'cancelled' | 'expired';
  plan_type: 'premium' | 'family';
  trial_start_date?: string;
  trial_end_date?: string;
  current_period_end?: string;
  auto_charge_date?: string;
  card_last_four?: string;
  card_brand?: string;
}

interface SubscriptionNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const useEnhancedSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccessDetails>({ has_access: false });
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [notifications, setNotifications] = useState<SubscriptionNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Check premium access status
  const checkPremiumAccess = async () => {
    if (!user) {
      setPremiumAccess({ has_access: false });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_premium_access_details', {
        p_user_id: user.id
      });

      if (error) throw error;

      setPremiumAccess((data as any) || { has_access: false });
    } catch (error) {
      console.error('Error checking premium access:', error);
      setPremiumAccess({ has_access: false });
    } finally {
      setLoading(false);
    }
  };

  // Get user's own subscription details
  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data as SubscriptionData);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  // Get subscription notifications
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscription_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Start trial subscription
  const startTrial = async (cardDetails: { last_four: string; brand: string }) => {
    if (!user) return { success: false, error: 'No user found' };

    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          status: 'trial',
          plan_type: 'premium',
          trial_start_date: new Date().toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          auto_charge_date: trialEndDate.toISOString(),
          card_last_four: cardDetails.last_four,
          card_brand: cardDetails.brand
        });

      if (error) throw error;

      // Create trial start notification
      await supabase
        .from('subscription_notifications')
        .insert({
          user_id: user.id,
          notification_type: 'trial_start',
          title: '7-Day Free Trial Started!',
          message: 'Your free trial has begun. You will be charged on ' + trialEndDate.toLocaleDateString() + ' unless you cancel.'
        });

      await checkPremiumAccess();
      await fetchSubscription();
      await fetchNotifications();

      toast({
        title: 'Trial Started!',
        description: 'Your 7-day free trial has begun. Enjoy premium features!'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error starting trial:', error);
      return { success: false, error: error.message };
    }
  };

  // Grant partner access when inviting a partner
  const grantPartnerAccess = async (partnerUserId: string) => {
    if (!user || !subscription) return { success: false, error: 'No subscription found' };

    try {
      const { error } = await supabase
        .from('partner_subscriptions')
        .insert({
          premium_user_id: user.id,
          partner_user_id: partnerUserId,
          subscription_id: subscription.id,
          access_type: 'partner-linked'
        });

      if (error) throw error;

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

  // Check if user should be prompted for subscription
  const shouldPromptSubscription = () => {
    return !premiumAccess.has_access && !loading;
  };

  // Check if user has premium benefits
  const hasPremiumBenefits = () => {
    return premiumAccess.has_access;
  };

  // Get days remaining in trial
  const getTrialDaysRemaining = () => {
    if (!premiumAccess.trial_end_date) return 0;
    const trialEnd = new Date(premiumAccess.trial_end_date);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('subscription_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    if (!user || !subscription) return { success: false, error: 'No subscription found' };

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) throw error;

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

      await checkPremiumAccess();
      await fetchSubscription();
      await fetchNotifications();

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

  useEffect(() => {
    if (user) {
      checkPremiumAccess();
      fetchSubscription();
      fetchNotifications();
    }
  }, [user]);

  // Set up real-time subscription for notifications
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
          setNotifications(prev => [payload.new as SubscriptionNotification, ...prev]);
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
    checkPremiumAccess,
    startTrial,
    grantPartnerAccess,
    shouldPromptSubscription,
    hasPremiumBenefits,
    getTrialDaysRemaining,
    markNotificationAsRead,
    cancelSubscription,
    refreshData: () => {
      checkPremiumAccess();
      fetchSubscription();
      fetchNotifications();
    }
  };
};