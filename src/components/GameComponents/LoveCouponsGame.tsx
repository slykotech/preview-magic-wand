import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, Clock, Gift, Sparkles } from 'lucide-react';

interface GameCard {
  id: string;
  title: string;
  prompt: string;
  category: string;
  time_limit_seconds: number;
  requires_action: boolean;
}

interface LoveCouponsGameProps {
  currentCard: GameCard;
}

export const LoveCouponsGame: React.FC<LoveCouponsGameProps> = ({ currentCard }) => {
  const [couponCreated, setCouponCreated] = useState(false);

  return (
    <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <Ticket className="h-5 w-5 fill-current" />
            {currentCard.title}
          </CardTitle>
          <Badge variant="outline" className="capitalize bg-rose-100 text-rose-700 border-rose-300">
            {currentCard.category.replace('_', ' ')}
          </Badge>
        </div>
        {currentCard.requires_action && (
          <Badge className="w-fit bg-amber-100 text-amber-800 border-amber-200">
            <Sparkles className="w-3 h-3 mr-1" />
            Action Required
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed mb-4 text-rose-900 dark:text-rose-100">
          {currentCard.prompt}
        </CardDescription>
        
        <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 mb-4">
          <Clock className="w-4 h-4" />
          <span>Be creative: {Math.round(currentCard.time_limit_seconds / 60)} minutes</span>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-rose-100 dark:bg-rose-900/30 rounded-lg border-2 border-dashed border-rose-300 dark:border-rose-700">
            <div className="text-center">
              <Gift className="w-8 h-8 mx-auto mb-2 text-rose-600" />
              <h4 className="font-semibold text-rose-800 dark:text-rose-200 mb-2">Your Love Coupon</h4>
              <p className="text-sm text-rose-700 dark:text-rose-300">
                Design your coupon with details about what makes it special, when it can be redeemed, and any fun conditions!
              </p>
            </div>
          </div>

          {!couponCreated ? (
            <div className="space-y-3">
              <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <p className="text-sm text-pink-700 dark:text-pink-300 font-medium">
                  💖 Think about what would make your partner feel most loved and appreciated!
                </p>
              </div>
              <Button 
                onClick={() => setCouponCreated(true)}
                className="w-full bg-rose-600 hover:bg-rose-700"
              >
                <Ticket className="w-4 h-4 mr-2" />
                Create My Coupon
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                🎁 Perfect! Your partner now has a special coupon to redeem. Remember to make it happen when they use it!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};