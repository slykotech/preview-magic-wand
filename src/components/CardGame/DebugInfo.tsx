import React, { useState, useEffect } from 'react';

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
  const [lastFailedTasks, setLastFailedTasks] = useState<{user1: number, user2: number}>({user1: 0, user2: 0});
  const [updateCount, setUpdateCount] = useState(0);

  // Track changes in failed task counts
  useEffect(() => {
    if (gameState) {
      const currentUser1Failed = gameState.user1_failed_tasks || 0;
      const currentUser2Failed = gameState.user2_failed_tasks || 0;
      
      if (currentUser1Failed !== lastFailedTasks.user1 || currentUser2Failed !== lastFailedTasks.user2) {
        console.log('🚨 FAILED TASKS CHANGED!', {
          from: lastFailedTasks,
          to: { user1: currentUser1Failed, user2: currentUser2Failed },
          timestamp: new Date().toISOString()
        });
        setLastFailedTasks({ user1: currentUser1Failed, user2: currentUser2Failed });
        setUpdateCount(prev => prev + 1);
      }
    }
  }, [gameState?.user1_failed_tasks, gameState?.user2_failed_tasks, lastFailedTasks]);

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
        <div className="text-red-400 font-bold mb-1">Failed Tasks (Updates: {updateCount}):</div>
        <div>User1 Failed: <span className="text-red-400 font-bold">{gameState?.user1_failed_tasks || 0}/3</span></div>
        <div>User2 Failed: <span className="text-red-400 font-bold">{gameState?.user2_failed_tasks || 0}/3</span></div>
        <div className="text-xs text-gray-400">
          Last Update: {lastFailedTasks.user1}/{lastFailedTasks.user2}
        </div>
        {gameState?.winner_id && (
          <div className="text-green-400 font-bold">
            Winner: {gameState.winner_id === currentUserId ? 'YOU' : 'PARTNER'} 
            ({gameState.win_reason})
          </div>
        )}
      </div>

      {/* Timer & Timeout Debug */}
      <div className="mb-2 p-2 border border-gray-700 rounded">
        <div className="text-orange-400 font-bold mb-1">Timer Debug:</div>
        <div>Card Started: {gameState?.current_card_started_at || 'NONE'}</div>
        <div>Card ID: {gameState?.current_card_id || 'NONE'}</div>
        <div>Timer Active: {gameState?.current_card_started_at ? '✅' : '❌'}</div>
        {gameState?.current_card_started_at && (
          <div>
            <div>Start Time (parsed): {new Date(gameState.current_card_started_at).toISOString()}</div>
            <div>Current Time: {new Date().toISOString()}</div>
            <div>Time Diff (ms): {Date.now() - new Date(gameState.current_card_started_at).getTime()}</div>
            <div>Elapsed: {Math.floor((Date.now() - new Date(gameState.current_card_started_at).getTime()) / 1000)}s</div>
            <div className={Date.now() < new Date(gameState.current_card_started_at).getTime() ? 'text-red-400 font-bold' : 'text-green-400'}>
              {Date.now() < new Date(gameState.current_card_started_at).getTime() ? 
                '🚨 FUTURE TIMESTAMP!' : '✅ Valid timestamp'}
            </div>
          </div>
        )}
      </div>

      {/* Game Flow Debug */}
      <div className="mb-2 p-2 border border-gray-700 rounded">
        <div className="text-cyan-400 font-bold mb-1">Game Flow:</div>
        <div>Total Cards: {gameState?.total_cards_played || 0}</div>
        <div>Current Phase: {gameState?.current_card_revealed ? 'Card Revealed' : 'Waiting'}</div>
        <div>Card Completed: {gameState?.current_card_completed ? '✅' : '❌'}</div>
        <div>Last Activity: {gameState?.last_activity_at ? new Date(gameState.last_activity_at).toLocaleTimeString() : 'NONE'}</div>
      </div>
      
      <div className="text-gray-400 text-xs">
        Updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};