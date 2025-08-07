import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface GameStatusProps {
  gameState: any;
  currentUserId: string;
  partnerInfo: any;
}

export const GameStatus: React.FC<GameStatusProps> = ({ 
  gameState, 
  currentUserId, 
  partnerInfo 
}) => {
  if (!gameState) return null;
  
  const isUser1 = currentUserId === gameState?.user1_id;
  const myFailedTasks = isUser1 ? gameState?.user1_failed_tasks || 0 : gameState?.user2_failed_tasks || 0;
  const mySkipsLeft = isUser1 ? gameState?.user1_skips_remaining || 0 : gameState?.user2_skips_remaining || 0;
  const partnerFailedTasks = isUser1 ? gameState?.user2_failed_tasks || 0 : gameState?.user1_failed_tasks || 0;
  const partnerSkipsLeft = isUser1 ? gameState?.user2_skips_remaining || 0 : gameState?.user1_skips_remaining || 0;

  const MAX_FAILED_TASKS = 3;
  const MAX_SKIPS = 3;

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Your Stats */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">Your Status</h3>
          
          {/* Failed Tasks */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Failed Tasks</span>
              <span className={`text-sm font-bold ${
                myFailedTasks >= MAX_FAILED_TASKS - 1 ? 'text-destructive' : 'text-foreground'
              }`}>
                {myFailedTasks}/{MAX_FAILED_TASKS}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  myFailedTasks >= MAX_FAILED_TASKS ? 'bg-destructive' : 
                  myFailedTasks >= MAX_FAILED_TASKS - 1 ? 'bg-orange-500' : 'bg-success'
                }`}
                style={{ width: `${(myFailedTasks / MAX_FAILED_TASKS) * 100}%` }}
              />
            </div>
          </div>

          {/* Skips Left */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Skips Left</span>
              <span className={`text-sm font-bold ${
                mySkipsLeft <= 1 ? 'text-orange-500' : 'text-foreground'
              }`}>
                {mySkipsLeft}/{MAX_SKIPS}
              </span>
            </div>
            <div className="flex gap-1">
              {[...Array(MAX_SKIPS)].map((_, i) => (
                <div 
                  key={i}
                  className={`h-2 flex-1 rounded ${
                    i < mySkipsLeft ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Warnings */}
          {myFailedTasks >= MAX_FAILED_TASKS - 1 && (
            <p className="text-xs text-destructive font-semibold">
              ⚠️ One more failed task = Game Over!
            </p>
          )}
          {mySkipsLeft === 1 && (
            <p className="text-xs text-orange-500 font-semibold">
              ⚠️ Last skip available!
            </p>
          )}
          {mySkipsLeft === 0 && (
            <p className="text-xs text-destructive font-semibold">
              🚫 No skips remaining!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Partner Stats */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">
            {partnerInfo?.display_name || 'Partner'}'s Status
          </h3>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Failed Tasks</span>
              <span className="text-sm font-bold">{partnerFailedTasks}/{MAX_FAILED_TASKS}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-muted-foreground h-2 rounded-full transition-all"
                style={{ width: `${(partnerFailedTasks / MAX_FAILED_TASKS) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Skips Left</span>
              <span className="text-sm font-bold">{partnerSkipsLeft}/{MAX_SKIPS}</span>
            </div>
            <div className="flex gap-1">
              {[...Array(MAX_SKIPS)].map((_, i) => (
                <div 
                  key={i}
                  className={`h-2 flex-1 rounded ${
                    i < partnerSkipsLeft ? 'bg-muted-foreground' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};