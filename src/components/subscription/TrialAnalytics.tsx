import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TrialAnalyticsProps {
  eventType: 'trial_viewed' | 'trial_started' | 'trial_converted' | 'trial_abandoned';
  eventData?: Record<string, any>;
}

export const useTrialAnalytics = () => {
  const { user } = useAuth();

  const trackTrialEvent = async (eventType: TrialAnalyticsProps['eventType'], eventData?: Record<string, any>) => {
    if (!user) return;

    try {
      await supabase
        .from('subscription_events')
        .insert({
          user_id: user.id,
          event_type: eventType,
          event_data: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            page_url: window.location.href,
            ...eventData
          }
        });
    } catch (error) {
      console.error('Error tracking trial event:', error);
    }
  };

  const trackPageView = () => {
    trackTrialEvent('trial_viewed', {
      page: 'subscription_trial',
      referrer: document.referrer
    });
  };

  const trackTrialStart = (paymentMethodProvided: boolean) => {
    trackTrialEvent('trial_started', {
      payment_method_provided: paymentMethodProvided,
      trial_length_days: 7
    });
  };

  const trackTrialConversion = (planId: string) => {
    trackTrialEvent('trial_converted', {
      plan_id: planId,
      conversion_source: 'trial_expiration'
    });
  };

  const trackTrialAbandonment = (step: string, reason?: string) => {
    trackTrialEvent('trial_abandoned', {
      abandonment_step: step,
      reason: reason
    });
  };

  return {
    trackPageView,
    trackTrialStart,
    trackTrialConversion,
    trackTrialAbandonment
  };
};

// Component for automatically tracking page views
export const TrialAnalytics = () => {
  const { trackPageView } = useTrialAnalytics();

  useEffect(() => {
    trackPageView();
  }, []);

  return null;
};