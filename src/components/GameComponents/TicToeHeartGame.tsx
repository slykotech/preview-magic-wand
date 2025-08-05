import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, Trophy, RotateCcw, MessageCircle, Sparkles, Crown } from 'lucide-react';
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

interface LoveGrant {
  id: string;
  couple_id: string;
  winner_user_id: string;
  winner_name: string;
  winner_symbol: CellValue;
  request_text: string;
  game_session_id: string | null;
  status: 'pending' | 'acknowledged' | 'fulfilled';
  response_text?: string;
  created_at: string;
}

// Confetti effect component
const Confetti = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-ping"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`
          }}
        >
          {Math.random() > 0.5 ? '💖' : '💘'}
        </div>
      ))}
    </div>
  );
};

export const TicToeHeartGame: React.FC<TicToeHeartGameProps> = ({
  sessionId,
  onRematch,
  onExit,
}) => {
  const { user } = useAuth();
  const { coupleData, getPartnerDisplayName, getUserDisplayName } = useCoupleData();
  const { isPartnerOnline } = usePresence(coupleData?.id);
  
  const [gameState, setGameState] = useState<TicToeGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showLoveGrant, setShowLoveGrant] = useState(false);
  const [winnerReward, setWinnerReward] = useState('');
  const [loveGrants, setLoveGrants] = useState<LoveGrant[]>([]);
  const [playfulMessage, setPlayfulMessage] = useState('');

  // Determine partner ID
  const partnerId = coupleData?.user1_id === user?.id ? coupleData?.user2_id : coupleData?.user1_id;
  
  // 🎯 FIX: Consistent symbol assignment - 💖 for Rosie (user1), 💘 for Virat (user2)
  const getUserSymbol = (userId: string): CellValue => {
    if (!coupleData) return '💖';
    return coupleData.user1_id === userId ? '💖' : '💘';
  };

  const userSymbol = getUserSymbol(user?.id || '');
  const partnerSymbol = getUserSymbol(partnerId || '');

  // Playful messages based on turn state
  const getPlayfulMessage = (isUserTurn: boolean, playerName: string, symbol: CellValue) => {
    const messages = {
      userTurn: [
        `${playerName} ${symbol}, it's your turn! Make your heart count! 💕`,
        `${playerName} ${symbol} is thinking strategically... 🤔💭`,
        `Your move, ${playerName} ${symbol}! Place your heart wisely! ✨`,
        `${playerName} ${symbol}, where will you strike next? 💘`,
      ],
      partnerTurn: [
        `${playerName} ${symbol} is contemplating their next move... 🤔`,
        `Waiting for ${playerName} ${symbol} to make their heart choice! 💗`,
        `${playerName} ${symbol}, are you ready to block or win? 🏆`,
        `${playerName} ${symbol} is planning something romantic! 💕`,
      ]
    };
    
    const messageSet = isUserTurn ? messages.userTurn : messages.partnerTurn;
    return messageSet[Math.floor(Math.random() * messageSet.length)];
  };

  // Initialize or fetch existing game state
  useEffect(() => {
    if (sessionId && user?.id && partnerId) {
      initializeGame();
    }
  }, [sessionId, user?.id, partnerId]);

  // Real-time subscription for game updates with improved sync
  useEffect(() => {
    if (!gameState?.id) return;

    console.log('🎮 Setting up real-time subscription for game:', gameState.id);

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
          console.log('🎮 Real-time game update received:', payload);
          if (payload.eventType === 'UPDATE') {
            const updatedState = payload.new as any;
            const newGameState = {
              ...updatedState,
              board: updatedState.board as Board,
              game_status: updatedState.game_status as GameStatus,
              last_move_at: updatedState.last_move_at || new Date().toISOString()
            };
            
            console.log('🎮 Setting new game state:', newGameState);
            setGameState(newGameState);
            
            // Update playful message based on new turn
            const isUserTurn = newGameState.current_player_id === user?.id;
            const currentPlayerName = isUserTurn ? getUserDisplayName() : getPartnerDisplayName();
            const currentSymbol = isUserTurn ? userSymbol : partnerSymbol;
            setPlayfulMessage(getPlayfulMessage(isUserTurn, currentPlayerName || 'Player', currentSymbol));
            
            // Check for game end
            if (payload.new.game_status !== 'playing') {
              setShowCelebration(true);
              if (payload.new.winner_id === user?.id) {
                setTimeout(() => setShowLoveGrant(true), 2000);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🎮 Subscription status:', status);
      });

    return () => {
      console.log('🎮 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [gameState?.id, user?.id]);

  // Update playful message when turn changes
  useEffect(() => {
    if (gameState && gameState.game_status === 'playing') {
      const isUserTurn = gameState.current_player_id === user?.id;
      const currentPlayerName = isUserTurn ? getUserDisplayName() : getPartnerDisplayName();
      const currentSymbol = isUserTurn ? userSymbol : partnerSymbol;
      setPlayfulMessage(getPlayfulMessage(isUserTurn, currentPlayerName || 'Player', currentSymbol));
    }
  }, [gameState?.current_player_id, gameState?.game_status]);

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
        console.log('🎮 Loading existing game:', existingGame);
        setGameState({
          ...existingGame,
          board: existingGame.board as Board,
          game_status: existingGame.game_status as GameStatus,
          last_move_at: existingGame.last_move_at || new Date().toISOString()
        });
      } else {
        // Create new game with user as first player
        console.log('🎮 Creating new game with user as first player:', user!.id);
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
        console.log('🎮 New game created:', newGame);
        setGameState({
          ...newGame,
          board: newGame.board as Board,
          game_status: newGame.game_status as GameStatus,
          last_move_at: newGame.last_move_at || new Date().toISOString()
        });
      }

      // Load love grants history
      await loadLoveGrants();
    } catch (error) {
      console.error('❌ Error initializing game:', error);
      toast.error('Failed to initialize game');
    } finally {
      setLoading(false);
    }
  };

  const loadLoveGrants = async () => {
    try {
      if (!coupleData?.id) return;
      
      const { data: grants, error } = await supabase
        .from('love_grants')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLoveGrants((grants || []).map(g => ({
        ...g,
        winner_symbol: g.winner_symbol as CellValue,
        status: g.status as 'pending' | 'acknowledged' | 'fulfilled'
      })));
    } catch (error) {
      console.error('❌ Error loading love grants:', error);
    }
  };

  const saveLoveGrant = async (grant: Omit<LoveGrant, 'id' | 'created_at'>) => {
    try {
      if (!coupleData?.id || !user?.id) throw new Error('Missing required data');

      const { data, error } = await supabase
        .from('love_grants')
        .insert({
          couple_id: coupleData.id,
          winner_user_id: user.id,
          winner_name: grant.winner_name,
          winner_symbol: grant.winner_symbol,
          request_text: grant.request_text,
          game_session_id: sessionId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Add to local state
      setLoveGrants(prev => [{
        ...data,
        winner_symbol: data.winner_symbol as CellValue,
        status: data.status as 'pending' | 'acknowledged' | 'fulfilled'
      }, ...prev]);
      
      toast.success('💌 Love Grant sent to your partner!');
    } catch (error) {
      console.error('❌ Error saving love grant:', error);
      toast.error('Failed to send Love Grant');
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
      toast.error("🚫 It's not your turn!");
      return;
    }

    if (gameState.board[row][col] !== null || gameState.game_status !== 'playing') {
      return;
    }

    try {
      console.log('🎮 Making move at:', row, col, 'Current board:', gameState.board);
      
      // Create new board with the move
      const newBoard = gameState.board.map((r, rowIndex) =>
        r.map((c, colIndex) => 
          rowIndex === row && colIndex === col ? userSymbol : c
        )
      );

      console.log('🎮 New board after move:', newBoard);

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

      // Determine next player - switch turns if game is still playing
      const nextPlayerId = newStatus === 'playing' ? partnerId : gameState.current_player_id;
      
      console.log('🎮 Updating database with:', {
        board: newBoard,
        current_player_id: nextPlayerId,
        game_status: newStatus,
        winner_id: winnerId,
        moves_count: gameState.moves_count + 1,
        current_user: user?.id,
        partner: partnerId
      });

      // Update game state in database with optimistic locking
      const { data, error } = await supabase
        .from('tic_toe_heart_games')
        .update({
          board: newBoard,
          current_player_id: nextPlayerId,
          game_status: newStatus,
          winner_id: winnerId,
          moves_count: gameState.moves_count + 1,
          last_move_at: new Date().toISOString()
        })
        .eq('id', gameState.id)
        .eq('moves_count', gameState.moves_count) // Optimistic locking
        .select()
        .single();

      if (error) {
        console.error('❌ Database update error:', error);
        if (error.code === 'PGRST116') {
          toast.error('🔄 Move conflict! Game refreshed.');
          // Refresh game state
          await initializeGame();
          return;
        }
        throw error;
      }

      console.log('✅ Database update successful:', data);
      toast.success('💝 Move made!');
    } catch (error) {
      console.error('❌ Error making move:', error);
      toast.error('Failed to make move');
    }
  };

  const handleLoveGrantSubmit = async () => {
    if (!winnerReward.trim() || !gameState || !user?.id || !coupleData?.id) return;

    const loveGrant: Omit<LoveGrant, 'id' | 'created_at'> = {
      couple_id: coupleData.id,
      winner_user_id: user.id,
      winner_name: getUserDisplayName() || 'You',
      winner_symbol: userSymbol,
      request_text: winnerReward.trim(),
      game_session_id: sessionId,
      status: 'pending'
    };

    await saveLoveGrant(loveGrant);
    setShowLoveGrant(false);
    setWinnerReward('');
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
          current_player_id: partnerId, // Partner starts next game
          game_status: 'playing' as GameStatus,
          winner_id: null,
          moves_count: 0,
          last_move_at: new Date().toISOString()
        })
        .eq('id', gameState.id);

      if (error) throw error;
      
      setShowCelebration(false);
      setShowLoveGrant(false);
      setWinnerReward('');
      toast.success('🎮 New game started!');
      onRematch();
    } catch (error) {
      console.error('❌ Error starting rematch:', error);
      toast.error('Failed to start rematch');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">💝</div>
              <p className="text-muted-foreground">Loading TikTok Toe Heart Game...</p>
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
      {/* Confetti for winners */}
      {showCelebration && gameState.winner_id && <Confetti />}

      {/* Live Avatars & Status */}
      <Card className="border-primary/20 animate-fade-in">
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
                <p className="font-medium">{getUserDisplayName()} ({userSymbol})</p>
                <p className={`text-sm font-medium ${
                  isUserTurn && !isGameOver 
                    ? 'text-green-600 animate-pulse' 
                    : 'text-muted-foreground'
                }`}>
                  {isGameOver 
                    ? 'Game Over' 
                    : isUserTurn 
                      ? '🟢 Your turn!' 
                      : '⏳ Waiting...'
                  }
                </p>
              </div>
            </div>

            <div className="text-center">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">TikTok Toe</p>
              <p className="text-xs text-muted-foreground">Heart Game</p>
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
                      : isPartnerOnline ? '💚 Online' : '💔 Offline'
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
      <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            TikTok Toe Heart Game 💕
          </CardTitle>
          
          {gameState.game_status === 'won' && gameState.winner_id === user?.id && (
            <Badge className="mx-auto bg-green-500 text-white animate-bounce">
              🎉 You Won! 👑
            </Badge>
          )}
          {gameState.game_status === 'won' && gameState.winner_id !== user?.id && (
            <Badge className="mx-auto bg-blue-500 text-white">
              💙 Your partner won! 🏆
            </Badge>
          )}
          {gameState.game_status === 'draw' && (
            <Badge className="mx-auto bg-gray-500 text-white">
              🤝 It's a draw! 💕
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
                      ? 'border-pink-300 hover:border-pink-500 hover:bg-pink-50 cursor-pointer hover-scale' 
                      : 'border-gray-200 dark:border-gray-600'
                    }
                    flex items-center justify-center text-4xl
                    transition-all duration-200 
                    ${cell ? 'animate-scale-in' : ''}
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

          {/* Playful Dialogue */}
          {gameState.game_status === 'playing' && playfulMessage && (
            <div className="text-center p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border border-pink-200 animate-fade-in">
              <p className="text-purple-700 dark:text-purple-300 font-medium">
                {playfulMessage}
              </p>
            </div>
          )}

          {/* Winner Celebration */}
          {showCelebration && (
            <div className="text-center p-6 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg border-2 border-pink-300 animate-scale-in">
              {gameState.winner_id === user?.id ? (
                <div className="space-y-3">
                  <div className="flex justify-center items-center gap-2">
                    <Sparkles className="h-6 w-6 text-yellow-500 animate-spin" />
                    <Crown className="h-8 w-8 text-yellow-500" />
                    <Sparkles className="h-6 w-6 text-yellow-500 animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-pink-700 dark:text-pink-300">
                    🎉 Congratulations! You Won! 🎉
                  </h3>
                  <p className="text-pink-600 dark:text-pink-400">
                    As the winner, you've earned a 💌 Love Grant! ✨
                  </p>
                </div>
              ) : gameState.game_status === 'won' ? (
                <div className="space-y-3">
                  <Heart className="h-8 w-8 text-pink-500 mx-auto" />
                  <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    💜 Your partner won this round!
                  </h3>
                  <p className="text-purple-600 dark:text-purple-400">
                    They've earned a 💌 Love Grant from you! 💝
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">
                    🤝 It's a draw!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Great game! Both hearts played wonderfully! 💕
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Game Controls */}
          {isGameOver && (
            <div className="flex gap-3 justify-center mt-6">
              <Button 
                onClick={handleRematch}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 animate-fade-in"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Rematch 💞
              </Button>
              <Button variant="outline" onClick={onExit} className="animate-fade-in">
                Exit 💔
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Love Grant Modal */}
      <Dialog open={showLoveGrant} onOpenChange={setShowLoveGrant}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              💌 Your Love Grant! 👑
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-gradient-to-r from-yellow-100 to-pink-100 rounded-lg">
              <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-yellow-700 text-sm">
                As the winner, you can ask your partner anything or make a sweet request!
              </p>
            </div>
            
            <textarea
              value={winnerReward}
              onChange={(e) => setWinnerReward(e.target.value)}
              placeholder="Ask a meaningful question, make a request, or suggest something romantic..."
              className="w-full p-3 rounded-lg border resize-none h-24"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {winnerReward.length}/200 characters
            </p>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleLoveGrantSubmit}
                disabled={!winnerReward.trim()}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Send Love Grant 💌
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowLoveGrant(false)}
              >
                Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Love Grants History */}
      {loveGrants.length > 0 && (
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-pink-50 dark:from-yellow-950/20 dark:to-pink-950/20 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Recent Love Grants 💌
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {loveGrants.slice(0, 3).map((grant) => (
                <div key={grant.id} className="p-3 bg-white/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-sm">
                      {grant.winner_name} {grant.winner_symbol}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(grant.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    "{grant.request_text}"
                  </p>
                  {grant.status === 'pending' && (
                    <Badge className="mt-2 bg-yellow-100 text-yellow-800 text-xs">
                      💌 Awaiting response
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};