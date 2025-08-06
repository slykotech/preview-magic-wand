import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Crown, Shield, Heart, Sparkles } from 'lucide-react';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';

interface SubscriptionPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export const SubscriptionPromptModal = ({ isOpen, onClose, feature }: SubscriptionPromptModalProps) => {
  const { startTrial } = useEnhancedSubscription();
  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    last_four: '',
    brand: 'Visa'
  });

  const handleStartTrial = async () => {
    if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
      return;
    }

    setLoading(true);
    
    // Extract last 4 digits
    const last_four = cardDetails.cardNumber.slice(-4);
    
    // Determine card brand (simple logic)
    const brand = cardDetails.cardNumber.startsWith('4') ? 'Visa' : 
                  cardDetails.cardNumber.startsWith('5') ? 'Mastercard' : 'Other';

    const result = await startTrial({ last_four, brand });
    
    if (result.success) {
      onClose();
    }
    
    setLoading(false);
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
              Start your free trial today. No charges for 7 days. Auto-renews at $9.99/month unless cancelled.
            </div>
          </div>

          {/* Card Details Form */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Secure your trial with a card (no charge for 7 days)</Label>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="cardNumber" className="text-xs text-muted-foreground">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardDetails.cardNumber}
                  onChange={(e) => setCardDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                  maxLength={19}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="expiryDate" className="text-xs text-muted-foreground">MM/YY</Label>
                  <Input
                    id="expiryDate"
                    placeholder="12/26"
                    value={cardDetails.expiryDate}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, expiryDate: e.target.value }))}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv" className="text-xs text-muted-foreground">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                    maxLength={4}
                    type="password"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleStartTrial}
              disabled={loading || !cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv}
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
            >
              {loading ? 'Starting Trial...' : 'Start 7-Day Free Trial'}
            </Button>
            
            <Button variant="ghost" onClick={onClose} className="w-full">
              Maybe Later
            </Button>
          </div>

          {/* Terms */}
          <div className="text-xs text-muted-foreground text-center">
            By starting your trial, you agree to our terms. Cancel anytime before your trial ends to avoid charges.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};