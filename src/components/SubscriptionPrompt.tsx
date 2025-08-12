import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Zap, Heart, Shield } from 'lucide-react';

interface SubscriptionPromptProps {
  onUpgrade: () => void;
  feature?: string;
}

export const SubscriptionPrompt = ({ onUpgrade, feature }: SubscriptionPromptProps) => {
  const premiumFeatures = [
    { icon: <Sparkles size={16} />, text: "Unlimited AI coaching sessions" },
    { icon: <Heart size={16} />, text: "Advanced relationship insights" },
    { icon: <Zap size={16} />, text: "Premium date suggestions" },
    { icon: <Shield size={16} />, text: "Priority customer support" }
  ];

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <Crown className="text-primary mx-auto" size={48} />
          <Sparkles className="absolute -top-1 -right-1 text-yellow-500" size={20} />
        </div>
        
        <div>
          <h3 className="font-semibold text-xl mb-2">
            {feature ? `Unlock ${feature}` : 'Upgrade to Premium'}
          </h3>
          <p className="text-muted-foreground text-sm">
            Get unlimited access to all relationship tools and insights
          </p>
        </div>

        <div className="space-y-3">
          {premiumFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <div className="text-primary">{feature.icon}</div>
              <span>{feature.text}</span>
            </div>
          ))}
        </div>

        <Button 
          onClick={onUpgrade}
          className="w-full bg-gradient-primary hover:opacity-90"
          size="lg"
        >
          <Crown className="mr-2" size={18} />
          Upgrade Now
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Cancel anytime • 7-day free trial
        </p>
      </div>
    </Card>
  );
};