import React from 'react';

interface TurnIndicatorProps {
  isMyTurn: boolean;
  partnerName: string;
  connectionStatus: string;
  isPartnerOnline?: boolean;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({ 
  isMyTurn, 
  partnerName, 
  connectionStatus,
  isPartnerOnline = false
}) => {
  return (
    <div className={`p-4 rounded-lg transition-all duration-300 -mt-2 ${
      isMyTurn 
        ? 'bg-gradient-to-r from-primary/90 to-purple-500/90 text-primary-foreground shadow-lg border border-primary/20' 
        : 'bg-gradient-to-r from-primary/90 to-purple-500/90 text-primary-foreground shadow-lg border border-primary/20'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {isMyTurn ? "🎯 Your Turn!" : `⏳ ${partnerName}'s Turn`}
          </h3>
          <p className="text-sm opacity-90">
            {isMyTurn ? "Tap the card to reveal your prompt" : "Wait for your partner to play"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Partner Online Status - only show when waiting for partner */}
          {!isMyTurn && (
            <span className={`flex items-center gap-1 text-sm ${isPartnerOnline ? 'text-green-300' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isPartnerOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              {isPartnerOnline ? 'Partner Online' : 'Waiting for Partner'}
            </span>
          )}
          
          {isMyTurn && (
            <div className="animate-pulse">
              <span className="text-2xl">👆</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};