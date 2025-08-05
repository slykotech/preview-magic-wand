import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Trophy, RotateCcw, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { usePresence } from '@/hooks/usePresence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type CellValue = '💖' | '💘' | null;
type Board = CellValue[][];
type GameStatus = 'playing' | 'won' | 'draw' | 'abandoned';

interface TicToeHeartGameProps {
  sessionId: string;
  isUserTurn: boolean;
  onMove: (row: number, col: number) => void;
  onRematch: () => void;
  onExit: () => void;
}

interface TicToeGameState {
  id: string;
  session_id: string;
  board: Board;
  current_player_id: string;
  game_status: GameStatus;
  winner_id: string | null;
  moves_count: number;
  last_move_at: string;
}

export const TicToeHeartGame: React.FC<TicToeHeartGameProps> = ({
  sessionId,
  onRematch,
  onExit,
}) => {
  const { user } = useAuth();
  const { coupleData, getPartnerDisplayName } = useCoupleData();
  const { isPartnerOnline } = usePresence(coupleData?.id);
  
  const [gameState, setGameState] = useState<TicToeGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [winnerReward, setWinnerReward] = useState('');
  const [showRewardInput, setShowRewardInput] = useState(false);

  // Determine partner ID
  const partnerId = coupleData?.user1_id === user?.id ? coupleData?.user2_id : coupleData?.user1_id;
  
  // Determine symbols based on user roles (consistent assignment)
  const userSymbol: CellValue = coupleData?.user1_id === user?.id ? '💖' : '💘';
  const partnerSymbol: CellValue = coupleData?.user1_id === user?.id ? '💘' : '💖';

  // Initialize or fetch existing game state
  useEffect(() => {
    if (sessionId && user?.id && partnerId) {
      initializeGame();
    }
  }, [sessionId, user?.id, partnerId]);

  // Real-time subscription for game updates
  useEffect(() => {
    if (!gameState?.id) return;

    console.log('Setting up real-time subscription for game:', gameState.id);

    const channel = supabase
      .channel(`tic-toe-game-${gameState.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tic_toe_heart_games',
          filter: `id=eq.${gameState.id}`
        },
        (payload) => {
          console.log('Real-time game update received:', payload);
          if (payload.eventType === 'UPDATE') {
            const updatedState = payload.new as any;
            const newGameState = {
              ...updatedState,
              board: updatedState.board as Board,
              game_status: updatedState.game_status as GameStatus,
              last_move_at: updatedState.last_move_at || new Date().toISOString()
            };
            console.log('Setting new game state:', newGameState);
            setGameState(newGameState);
            
            // Check for game end
            if (payload.new.game_status !== 'playing') {
              setShowCelebration(true);
              if (payload.new.winner_id === user?.id) {
                setTimeout(() => setShowRewardInput(true), 2000);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [gameState?.id, user?.id]);

  const initializeGame = async () => {
    try {
      setLoading(true);
      
      // Check if game already exists for this session
      let { data: existingGame, error: fetchError } = await supabase
        .from('tic_toe_heart_games')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingGame) {
        console.log('Loading existing game:', existingGame);
        setGameState({
          ...existingGame,
          board: existingGame.board as Board,
          game_status: existingGame.game_status as GameStatus,
          last_move_at: existingGame.last_move_at || new Date().toISOString()
        });
      } else {
        // Create new game with user as first player
        console.log('Creating new game with user as first player:', user!.id);
        const { data: newGame, error: createError } = await supabase
          .from('tic_toe_heart_games')
          .insert({
            session_id: sessionId,
            current_player_id: user!.id,
            board: [
              [null, null, null],
              [null, null, null],
              [null, null, null]
            ]
          })
          .select()
          .single();

        if (createError) throw createError;
        console.log('New game created:', newGame);
        setGameState({
          ...newGame,
          board: newGame.board as Board,
          game_status: newGame.game_status as GameStatus,
          last_move_at: newGame.last_move_at || new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      toast.error('Failed to initialize game');
    } finally {
      setLoading(false);
    }
  };

  const checkWinner = (board: Board): string | null => {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return board[i][0] === userSymbol ? user?.id || 'user' : partnerId || 'partner';
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
        return board[0][i] === userSymbol ? user?.id || 'user' : partnerId || 'partner';
      }
    }

    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return board[0][0] === userSymbol ? user?.id || 'user' : partnerId || 'partner';
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return board[0][2] === userSymbol ? user?.id || 'user' : partnerId || 'partner';
    }

    return null;
  };

  const isBoardFull = (board: Board): boolean => {
    return board.every(row => row.every(cell => cell !== null));
  };

  const handleCellClick = async (row: number, col: number) => {
    if (!gameState || !user?.id || gameState.current_player_id !== user.id) {
      toast.error("It's not your turn!");
      return;
    }

    if (gameState.board[row][col] !== null || gameState.game_status !== 'playing') {
      return;
    }

    try {
      console.log('Making move at:', row, col, 'Current board:', gameState.board);
      
      // Create new board with the move
      const newBoard = gameState.board.map((r, rowIndex) =>
        r.map((c, colIndex) => 
          rowIndex === row && colIndex === col ? userSymbol : c
        )
      );

      console.log('New board after move:', newBoard);

      // Check for winner
      const winner = checkWinner(newBoard);
      const isFull = isBoardFull(newBoard);
      
      let newStatus: GameStatus = 'playing';
      let winnerId: string | null = null;

      if (winner) {
        newStatus = 'won';
        winnerId = winner;
      } else if (isFull) {
        newStatus = 'draw';
      }

      console.log('Updating database with:', {
        board: newBoard,
        current_player_id: newStatus === 'playing' ? partnerId : gameState.current_player_id,
        game_status: newStatus,
        winner_id: winnerId,
        moves_count: gameState.moves_count + 1
      });

      // Update game state in database
      const { data, error } = await supabase
        .from('tic_toe_heart_games')
        .update({
          board: newBoard,
          current_player_id: newStatus === 'playing' ? partnerId : gameState.current_player_id,
          game_status: newStatus,
          winner_id: winnerId,
          moves_count: gameState.moves_count + 1,
          last_move_at: new Date().toISOString()
        })
        .eq('id', gameState.id)
        .select()
        .single();

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      console.log('Database update successful:', data);

      // Force local state update immediately (optimistic update)
      setGameState({
        ...gameState,
        board: newBoard,
        current_player_id: newStatus === 'playing' ? partnerId! : gameState.current_player_id,
        game_status: newStatus,
        winner_id: winnerId,
        moves_count: gameState.moves_count + 1,
        last_move_at: new Date().toISOString()
      });

      toast.success('Move made!');
    } catch (error) {
      console.error('Error making move:', error);
      toast.error('Failed to make move');
    }
  };

  const handleRematch = async () => {
    if (!gameState || !user?.id) return;

    try {
      // Reset the game state
      const { error } = await supabase
        .from('tic_toe_heart_games')
        .update({
          board: [
            [null, null, null],
            [null, null, null],
            [null, null, null]
          ],
          current_player_id: user.id, // User who requested rematch goes first
          game_status: 'playing' as GameStatus,
          winner_id: null,
          moves_count: 0,
          last_move_at: new Date().toISOString()
        })
        .eq('id', gameState.id);

      if (error) throw error;
      
      setShowCelebration(false);
      setShowRewardInput(false);
      setWinnerReward('');
      toast.success('New game started!');
      onRematch();
    } catch (error) {
      console.error('Error starting rematch:', error);
      toast.error('Failed to start rematch');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-muted-foreground">Loading game...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-muted-foreground">Failed to load game</p>
              <Button onClick={onExit} variant="outline" className="mt-2">
                Exit Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isUserTurn = gameState.current_player_id === user?.id;
  const isGameOver = gameState.game_status !== 'playing';

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
                <p className="font-medium">You ({userSymbol})</p>
                <p className={`text-sm font-medium ${
                  isUserTurn && !isGameOver 
                    ? 'text-green-600 animate-pulse' 
                    : 'text-muted-foreground'
                }`}>
                  {isGameOver 
                    ? 'Game Over' 
                    : isUserTurn 
                      ? '🟢 Your turn!' 
                      : 'Waiting...'
                  }
                </p>
              </div>
            </div>

            <div className="text-center">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Tic Toe Heart</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium">{getPartnerDisplayName()} ({partnerSymbol})</p>
                <p className={`text-sm font-medium ${
                  !isUserTurn && !isGameOver 
                    ? 'text-green-600 animate-pulse' 
                    : 'text-muted-foreground'
                }`}>
                  {isGameOver 
                    ? 'Game Over' 
                    : !isUserTurn 
                      ? '🟢 Their turn!' 
                      : isPartnerOnline ? 'Online' : 'Offline'
                  }
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
        </CardContent>
      </Card>

      {/* Game Board */}
      <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Tic Toe Heart
          </CardTitle>
          
          {gameState.game_status === 'won' && gameState.winner_id === user?.id && (
            <Badge className="mx-auto bg-green-500 text-white animate-bounce">
              🎉 You Won!
            </Badge>
          )}
          {gameState.game_status === 'won' && gameState.winner_id !== user?.id && (
            <Badge className="mx-auto bg-blue-500 text-white">
              💙 Your partner won!
            </Badge>
          )}
          {gameState.game_status === 'draw' && (
            <Badge className="mx-auto bg-gray-500 text-white">
              🤝 It's a draw!
            </Badge>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Game Board Grid */}
          <div className="grid grid-cols-3 gap-2 max-w-[300px] mx-auto mb-6">
            {gameState.board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    aspect-square bg-white dark:bg-gray-800 rounded-lg border-2 
                    ${isUserTurn && !cell && gameState.game_status === 'playing'
                      ? 'border-pink-300 hover:border-pink-500 hover:bg-pink-50 cursor-pointer' 
                      : 'border-gray-200 dark:border-gray-600'
                    }
                    flex items-center justify-center text-4xl
                    transition-all duration-200 hover:scale-105
                    ${cell ? 'animate-pulse' : ''}
                  `}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  disabled={!isUserTurn || !!cell || gameState.game_status !== 'playing'}
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
          {gameState.game_status === 'playing' && (
            <div className="text-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <p className="text-purple-700 dark:text-purple-300">
                {isUserTurn ? `${userSymbol} Your turn! Tap a heart to place it` : `${partnerSymbol} Waiting for your partner's move...`}
              </p>
            </div>
          )}

          {/* Winner Celebration */}
          {showCelebration && (
            <div className="text-center p-6 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg border-2 border-pink-300">
              {gameState.winner_id === user?.id ? (
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
              ) : gameState.game_status === 'won' ? (
                <div className="space-y-3">
                  <Heart className="h-8 w-8 text-pink-500 mx-auto" />
                  <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    💜 Your partner won this round!
                  </h3>
                  <p className="text-purple-600 dark:text-purple-400">
                    They've earned a special reward from you! 💝
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">
                    🤝 It's a draw!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Great game! Want to play again? 💕
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Winner Reward Input */}
          {showRewardInput && gameState.winner_id === user?.id && (
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
          {isGameOver && (
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
        </CardContent>
      </Card>

      {/* Game Stats */}
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