import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Heart, Users, Trophy, Crown } from 'lucide-react';

type Player = 'player1' | 'player2';
type CellValue = '💖' | '💘' | null;
type Board = CellValue[][];
type GameStatus = 'ongoing' | 'completed';
type Winner = 'player1' | 'player2' | 'draw' | null;

interface HeartSyncGame {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  player1_symbol: string;
  player2_symbol: string;
  current_turn: Player;
  winner: Winner;
  status: GameStatus;
  board: Board;
  created_at: string;
  updated_at: string;
}

interface HeartSyncReward {
  id: string;
  game_id: string;
  asked_by: string;
  asked_to: string;
  question: string;
  answered: boolean;
  answer?: string;
  created_at: string;
  answered_at?: string;
}

export const HeartSyncGame = () => {
  const { user } = useAuth();
  const { coupleData: couple } = useCoupleData();
  const { toast } = useToast();

  const [game, setGame] = useState<HeartSyncGame | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [heartWishQuestion, setHeartWishQuestion] = useState('');
  const [pendingReward, setPendingReward] = useState<HeartSyncReward | null>(null);
  const [rewardAnswer, setRewardAnswer] = useState('');

  // Initialize empty board
  const createEmptyBoard = (): Board => [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];

  // Check for winner
  const checkWinner = useCallback((board: Board): Winner => {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return board[i][0] === '💖' ? 'player1' : 'player2';
      }
    }

    // Check columns
    for (let j = 0; j < 3; j++) {
      if (board[0][j] && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
        return board[0][j] === '💖' ? 'player1' : 'player2';
      }
    }

    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return board[0][0] === '💖' ? 'player1' : 'player2';
    }
    
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return board[0][2] === '💖' ? 'player1' : 'player2';
    }

    // Check for draw
    const isFull = board.every(row => row.every(cell => cell !== null));
    if (isFull) return 'draw';

    return null;
  }, []);

  // Get current player info
  const getCurrentPlayer = useCallback(() => {
    if (!game || !user) return null;
    
    const isPlayer1 = user.id === game.player1_id;
    const isPlayer2 = user.id === game.player2_id;
    
    if (!isPlayer1 && !isPlayer2) return null;
    
    return {
      isPlayer1,
      isPlayer2,
      playerType: isPlayer1 ? 'player1' : 'player2' as Player,
      playerName: isPlayer1 ? game.player1_name : game.player2_name,
      playerSymbol: isPlayer1 ? game.player1_symbol : game.player2_symbol,
      partnerName: isPlayer1 ? game.player2_name : game.player1_name,
      isMyTurn: (isPlayer1 && game.current_turn === 'player1') || (isPlayer2 && game.current_turn === 'player2')
    };
  }, [game, user]);

  // Start new game
  const startNewGame = async () => {
    if (!user || !couple) {
      toast({
        title: "Cannot Start Game",
        description: "You need to be connected with your partner first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('heart_sync_games')
        .insert({
          player1_id: couple.user1_id,
          player2_id: couple.user2_id,
          player1_name: user.id === couple.user1_id ? 'You' : 'Partner',
          player2_name: user.id === couple.user2_id ? 'You' : 'Partner',
          current_turn: 'player1',
          board: createEmptyBoard()
        })
        .select()
        .single();

      if (error) throw error;

      setGame({
        ...data,
        current_turn: data.current_turn as Player,
        winner: data.winner as Winner,
        status: data.status as GameStatus,
        board: data.board as Board
      });
      toast({
        title: "💖 Heart Sync Started!",
        description: "Let the romantic battle begin!"
      });
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Make a move
  const makeMove = async (row: number, col: number) => {
    if (!game || !user) return;

    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isMyTurn) {
      toast({
        title: "Not Your Turn!",
        description: `Wait for ${currentPlayer?.partnerName || 'your partner'} to make their move.`,
        variant: "destructive"
      });
      return;
    }

    // Check if cell is already occupied
    if (game.board[row][col] !== null) {
      toast({
        title: "Invalid Move",
        description: "This cell is already taken!",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update board
      const newBoard = game.board.map((boardRow, rowIndex) =>
        boardRow.map((cell, colIndex) =>
          rowIndex === row && colIndex === col ? currentPlayer.playerSymbol as CellValue : cell
        )
      );

      // Check for winner
      const winner = checkWinner(newBoard);
      const nextTurn: Player = currentPlayer.playerType === 'player1' ? 'player2' : 'player1';

      // Update game state
      const { error: gameError } = await supabase
        .from('heart_sync_games')
        .update({
          board: newBoard,
          current_turn: winner ? game.current_turn : nextTurn,
          winner: winner,
          status: winner ? 'completed' : 'ongoing'
        })
        .eq('id', game.id);

      if (gameError) throw gameError;

      // Record the move
      const { error: moveError } = await supabase
        .from('heart_sync_moves')
        .insert({
          game_id: game.id,
          row_position: row,
          col_position: col,
          symbol: currentPlayer.playerSymbol,
          moved_by: user.id
        });

      if (moveError) throw moveError;

      // Show win modal if game ended
      if (winner && winner !== 'draw') {
        setShowWinModal(true);
      } else if (winner === 'draw') {
        toast({
          title: "💕 It's a Draw!",
          description: "Your love is perfectly balanced!",
        });
      }

    } catch (error) {
      console.error('Error making move:', error);
      toast({
        title: "Error",
        description: "Failed to make move. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Submit HeartWish reward
  const submitHeartWish = async () => {
    if (!game || !user || !heartWishQuestion.trim()) return;

    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;

    try {
      const partnerId = currentPlayer.isPlayer1 ? game.player2_id : game.player1_id;

      const { error } = await supabase
        .from('heart_sync_rewards')
        .insert({
          game_id: game.id,
          asked_by: user.id,
          asked_to: partnerId,
          question: heartWishQuestion.trim()
        });

      if (error) throw error;

      toast({
        title: "💝 HeartWish Sent!",
        description: "Your romantic question has been sent to your partner!",
      });

      setShowWinModal(false);
      setHeartWishQuestion('');
    } catch (error) {
      console.error('Error submitting HeartWish:', error);
      toast({
        title: "Error",
        description: "Failed to send HeartWish. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Answer HeartWish reward
  const answerHeartWish = async () => {
    if (!pendingReward || !rewardAnswer.trim()) return;

    try {
      const { error } = await supabase
        .from('heart_sync_rewards')
        .update({
          answered: true,
          answer: rewardAnswer.trim(),
          answered_at: new Date().toISOString()
        })
        .eq('id', pendingReward.id);

      if (error) throw error;

      toast({
        title: "💖 HeartWish Answered!",
        description: "Your loving response has been sent!",
      });

      setShowRewardModal(false);
      setPendingReward(null);
      setRewardAnswer('');
    } catch (error) {
      console.error('Error answering HeartWish:', error);
      toast({
        title: "Error",
        description: "Failed to answer HeartWish. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Load existing game
  const loadGame = useCallback(async () => {
    if (!couple) return;

    try {
      const { data, error } = await supabase
        .from('heart_sync_games')
        .select('*')
        .or(`player1_id.eq.${couple.user1_id},player2_id.eq.${couple.user1_id}`)
        .or(`player1_id.eq.${couple.user2_id},player2_id.eq.${couple.user2_id}`)
        .eq('status', 'ongoing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setGame({
          ...data,
          current_turn: data.current_turn as Player,
          winner: data.winner as Winner,
          status: data.status as GameStatus,
          board: data.board as Board
        });
      }
    } catch (error) {
      console.error('Error loading game:', error);
    }
  }, [couple]);

  // Check for pending rewards
  const checkPendingRewards = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('heart_sync_rewards')
        .select('*')
        .eq('asked_to', user.id)
        .eq('answered', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPendingReward(data);
        setShowRewardModal(true);
      }
    } catch (error) {
      console.error('Error checking pending rewards:', error);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!couple) return;

    // Subscribe to game updates
    const gameChannel = supabase
      .channel('heart_sync_games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'heart_sync_games'
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const gameData = payload.new as any;
            setGame({
              ...gameData,
              current_turn: gameData.current_turn as Player,
              winner: gameData.winner as Winner,
              status: gameData.status as GameStatus,
              board: gameData.board as Board
            });
          }
        }
      )
      .subscribe();

    // Subscribe to reward updates
    const rewardChannel = supabase
      .channel('heart_sync_rewards')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'heart_sync_rewards'
        },
        () => {
          checkPendingRewards();
        }
      )
      .subscribe();

    return () => {
      gameChannel.unsubscribe();
      rewardChannel.unsubscribe();
    };
  }, [couple, checkPendingRewards]);

  // Load game on mount
  useEffect(() => {
    loadGame();
    checkPendingRewards();
  }, [loadGame, checkPendingRewards]);

  if (!couple) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Heart className="w-6 h-6 text-primary" />
            Heart Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            You need to be connected with your partner to play Heart Sync.
          </p>
          <Button variant="outline" className="gap-2">
            <Users className="w-4 h-4" />
            Connect with Partner
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentPlayer = getCurrentPlayer();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Heart className="w-8 h-8 text-primary animate-pulse" />
            Heart Sync
            <Heart className="w-8 h-8 text-primary animate-pulse" />
          </CardTitle>
          {game && currentPlayer && (
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {currentPlayer.playerName} vs {currentPlayer.partnerName}
              </p>
              <p className="text-sm text-muted-foreground">
                Your symbol: {currentPlayer.playerSymbol} • Partner's symbol: {currentPlayer.isPlayer1 ? game.player2_symbol : game.player1_symbol}
              </p>
              <div className="flex items-center justify-center gap-2">
                {currentPlayer.isMyTurn ? (
                  <span className="text-primary font-medium animate-pulse">Your Turn!</span>
                ) : (
                  <span className="text-muted-foreground">Waiting for {currentPlayer.partnerName}...</span>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!game ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Ready for a romantic battle?</p>
              <Button onClick={startNewGame} disabled={isLoading} size="lg" className="gap-2">
                <Heart className="w-5 h-5" />
                {isLoading ? 'Starting...' : 'Start Heart Sync'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Game Board */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                {game.board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => makeMove(rowIndex, colIndex)}
                      disabled={!currentPlayer?.isMyTurn || cell !== null || game.status === 'completed'}
                      className="aspect-square w-20 h-20 border-2 border-border rounded-lg bg-card hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-3xl font-bold"
                    >
                      {cell}
                    </button>
                  ))
                )}
              </div>

              {/* Game Status */}
              {game.status === 'completed' && game.winner && (
                <div className="text-center p-4 border rounded-lg bg-accent">
                  {game.winner === 'draw' ? (
                    <p className="text-lg font-medium">💕 Perfect Balance! It's a draw!</p>
                  ) : (
                    <p className="text-lg font-medium">
                      🏆 {game.winner === 'player1' ? game.player1_name : game.player2_name} Wins!
                    </p>
                  )}
                </div>
              )}

              {/* New Game Button */}
              {game.status === 'completed' && (
                <div className="text-center">
                  <Button onClick={startNewGame} disabled={isLoading} className="gap-2">
                    <Heart className="w-4 h-4" />
                    Play Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Win Modal */}
      <Dialog open={showWinModal} onOpenChange={setShowWinModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Crown className="w-6 h-6 text-yellow-500" />
              You Won! 🎉
            </DialogTitle>
            <DialogDescription className="text-center">
              Congratulations! As the winner, you get to ask your partner a HeartWish question! 💖
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Your HeartWish Question:</label>
              <Textarea
                value={heartWishQuestion}
                onChange={(e) => setHeartWishQuestion(e.target.value)}
                placeholder="Ask anything romantic... Plan a surprise date? Share a secret? Truth or dare?"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWinModal(false)}>
              Maybe Later
            </Button>
            <Button 
              onClick={submitHeartWish} 
              disabled={!heartWishQuestion.trim()}
              className="gap-2"
            >
              <Trophy className="w-4 h-4" />
              Send HeartWish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Reward Modal */}
      <Dialog open={showRewardModal} onOpenChange={setShowRewardModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Heart className="w-6 h-6 text-primary" />
              HeartWish for You! 💝
            </DialogTitle>
            <DialogDescription className="text-center">
              Your partner won and has a special request for you!
            </DialogDescription>
          </DialogHeader>
          {pendingReward && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-accent">
                <p className="font-medium text-lg">{pendingReward.question}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Your Response:</label>
                <Textarea
                  value={rewardAnswer}
                  onChange={(e) => setRewardAnswer(e.target.value)}
                  placeholder="Your loving response..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRewardModal(false)}>
              Answer Later
            </Button>
            <Button 
              onClick={answerHeartWish} 
              disabled={!rewardAnswer.trim()}
              className="gap-2"
            >
              <Heart className="w-4 h-4" />
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};