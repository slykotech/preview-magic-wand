import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MoodBitmoji } from './MoodBitmoji';
import { Heart } from 'lucide-react';

interface CoupleMoodDisplayProps {
  userMood?: string;
  partnerMood?: string;
  className?: string;
}

export const CoupleMoodDisplay: React.FC<CoupleMoodDisplayProps> = ({ 
  userMood, 
  partnerMood, 
  className = '' 
}) => {
  return (
    <Card className={`${className} bg-gradient-to-br from-soft-cloud to-background border border-border/50 shadow-sm`}>
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-foreground">Today's Mood</h3>
          <p className="text-sm text-muted-foreground">How you're both feeling</p>
        </div>
        
        <div className="flex items-center justify-around">
          {/* User Mood */}
          <div className="flex-1 text-center">
            {userMood ? (
              <MoodBitmoji mood={userMood} size="lg" />
            ) : (
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl text-muted-foreground">?</span>
              </div>
            )}
          </div>
          
          {/* Connection Heart */}
          <div className="flex-none px-4">
            <div className="bg-gradient-romance p-3 rounded-full">
              <Heart className="text-white" size={20} fill="white" />
            </div>
          </div>
          
          {/* Partner Mood */}
          <div className="flex-1 text-center">
            {partnerMood ? (
              <MoodBitmoji mood={partnerMood} size="lg" isPartner />
            ) : (
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl text-muted-foreground">?</span>
              </div>
            )}
          </div>
        </div>
        
        {!userMood && !partnerMood && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Complete your daily check-ins to see your moods!
          </p>
        )}
      </CardContent>
    </Card>
  );
};