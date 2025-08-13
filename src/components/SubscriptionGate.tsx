import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate = ({ children }: SubscriptionGateProps) => {
  const { user, loading: authLoading } = useAuth();
  const { subscriptionInfo } = useSubscription();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);

  // Check if user is in admin whitelist
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.email) {
        setAdminCheckLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('admin_whitelist')
          .select('full_access')
          .eq('email', user.email)
          .eq('full_access', true)
          .single();

        setIsAdmin(!!data);
      } catch (error) {
        console.log('User not in admin whitelist');
        setIsAdmin(false);
      } finally {
        setAdminCheckLoading(false);
      }
    };

    checkAdminStatus();
  }, [user?.email]);

  // Redirect to auth if not authenticated
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  // Show loading while checking authentication, subscription, and admin status
  if (authLoading || subscriptionInfo.isLoading || adminCheckLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // If user is in admin whitelist, grant full access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Redirect non-subscribers to trial flow
  if (!subscriptionInfo.isActive) {
    navigate('/subscription/trial');
    return null;
  }

  // User has active subscription, render children
  return <>{children}</>;
};