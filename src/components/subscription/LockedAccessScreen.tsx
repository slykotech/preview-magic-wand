import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, CreditCard, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LockedAccessScreenProps {
  title?: string;
  description?: string;
  showFreeTrial?: boolean;
}

export const LockedAccessScreen: React.FC<LockedAccessScreenProps> = ({
  title = "Premium Access Required",
  description = "Start your free trial to access all premium features and continue your Love Sync journey.",
  showFreeTrial = true
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Lock Icon */}
        <div className="text-center">
          <Lock className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {/* Premium Features Card */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-xl">
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground text-center">What You're Missing</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-primary" />
                <span>Premium relationship games & activities</span>
              </div>
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-primary" />
                <span>AI-powered relationship coaching</span>
              </div>
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-primary" />
                <span>Advanced sync score analytics</span>
              </div>
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-primary" />
                <span>Unlimited daily check-ins</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {showFreeTrial && (
            <Button 
              onClick={() => navigate('/subscription/trial')}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
              size="lg"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Start 7-Day Free Trial
            </Button>
          )}
          
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="w-full"
          >
            Continue with Limited Access
          </Button>
        </div>

        {/* Trial Terms */}
        {showFreeTrial && (
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>✓ Card required • ✓ 7 days free • ✓ Cancel anytime</p>
            <p>Only charged after trial ends if not cancelled</p>
          </div>
        )}
      </div>
    </div>
  );
};