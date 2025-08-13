import React from 'react';

interface TurnIndicatorProps {
  isMyTurn: boolean;
  partnerName: string;
  connectionStatus: string;
  isPartnerOnline?: boolean;
  isPartnerInGame?: boolean; // New prop to indicate if partner is in the same game
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({ 
  isMyTurn, 
  partnerName, 
  connectionStatus,
  isPartnerOnline = false,
  isPartnerInGame = false
}) => {
  return (
    <div className={`p-4 rounded-lg transition-all duration-300 -mt-2 ${
      isMyTurn 
        ? 'bg-gradient-to-r from-primary/90 to-purple-500/90 text-primary-foreground shadow-lg border border-primary/20' 
        : 'bg-gradient-to-r from-primary/90 to-purple-500/90 text-primary-foreground shadow-lg border border-primary/20'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              {isMyTurn ? "🎯 Your Turn!" : `⏳ ${partnerName}'s Turn`}
            </h3>
            <p className="text-sm opacity-90">
              {isMyTurn ? "Tap the card to reveal your prompt" : "Partner's turn to play"}
            </p>
          </div>
          
          {/* Green indicator when partner is in the same game */}
          {isPartnerInGame && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-full border border-green-400/30">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-sm font-medium">Partner in Game</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Partner Status - only show when waiting for partner and not in game */}
          {!isMyTurn && !isPartnerInGame && (
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