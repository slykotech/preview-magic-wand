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

  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
      <div className="text-yellow-400 font-bold mb-2">🐛 Debug Info</div>
      <div>My User ID: <span className="text-green-400">{currentUserId}</span></div>
      <div>User1 ID: <span className="text-blue-400">{gameState?.user1_id}</span></div>
      <div>User2 ID: <span className="text-purple-400">{gameState?.user2_id}</span></div>
      <div>Current Turn: <span className="text-orange-400">{gameState?.current_turn}</span></div>
      <div>Is My Turn: <span className={isMyTurn ? 'text-green-400' : 'text-red-400'}>
        {isMyTurn ? 'YES' : 'NO'}
      </span></div>
      <div>Turn Check: <span className={gameState?.current_turn === currentUserId ? 'text-green-400' : 'text-red-400'}>
        {gameState?.current_turn === currentUserId ? 'MATCH' : 'NO MATCH'}
      </span></div>
      <div>Status: <span className="text-cyan-400">{gameState?.status}</span></div>
      <div>Session ID: <span className="text-gray-400">{gameState?.id?.slice(-8)}</span></div>
    </div>
  );
};