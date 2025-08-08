import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Crown, Shield, Heart, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export const SubscriptionPromptModal = ({ isOpen, onClose, feature }: SubscriptionPromptModalProps) => {
  const { plans, subscribeToPlan } = useSubscription();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const handleStartTrial = async () => {
    if (!isNative) {
      toast({
        title: "Use Mobile App",
        description: "Please use the mobile app to subscribe via App Store or Google Play.",
        variant: "destructive"
      });
      return;
    }

    // Get the first available plan (usually Premium)
    const defaultPlan = plans.find(p => p.name.toLowerCase().includes('premium')) || plans[0];
    if (!defaultPlan) {
      toast({
        title: "No Plans Available",
        description: "Please try again later.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const success = await subscribeToPlan(defaultPlan.id);
      if (success) {
        toast({
          title: "Trial Started! 🎉",
          description: "Welcome to 7 days of premium features!"
        });
        onClose();
      } else {
        toast({
          title: "Subscription Failed",
          description: "Unable to start subscription. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Subscription Failed",
        description: error.message || "Unable to start subscription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const premiumFeatures = [
    { icon: Crown, title: 'Unlimited Card Games', description: 'Access all relationship card decks' },
    { icon: Heart, title: 'Advanced Sync Score', description: 'Detailed relationship analytics' },
    { icon: Sparkles, title: 'AI Relationship Coach', description: 'Personalized relationship guidance' },
    { icon: Shield, title: 'Premium Memory Vault', description: 'Unlimited photo storage and organization' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-card border-primary/20">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Unlock Premium Features
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {feature 
              ? `To access ${feature}, upgrade to premium and get a 7-day free trial.`
              : 'Get 7 days free, then $9.99/month. Cancel anytime.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Premium Features */}
          <div className="space-y-3">
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{feature.title}</div>
                  <div className="text-sm text-muted-foreground">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Trial Info */}
          <div className="bg-gradient-to-r from-success/10 to-transparent p-4 rounded-lg border border-success/20">
            <div className="font-semibold text-success mb-2">🎉 7-Day Free Trial</div>
            <div className="text-sm text-muted-foreground">
              {isNative 
                ? "Start your free trial today via RevenueCat. No charges for 7 days. Auto-renews unless cancelled."
                : "Please use the mobile app to start your trial via App Store or Google Play."
              }
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleStartTrial}
              disabled={loading || !isNative}
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
            >
              {loading ? 'Starting Trial...' : isNative ? 'Start 7-Day Free Trial' : 'Use Mobile App'}
            </Button>
            
            <Button variant="ghost" onClick={onClose} className="w-full">
              Maybe Later
            </Button>
          </div>

          {/* Terms */}
          <div className="text-xs text-muted-foreground text-center">
            {isNative 
              ? "By starting your trial, you agree to our terms. Cancel anytime via App Store/Google Play."
              : "Download our mobile app to start your premium trial via your device's app store."
            }
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};