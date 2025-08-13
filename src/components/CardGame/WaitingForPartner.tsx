import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, Users, Clock } from 'lucide-react';

interface WaitingForPartnerProps {
  partnerName: string;
  onBackToGames: () => void;
}

export const WaitingForPartner: React.FC<WaitingForPartnerProps> = ({
  partnerName,
  onBackToGames
}) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-8 max-w-md w-full text-center bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200">
        <div className="space-y-6">
          {/* Animated Hearts */}
          <div className="flex justify-center items-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-pink-500 animate-pulse" />
            <Users className="h-10 w-10 text-purple-500" />
            <Heart className="h-8 w-8 text-pink-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          {/* Main Message */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-800">
              Waiting for {partnerName}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Your game session is ready! We're just waiting for {partnerName} to join the fun.
            </p>
          </div>

          {/* Loading Animation */}
          <div className="flex justify-center items-center gap-2 py-4">
            <Clock className="h-5 w-5 text-purple-500" />
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm text-gray-500 ml-2">Connecting...</span>
          </div>

          {/* Instructions */}
          <div className="bg-white/50 rounded-lg p-4 border border-pink-200">
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Share the game link with {partnerName} or let them know you've started a new game session!
            </p>
          </div>

          {/* Action Button */}
          <Button 
            onClick={onBackToGames}
            variant="outline"
            className="w-full mt-6 border-purple-200 hover:bg-purple-50"
          >
            Back to Games
          </Button>
        </div>
      </Card>
    </div>
  );
};