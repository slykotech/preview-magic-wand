import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trophy, Skull } from 'lucide-react';

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

  // Use dynamic values from game state or fallback to defaults
  const MAX_FAILED_TASKS = gameState?.max_failed_tasks || 3;
  const MAX_SKIPS = gameState?.max_skips || 3;

  // Win/Lose condition checks
  const myFailedTasksAtLimit = myFailedTasks >= MAX_FAILED_TASKS;
  const mySkipsAtLimit = mySkipsLeft <= 0;
  const partnerFailedTasksAtLimit = partnerFailedTasks >= MAX_FAILED_TASKS;
  const partnerSkipsAtLimit = partnerSkipsLeft <= 0;
  
  const iAmInDanger = (myFailedTasks >= MAX_FAILED_TASKS - 1) || (mySkipsLeft <= 1);
  const partnerInDanger = (partnerFailedTasks >= MAX_FAILED_TASKS - 1) || (partnerSkipsLeft <= 1);
  
  // Game over states
  const iWin = partnerFailedTasksAtLimit || partnerSkipsAtLimit;
  const iLose = myFailedTasksAtLimit || mySkipsAtLimit;

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

          {/* Status Badges & Warnings */}
          <div className="space-y-2">
            {iLose && (
              <Badge variant="destructive" className="w-full justify-center">
                <Skull className="w-3 h-3 mr-1" />
                You Lost!
              </Badge>
            )}
            {iWin && (
              <Badge variant="default" className="w-full justify-center bg-green-600 hover:bg-green-700">
                <Trophy className="w-3 h-3 mr-1" />
                You Win!
              </Badge>
            )}
            {!iLose && !iWin && iAmInDanger && (
              <Badge variant="outline" className="w-full justify-center border-orange-500 text-orange-600">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Danger Zone!
              </Badge>
            )}
            
            {/* Detailed warnings for non-game-over states */}
            {!iLose && !iWin && (
              <>
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
                {mySkipsLeft === 0 && !mySkipsAtLimit && (
                  <p className="text-xs text-destructive font-semibold">
                    🚫 No skips remaining!
                  </p>
                )}
              </>
            )}
          </div>
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
              <span className={`text-sm font-bold ${
                partnerFailedTasks >= MAX_FAILED_TASKS - 1 ? 'text-destructive' : 'text-foreground'
              }`}>
                {partnerFailedTasks}/{MAX_FAILED_TASKS}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  partnerFailedTasks >= MAX_FAILED_TASKS ? 'bg-destructive' : 
                  partnerFailedTasks >= MAX_FAILED_TASKS - 1 ? 'bg-orange-500' : 'bg-muted-foreground'
                }`}
                style={{ width: `${(partnerFailedTasks / MAX_FAILED_TASKS) * 100}%` }}
              />
            </div>
          </div>

          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Skips Left</span>
              <span className={`text-sm font-bold ${
                partnerSkipsLeft <= 1 ? 'text-orange-500' : 'text-foreground'
              }`}>
                {partnerSkipsLeft}/{MAX_SKIPS}
              </span>
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

          {/* Partner Status Indicators */}
          <div className="space-y-2">
            {partnerInDanger && !iWin && !iLose && (
              <Badge variant="outline" className="w-full justify-center border-red-400 text-red-600">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Partner in Danger!
              </Badge>
            )}
            
            {/* Partner advantage indicators */}
            {!iLose && !iWin && partnerFailedTasks === 0 && myFailedTasks > 0 && (
              <p className="text-xs text-green-600 font-semibold">
                ✅ Partner has no failed tasks
              </p>
            )}
            {!iLose && !iWin && partnerSkipsLeft === MAX_SKIPS && mySkipsLeft < MAX_SKIPS && (
              <p className="text-xs text-green-600 font-semibold">
                ✅ Partner has all skips remaining
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};