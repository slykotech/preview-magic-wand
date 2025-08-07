import { Sparkles, Heart, Calendar, MessageSquare, Camera, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { useNavigate } from 'react-router-dom';

const premiumFeatures = [
  { icon: Heart, title: 'Unlimited Card Games', description: 'All relationship-building games' },
  { icon: MessageSquare, title: 'AI Relationship Coach', description: 'Personal guidance & insights' },
  { icon: Calendar, title: 'Smart Date Planner', description: 'Curated date ideas & planning' },
  { icon: Camera, title: 'Memory Vault', description: 'Unlimited photo & memory storage' },
  { icon: BarChart3, title: 'Advanced Analytics', description: 'Deep relationship insights' },
];

export const TrialWelcomeCard = () => {
  const { premiumAccess, getTrialDaysRemaining } = useEnhancedSubscription();
  const navigate = useNavigate();

  if (!premiumAccess.has_access || premiumAccess.status !== 'trial') {
    return null;
  }

  const daysRemaining = getTrialDaysRemaining();

  const handleExploreFeatures = () => {
    navigate('/dashboard');
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary-glow/5 border-primary/20">
      <CardHeader className="text-center pb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full mb-4 mx-auto">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold">Welcome to Premium! 🎉</CardTitle>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {daysRemaining} days remaining
          </Badge>
          <Badge variant="outline">Free Trial</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            You now have full access to all premium features! Start exploring what makes Love Sync special.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {premiumFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div key={index} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleExploreFeatures}
            className="flex-1 bg-gradient-to-r from-primary to-primary-glow"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Explore Premium Features
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            No charges for {daysRemaining} days • Cancel anytime • All features included
          </p>
        </div>
      </CardContent>
    </Card>
  );
};