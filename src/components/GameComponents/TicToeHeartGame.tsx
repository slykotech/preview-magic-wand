import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Trophy, RotateCcw, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { usePresence } from '@/hooks/usePresence';

type CellValue = '💖' | '💘' | null;
type Board = CellValue[][];
type GameStatus = 'waiting' | 'playing' | 'won' | 'lost' | 'draw';

interface TicToeHeartGameProps {
  sessionId: string;
  isUserTurn: boolean;
  onMove: (row: number, col: number) => void;
  onRematch: () => void;
  onExit: () => void;
  gameState?: {
    board: Board;
    status: GameStatus;
    winner?: string;
    moves: number;
  };
}

export const TicToeHeartGame: React.FC<TicToeHeartGameProps> = ({
  sessionId,
  isUserTurn,
  onMove,
  onRematch,
  onExit,
  gameState
}) => {
  const { user } = useAuth();
  const { coupleData, getPartnerDisplayName } = useCoupleData();
  const { isPartnerOnline } = usePresence(coupleData?.id);
  
  const [board, setBoard] = useState<Board>([
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
  const [winner, setWinner] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [winnerReward, setWinnerReward] = useState('');
  const [showRewardInput, setShowRewardInput] = useState(false);

  const userSymbol: CellValue = '💖';
  const partnerSymbol: CellValue = '💘';

  // Initialize from game state or defaults
  useEffect(() => {
    if (gameState) {
      setBoard(gameState.board);
      setGameStatus(gameState.status);
      setWinner(gameState.winner || null);
    }
  }, [gameState]);

  const checkWinner = (board: Board): string | null => {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return board[i][0] === userSymbol ? user?.id || 'user' : 'partner';
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
        return board[0][i] === userSymbol ? user?.id || 'user' : 'partner';
      }
    }

    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return board[0][0] === userSymbol ? user?.id || 'user' : 'partner';
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return board[0][2] === userSymbol ? user?.id || 'user' : 'partner';
    }

    return null;
  };

  const isBoardFull = (board: Board): boolean => {
    return board.every(row => row.every(cell => cell !== null));
  };

  const handleCellClick = (row: number, col: number) => {
    if (!isUserTurn || board[row][col] !== null || gameStatus !== 'playing') {
      return;
    }

    const newBoard = board.map((r, rowIndex) =>
      r.map((c, colIndex) => 
        rowIndex === row && colIndex === col ? userSymbol : c
      )
    );
    
    setBoard(newBoard);
    onMove(row, col);

    // Check for winner
    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      setGameStatus(gameWinner === user?.id ? 'won' : 'lost');
      setShowCelebration(true);
      
      if (gameWinner === user?.id) {
        setTimeout(() => setShowRewardInput(true), 2000);
      }
    } else if (isBoardFull(newBoard)) {
      setGameStatus('draw');
    }
  };

  const handleRematch = () => {
    setBoard([
      [null, null, null],
      [null, null, null],
      [null, null, null]
    ]);
    setGameStatus('playing');
    setWinner(null);
    setShowCelebration(false);
    setShowRewardInput(false);
    setWinnerReward('');
    onRematch();
  };

  const handleNudge = () => {
    console.log('Nudging partner for game...');
  };

  const reactions = ['🔥', '😳', '😂', '🫣', '❤️'];

  return (
    <div className="space-y-6">
      {/* Live Avatars & Status */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-pink-500 text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <p className="font-medium">You (💖)</p>
                <p className="text-sm text-muted-foreground">
                  {isUserTurn && gameStatus === 'playing' ? 'Your turn!' : 'Waiting...'}
                </p>
              </div>
            </div>

            <div className="text-center">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Tic Toe Heart</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium">{getPartnerDisplayName()} (💘)</p>
                <p className="text-sm text-muted-foreground">
                  {!isUserTurn && gameStatus === 'playing' ? 'Their turn!' : 
                   isPartnerOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-purple-500 text-white">
                    {getPartnerDisplayName()?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  isPartnerOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>
            </div>
          </div>

          {!isPartnerOnline && gameStatus === 'waiting' && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={handleNudge}>
                👋 Invite to Play
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Board */}
      <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Tic Toe Heart
          </CardTitle>
          
          {gameStatus === 'won' && (
            <Badge className="mx-auto bg-green-500 text-white animate-bounce">
              🎉 You Won!
            </Badge>
          )}
          {gameStatus === 'lost' && (
            <Badge className="mx-auto bg-blue-500 text-white">
              💙 Your partner won!
            </Badge>
          )}
          {gameStatus === 'draw' && (
            <Badge className="mx-auto bg-gray-500 text-white">
              🤝 It's a draw!
            </Badge>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Game Board Grid */}
          <div className="grid grid-cols-3 gap-2 max-w-[300px] mx-auto mb-6">
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    aspect-square bg-white dark:bg-gray-800 rounded-lg border-2 
                    ${isUserTurn && !cell && gameStatus === 'playing' 
                      ? 'border-pink-300 hover:border-pink-500 hover:bg-pink-50 cursor-pointer' 
                      : 'border-gray-200 dark:border-gray-600'
                    }
                    flex items-center justify-center text-4xl
                    transition-all duration-200 hover:scale-105
                    ${cell ? 'animate-pulse' : ''}
                  `}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  disabled={!isUserTurn || !!cell || gameStatus !== 'playing'}
                >
                  {cell && (
                    <span className="animate-scale-in">
                      {cell}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Game Status Messages */}
          {gameStatus === 'waiting' && (
            <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300">
                💙 Waiting for your partner to join the game...
              </p>
            </div>
          )}

          {gameStatus === 'playing' && (
            <div className="text-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <p className="text-purple-700 dark:text-purple-300">
                {isUserTurn ? '💖 Your turn! Tap a heart to place it' : '💘 Waiting for your partner\'s move...'}
              </p>
            </div>
          )}

          {/* Winner Celebration */}
          {showCelebration && (
            <div className="text-center p-6 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg border-2 border-pink-300">
              {gameStatus === 'won' ? (
                <div className="space-y-3">
                  <div className="flex justify-center items-center gap-2">
                    <Sparkles className="h-6 w-6 text-yellow-500 animate-spin" />
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <Sparkles className="h-6 w-6 text-yellow-500 animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-pink-700 dark:text-pink-300">
                    🎉 Congratulations! You won! 🎉
                  </h3>
                  <p className="text-pink-600 dark:text-pink-400">
                    As the winner, you've earned a special reward! ✨
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Heart className="h-8 w-8 text-pink-500 mx-auto" />
                  <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    💜 Your partner won this round!
                  </h3>
                  <p className="text-purple-600 dark:text-purple-400">
                    They've earned a special reward from you! 💝
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Winner Reward Input */}
          {showRewardInput && gameStatus === 'won' && (
            <Card className="mt-4 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
              <CardHeader>
                <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200">
                  🏆 Your Victory Reward!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  As the winner, you can ask your partner anything or make a sweet request:
                </p>
                <textarea
                  value={winnerReward}
                  onChange={(e) => setWinnerReward(e.target.value)}
                  placeholder="Ask a question, make a request, or suggest something fun..."
                  className="w-full p-3 rounded-lg border resize-none h-20"
                />
                <Button 
                  onClick={() => console.log('Reward sent:', winnerReward)}
                  disabled={!winnerReward.trim()}
                  className="w-full bg-yellow-500 hover:bg-yellow-600"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send Reward Request
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Game Controls */}
          {gameStatus !== 'playing' && gameStatus !== 'waiting' && (
            <div className="flex gap-3 justify-center mt-6">
              <Button 
                onClick={handleRematch}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Rematch 💞
              </Button>
              <Button variant="outline" onClick={onExit}>
                Exit 💔
              </Button>
            </div>
          )}

          {/* Reactions */}
          {(gameStatus === 'won' || gameStatus === 'lost') && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">React to the game:</p>
              <div className="flex justify-center gap-3">
                {reactions.map((emoji, index) => (
                  <button
                    key={index}
                    className="text-2xl hover:scale-125 transition-transform"
                    onClick={() => console.log('React with:', emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Stats (Optional) */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-xs text-muted-foreground">Your Wins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">0</p>
              <p className="text-xs text-muted-foreground">Draws</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">0</p>
              <p className="text-xs text-muted-foreground">Partner Wins</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};