import React from 'react';

interface TurnIndicatorProps {
  isMyTurn: boolean;
  partnerName: string;
  connectionStatus: string;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({ 
  isMyTurn, 
  partnerName, 
  connectionStatus 
}) => {
  return (
    <div className={`p-4 rounded-lg transition-all duration-300 ${
      isMyTurn 
        ? 'bg-gradient-to-r from-primary/90 to-purple-500/90 text-primary-foreground shadow-lg border border-primary/20' 
        : 'bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800 text-foreground shadow-md border border-border/50'
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
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <span className="text-success flex items-center gap-1">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              Online
            </span>
          ) : (
            <span className="text-warning flex items-center gap-1">
              <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
              Connecting...
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