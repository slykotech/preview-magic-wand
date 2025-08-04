import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface RevenueCatSetupProps {
  onComplete?: () => void;
}

export const RevenueCatSetup = ({ onComplete }: RevenueCatSetupProps) => {
  const steps = [
    {
      title: "Add RevenueCat API Keys",
      description: "Configure your iOS and Android API keys for production",
      status: "pending" as const,
      action: "setup"
    },
    {
      title: "Create App Store Products",
      description: "Set up subscription products in App Store Connect",
      status: "info" as const,
      link: "https://developer.apple.com/app-store-connect/"
    },
    {
      title: "Create Google Play Products", 
      description: "Set up subscription products in Google Play Console",
      status: "info" as const,
      link: "https://play.google.com/console/"
    },
    {
      title: "Configure RevenueCat Dashboard",
      description: "Create offerings and entitlements in RevenueCat",
      status: "info" as const,
      link: "https://app.revenuecat.com/"
    }
  ];

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Key className="text-primary" size={24} />
        <div>
          <h3 className="font-poppins font-bold text-lg">Complete RevenueCat Setup</h3>
          <p className="text-sm text-muted-foreground">
            Configure your subscription system for production
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
            <div className="flex-shrink-0">
              {step.status === "pending" && (
                <AlertCircle className="text-orange-500" size={20} />
              )}
              {step.status === "info" && (
                <CheckCircle className="text-blue-500" size={20} />
              )}
            </div>
            
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">{step.title}</h4>
                {step.status === "pending" && (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>

            {step.action === "setup" && (
              <Button 
                size="sm" 
                onClick={onComplete}
                className="flex-shrink-0"
              >
                Setup
              </Button>
            )}
            
            {step.link && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open(step.link, '_blank')}
                className="flex-shrink-0"
              >
                <ExternalLink size={14} />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
        <p className="font-semibold mb-1">📱 Current Status:</p>
        <p>• Web testing works with localStorage simulation</p>
        <p>• Mobile testing requires API key configuration</p>
        <p>• Production ready after all steps completed</p>
      </div>
    </Card>
  );
};