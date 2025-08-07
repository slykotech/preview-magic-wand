import React from 'react';

interface DebugInfoProps {
  gameState: any;
  currentUserId: string;
  isMyTurn: boolean;
}

export const DebugInfo: React.FC<DebugInfoProps> = ({ 
  gameState, 
  currentUserId, 
  isMyTurn 
}) => {
  if (!gameState) return null;

  // Calculate popup conditions for debugging
  const hasUnseenResponse = gameState?.last_response_text && 
                           !gameState?.last_response_seen &&
                           gameState?.last_response_author_id !== currentUserId;
  
  const shouldShowPopup = isMyTurn && hasUnseenResponse;

  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm max-h-96 overflow-y-auto">
      <div className="text-yellow-400 font-bold mb-2">🐛 Debug Info</div>
      
      {/* Current State */}
      <div className="mb-2 p-2 border border-gray-700 rounded">
        <div className="text-green-400 font-bold mb-1">Current State:</div>
        <div>My User ID: <span className="text-green-400">{currentUserId}</span></div>
        <div>User1 ID: <span className="text-blue-400">{gameState?.user1_id}</span></div>
        <div>User2 ID: <span className="text-purple-400">{gameState?.user2_id}</span></div>
        <div>Current Turn: <span className="text-orange-400">{gameState?.current_turn}</span></div>
        <div>Is My Turn: <span className={isMyTurn ? 'text-green-400' : 'text-red-400'}>
          {isMyTurn ? 'YES' : 'NO'}
        </span></div>
        <div>Status: <span className="text-cyan-400">{gameState?.status}</span></div>
      </div>

      {/* Response Data */}
      <div className="mb-2 p-2 border border-gray-700 rounded">
        <div className="text-blue-400 font-bold mb-1">Response Data:</div>
        <div>Last Response: "{gameState?.last_response_text || 'NONE'}"</div>
        <div>Author ID: {gameState?.last_response_author_id || 'NONE'}</div>
        <div>Timestamp: {gameState?.last_response_timestamp || 'NONE'}</div>
        <div>Seen: <span className={gameState?.last_response_seen ? 'text-green-400' : 'text-red-400'}>
          {gameState?.last_response_seen ? 'YES' : 'NO'}
        </span></div>
      </div>

      {/* Popup Logic */}
      <div className="mb-2 p-2 border border-gray-700 rounded">
        <div className="text-purple-400 font-bold mb-1">Popup Logic:</div>
        <div>Has Response: {gameState?.last_response_text ? '✅' : '❌'}</div>
        <div>Not Seen: {!gameState?.last_response_seen ? '✅' : '❌'}</div>
        <div>Not My Response: {gameState?.last_response_author_id !== currentUserId ? '✅' : '❌'}</div>
        <div>Has Unseen: <span className={hasUnseenResponse ? 'text-green-400' : 'text-red-400'}>
          {hasUnseenResponse ? 'YES' : 'NO'}
        </span></div>
        <div className={shouldShowPopup ? 'text-green-400 font-bold' : 'text-red-400'}>
          Should Show: {shouldShowPopup ? '✅ YES' : '❌ NO'}
        </div>
      </div>

      {/* Failed Tasks */}
      <div className="mb-2 p-2 border border-gray-700 rounded">
        <div className="text-red-400 font-bold mb-1">Failed Tasks:</div>
        <div>User1 Failed: <span className="text-red-400 font-bold">{gameState?.user1_failed_tasks || 0}/3</span></div>
        <div>User2 Failed: <span className="text-red-400 font-bold">{gameState?.user2_failed_tasks || 0}/3</span></div>
        {gameState?.winner_id && (
          <div className="text-green-400 font-bold">
            Winner: {gameState.winner_id === currentUserId ? 'YOU' : 'PARTNER'} 
            ({gameState.win_reason})
          </div>
        )}
      </div>
      
      <div className="text-gray-400 text-xs">
        Updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};