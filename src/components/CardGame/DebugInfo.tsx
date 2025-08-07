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

  return null;
};