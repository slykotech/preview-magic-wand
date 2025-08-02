import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface QuotaData {
  daily_used: number;
  daily_limit: number;
  monthly_used: number;
  monthly_limit: number;
  daily_remaining: number;
  monthly_cost_remaining: number;
  can_proceed: boolean;
}

export const useApiQuota = () => {
  const { user } = useAuth();
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkQuota = async (estimatedCost = 0) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('check_user_quota', {
        p_user_id: user.id,
        p_estimated_cost: estimatedCost
      });

      if (error) {
        console.error('Error checking quota:', error);
        return null;
      }

      setQuota(data as unknown as QuotaData);
      return data as unknown as QuotaData;
    } catch (error) {
      console.error('Error checking quota:', error);
      return null;
    }
  };

  const refreshQuota = () => {
    checkQuota();
  };

  useEffect(() => {
    if (user) {
      checkQuota().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  return {
    quota,
    loading,
    checkQuota,
    refreshQuota,
    isNearDailyLimit: quota ? (quota.daily_used / quota.daily_limit) > 0.8 : false,
    isNearMonthlyLimit: quota ? (quota.monthly_used / quota.monthly_limit) > 0.8 : false,
    canProceed: quota?.can_proceed ?? true
  };
};