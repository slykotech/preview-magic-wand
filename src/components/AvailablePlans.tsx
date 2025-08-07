import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    price: string;
    period: string;
    discount?: string;
    isPopular?: boolean;
  };
  currentPlan?: string;
  onSwitch: (planId: string) => void;
  isLoading: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, currentPlan, onSwitch, isLoading }) => {
  const isCurrentPlan = currentPlan === plan.id;
  
  return (
    <Card className={`relative bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 ${
      plan.isPopular ? 'ring-2 ring-primary' : ''
    }`}>
      {plan.isPopular && (
        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-3 py-1">
          Most Popular
        </Badge>
      )}
      
      <CardContent className="p-6 text-center">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <div className="flex items-center justify-center space-x-2 mt-2">
              <span className="text-3xl font-bold text-white">{plan.price}</span>
              <span className="text-slate-400">/{plan.period}</span>
            </div>
            {plan.discount && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 mt-2">
                {plan.discount}
              </Badge>
            )}
          </div>
          
          {isCurrentPlan ? (
            <div className="flex items-center justify-center space-x-2 text-primary">
              <Check className="w-4 h-4" />
              <span className="font-medium">Current Plan</span>
            </div>
          ) : (
            <Button 
              onClick={() => onSwitch(plan.id)}
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              {isLoading ? 'Processing...' : 'Switch'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const AvailablePlans: React.FC = () => {
  const { plans, subscribeToPlan, subscriptionInfo } = useSubscription();
  const [switchingPlan, setSwitchingPlan] = useState<string | null>(null);

  const handlePlanSwitch = async (planId: string) => {
    setSwitchingPlan(planId);
    
    try {
      const success = await subscribeToPlan(planId);
      
      if (success) {
        toast({
          title: "Success!",
          description: "Your subscription plan has been updated.",
        });
      } else {
        toast({
          title: "Failed",
          description: "Failed to switch plans. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while switching plans.",
        variant: "destructive"
      });
    } finally {
      setSwitchingPlan(null);
    }
  };

  // Use the plans from the hook, or fallback to default plans
  const availablePlans = plans.length > 0 ? plans : [
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Available Plans</h1>
            <p className="text-slate-300">Choose the plan that works best for you</p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {availablePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlan={subscriptionInfo.planName?.toLowerCase()}
                onSwitch={handlePlanSwitch}
                isLoading={switchingPlan === plan.id}
              />
            ))}
          </div>

          {/* Additional Information */}
          <div className="mt-12 text-center">
            <Card className="bg-gradient-to-r from-purple-900/50 to-slate-900/50 border-purple-700/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">✨ Premium Features Included</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Unlimited card games</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>AI relationship coach</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Advanced sync tracking</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};