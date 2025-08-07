import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  Users, 
  Settings, 
  CreditCard, 
  Gift,
  Heart,
  Sparkles,
  Timer,
  TrendingUp,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionManager } from '@/components/subscription/SubscriptionManager';
import { PartnerInvitationManager } from '@/components/subscription/PartnerInvitationManager';
import { PremiumBadge } from '@/components/subscription/PremiumBadge';
import { TrialCountdown } from '@/components/subscription/TrialCountdown';
import { TrialStatus } from '@/components/subscription/TrialStatus';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const PremiumDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    premiumAccess, 
    subscription, 
    notifications,
    loading,
    getTrialTimeRemaining,
    isTrialExpiringSoon,
    markNotificationAsRead 
  } = useEnhancedSubscription();
  const { manageBilling } = useSubscription();
  
  const [activeTab, setActiveTab] = useState('overview');
  
  const trialTime = getTrialTimeRemaining();
  const isTrialActive = premiumAccess.status === 'trial';
  const trialExpiring = isTrialExpiringSoon();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin text-6xl">💎</div>
          <h2 className="text-2xl font-bold text-purple-900">Loading Premium Dashboard</h2>
          <p className="text-purple-600">Getting your subscription details...</p>
        </div>
      </div>
    );
  }

  if (!premiumAccess.has_access) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <Crown className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">Premium Access Required</h2>
            <p className="text-muted-foreground">
              This dashboard is only available for premium subscribers.
            </p>
            <Button onClick={() => navigate('/subscription-plans')} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const premiumFeatures = [
    {
      name: "Unlimited Card Games",
      description: "Access to all relationship-building activities",
      icon: Heart,
      active: true
    },
    {
      name: "AI Relationship Coach",
      description: "Personal guidance and insights",
      icon: Sparkles,
      active: true
    },
    {
      name: "Advanced Analytics",
      description: "Detailed relationship progress tracking",
      icon: TrendingUp,
      active: true
    },
    {
      name: "Partner Sync",
      description: "Share premium access with your partner",
      icon: Users,
      active: premiumAccess.access_type === 'own_subscription'
    }
  ];

  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-purple-900">Premium Dashboard</h1>
              <PremiumBadge />
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>

          {/* Status Banner */}
          {isTrialActive && trialTime && (
            <Card className={`mb-6 ${trialExpiring ? 'border-red-200 bg-red-50' : 'border-primary/20 bg-primary/5'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Timer className={`w-5 h-5 ${trialExpiring ? 'text-red-500' : 'text-primary'}`} />
                    <div>
                      <h3 className="font-semibold">
                        {trialExpiring ? '⚠️ Trial Expiring Soon!' : '🎉 Free Trial Active'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {trialTime.days} days, {trialTime.hours} hours, {trialTime.minutes} minutes remaining
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Progress 
                      value={trialExpiring ? 20 : 60} 
                      className="w-32 mb-2"
                    />
                    <Button size="sm" onClick={() => navigate('/subscription-plans')}>
                      Subscribe Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          {unreadNotifications.length > 0 && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-blue-500" />
                  Recent Updates ({unreadNotifications.length})
                </h3>
                <div className="space-y-2">
                  {unreadNotifications.slice(0, 3).map((notification) => (
                    <div 
                      key={notification.id} 
                      className="flex items-start justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50"
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div>
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                        New
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="sharing" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Partner Sharing
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Features
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Subscription Status */}
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Plan:</span>
                      <Badge variant="default" className="bg-primary/10 text-primary">
                        {premiumAccess.plan_type || 'Premium'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Type:</span>
                      <span className="text-sm font-medium">
                        {premiumAccess.access_type === 'partner_linked' ? 'Partner Access' : 'Direct Subscription'}
                      </span>
                    </div>
                    {premiumAccess.current_period_end && (
                      <div className="flex items-center justify-between">
                        <span>Next Billing:</span>
                        <span className="text-sm">
                          {new Date(premiumAccess.current_period_end).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={manageBilling}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Billing
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('sharing')}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Share with Partner
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => navigate('/games')}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Play Premium Games
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Premium Features */}
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Active Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {premiumFeatures.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">{feature.name}</span>
                      </div>
                    ))}
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto font-normal"
                      onClick={() => setActiveTab('features')}
                    >
                      View all features →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity or Usage Stats could go here */}
          </TabsContent>

          {/* Subscription Management Tab */}
          <TabsContent value="subscription">
            <SubscriptionManager />
          </TabsContent>

          {/* Partner Sharing Tab */}
          <TabsContent value="sharing">
            <PartnerInvitationManager />
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Premium Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {premiumFeatures.map((feature, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border-2 ${
                        feature.active 
                          ? 'border-primary/20 bg-primary/5' 
                          : 'border-muted bg-muted/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <feature.icon className={`w-6 h-6 ${
                          feature.active ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{feature.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {feature.description}
                          </p>
                          <Badge 
                            variant={feature.active ? "default" : "secondary"}
                            className={feature.active ? "bg-green-100 text-green-800" : ""}
                          >
                            {feature.active ? "Active" : "Limited Access"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};