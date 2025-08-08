import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, CheckCircle, AlertTriangle, Calendar, RefreshCcw, Users } from 'lucide-react';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { PartnerInvitationManager } from '@/components/subscription/PartnerInvitationManager';
import { Capacitor } from '@capacitor/core';
import { useSubscription } from '@/hooks/useSubscription';

export const EnhancedSubscriptionPanel: React.FC = () => {
  const {
    premiumAccess,
    subscription,
    loading,
    lastSyncAttempt,
    refreshSubscriptionData,
    updatePaymentMethod,
  } = useEnhancedSubscription();

  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { restorePurchases } = useSubscription();
  const isNative = Capacitor.isNativePlatform();

  const nextBilling = subscription?.current_period_end || premiumAccess.current_period_end;
  const isBillingIssue = !!premiumAccess.billing_issue || subscription?.billing_issue;

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await refreshSubscriptionData();
    } finally {
      setSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!isNative) return;
    setRestoring(true);
    try {
      await restorePurchases();
      await refreshSubscriptionData();
    } finally {
      setRestoring(false);
    }
  };
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
          <span className="text-sm text-muted-foreground">Loading subscription...</span>
        </div>
      </Card>
    );
  }

  if (!premiumAccess.has_access) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">No Premium Access</h3>
              <p className="text-sm text-muted-foreground">
                Subscriptions are managed via the App Store and Google Play. Purchase in the mobile app, then tap Sync{isNative ? ' or Restore' : ''}.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isNative && (
              <Button size="sm" variant="outline" onClick={handleRestore} disabled={restoring}>
                <RefreshCcw className={`w-4 h-4 mr-2 ${restoring ? 'animate-spin' : ''}`} />
                Restore Purchases
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleSyncNow} disabled={syncing}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} /> Sync
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Last checked: {lastSyncAttempt ? new Date(lastSyncAttempt).toLocaleString() : '—'}
          </div>
        </div>
      </Card>
    );
  }

  // Has premium access
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <h3 className="font-semibold flex items-center gap-2">
                {premiumAccess.status === 'trial' ? 'Premium Trial' : 'Premium Active'}
                <Badge variant="secondary" className={premiumAccess.status === 'trial' ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'}>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {premiumAccess.status === 'trial' ? 'Trial' : 'Active'}
                </Badge>
                {premiumAccess.access_type === 'partner_linked' && (
                  <Badge variant="outline" className="ml-1">
                    <Users className="w-3 h-3 mr-1" /> Partner Access
                  </Badge>
                )}
              </h3>
              {nextBilling && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>Next billing: {new Date(nextBilling).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {isBillingIssue && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Payment issue detected. Please update your payment method to avoid interruption.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSyncNow} disabled={syncing}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
            <Button size="sm" variant="outline" onClick={updatePaymentMethod}>
              Update Payment Method
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Last checked: {lastSyncAttempt ? new Date(lastSyncAttempt).toLocaleString() : '—'}
          </div>
        </div>
      </Card>

      {/* Partner sharing - show for users with access */}
      <PartnerInvitationManager />
    </div>
  );
};
