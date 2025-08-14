import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, X, RotateCcw, Trophy, Crown, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { toast } from 'sonner';
import { LoveGrantWinModal } from './LoveGrantWinModal';
import { LoveGrantReceivedModal } from './LoveGrantReceivedModal';

interface TicToeHeartGameProps {
  sessionId: string;
  onRematch: () => void;
  onExit: () => void;
}

type Player = 'X' | 'O';
type Cell = Player | null;
type Board = Cell[][];

interface GameState {
  board: Board;
  currentPlayer: Player;
  gameStatus: 'playing' | 'won' | 'draw';
  winner: string | null;
  user1Id: string;
  user2Id: string;
  user1Name: string;
  user2Name: string;
  user1Symbol: Player;
  user2Symbol: Player;
  user1DisplaySymbol: string;
  user2DisplaySymbol: string;
}

interface LoveGrant {
  id: string;
  game_id: string;
  couple_id: string;
  winner_user_id: string;
  winner_name: string;
  winner_symbol: string;
  request_text: string;
  status: 'pending' | 'acknowledged' | 'fulfilled' | 'declined' | 'expired' | 'cancelled';
  response_text?: string;
  created_at: string;
  expires_at: string;
  acknowledged_at?: string;
  fulfilled_at?: string;
  declined_at?: string;
  cancelled_at?: string;
}

const initialBoard: Board = Array(3).fill(null).map(() => Array(3).fill(null));

const initialGameState: GameState = {
  board: initialBoard,
  currentPlayer: 'X',
  gameStatus: 'playing',
  winner: null,
  user1Id: '',
  user2Id: '',
  user1Name: '',
  user2Name: '',
  user1Symbol: 'X',
  user2Symbol: 'O',
  user1DisplaySymbol: '💖',
  user2DisplaySymbol: '💘',
};

export const TicToeHeartGame: React.FC<TicToeHeartGameProps> = ({
  sessionId,
  onRematch,
  onExit,
}) => {
  const { user } = useAuth();
  const { coupleData, getPartnerDisplayName } = useCoupleData();
  
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'draw'>('playing');
  const [winner, setWinner] = useState<string | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showGrantReceivedModal, setShowGrantReceivedModal] = useState(false);
  const [pendingLoveGrant, setPendingLoveGrant] = useState<LoveGrant | null>(null);
  const [isGrantSubmitting, setIsGrantSubmitting] = useState(false);

  // Initialize game
  useEffect(() => {
    if (sessionId && user?.id && coupleData) {
      initializeGame();
    }
  }, [sessionId, user?.id, coupleData]);

  // Set up realtime subscription for love grants
  useEffect(() => {
    console.log('🔄 Setting up love grant realtime subscription for sessionId:', sessionId);
    
    const channel = supabase
      .channel(`love-grants-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'love_grants'
        },
        (payload) => {
          console.log('📨 New love grant received:', payload);
          const newGrant = payload.new as LoveGrant;
          
          // Show grant to the recipient (non-winner)
          if (newGrant.winner_user_id !== user?.id && newGrant.game_id === sessionId) {
            console.log('🎯 Grant is for current user, showing popup');
            setPendingLoveGrant(newGrant);
            setShowGrantReceivedModal(true);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'love_grants'
        },
        (payload) => {
          console.log('📨 Love grant updated:', payload);
          const updatedGrant = payload.new as LoveGrant;
          
          if (updatedGrant.game_id !== sessionId) return;
          
          // Handle grant status updates
          if (updatedGrant.status === 'acknowledged') {
            if (updatedGrant.winner_user_id === user?.id) {
              toast.success('Your love grant was accepted! ❤️');
            }
          } else if (updatedGrant.status === 'declined') {
            if (updatedGrant.winner_user_id === user?.id) {
              toast.error('Your love grant was declined. You can create a new one.');
              // Allow winner to create a new grant
              setShowWinModal(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Cleaning up love grant subscription');
      supabase.removeChannel(channel);
    };
  }, [sessionId, user?.id]);

  const initializeGame = async () => {
    if (!coupleData || !user?.id) return;

    try {
      // Check if game already exists
      const { data: existingGame } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (existingGame) {
        // Parse existing game data
        const sessionData = existingGame.session_data as any || {};
        const newGameState: GameState = {
          board: sessionData.board || initialBoard,
          currentPlayer: sessionData.currentPlayer || 'X',
          gameStatus: sessionData.gameStatus || 'playing',
          winner: sessionData.winner || null,
          user1Id: coupleData.user1_id,
          user2Id: coupleData.user2_id,
          user1Name: coupleData.user1_id === user.id 
            ? (user.user_metadata?.first_name || 'You') 
            : getPartnerDisplayName(),
          user2Name: coupleData.user2_id === user.id 
            ? (user.user_metadata?.first_name || 'You') 
            : getPartnerDisplayName(),
          user1Symbol: 'X',
          user2Symbol: 'O',
          user1DisplaySymbol: '💖',
          user2DisplaySymbol: '💘',
        };
        
        setGameState(newGameState);
        setCurrentPlayer(newGameState.currentPlayer);
        setGameStatus(newGameState.gameStatus);
        setWinner(newGameState.winner);
      } else {
        // Create new game
        const newGameState: GameState = {
          ...initialGameState,
          user1Id: coupleData.user1_id,
          user2Id: coupleData.user2_id,
          user1Name: coupleData.user1_id === user.id 
            ? (user.user_metadata?.first_name || 'You') 
            : getPartnerDisplayName(),
          user2Name: coupleData.user2_id === user.id 
            ? (user.user_metadata?.first_name || 'You') 
            : getPartnerDisplayName(),
        };

        await supabase
          .from('game_sessions')
          .insert({
            couple_id: coupleData.id,
            game_id: 'tic-toe-heart',
            status: 'active',
            session_data: newGameState as any
          });

        setGameState(newGameState);
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      toast.error('Failed to initialize game');
    }
  };

  const checkWinner = (board: Board): Player | null => {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return board[i][0];
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
        return board[0][i];
      }
    }

    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return board[0][0];
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return board[0][2];
    }

    return null;
  };

  const isBoardFull = (board: Board): boolean => {
    return board.every(row => row.every(cell => cell !== null));
  };

  const handleGameEnd = useCallback(async (winnerSymbol: 'X' | 'O' | null, reason: string) => {
    console.log('🎮 Game ending:', { winnerSymbol, reason, currentWinner: winner });
    
    if (gameStatus !== 'playing') {
      console.log('⚠️ Game already ended, ignoring');
      return;
    }

    try {
      let winnerUserId: string | null = null;
      let winnerName = '';
      let winnerDisplaySymbol = '';

      if (winnerSymbol) {
        // Determine winner based on symbol
        const isUser1Winner = (winnerSymbol === 'X' && gameState.user1Symbol === 'X') || 
                             (winnerSymbol === 'O' && gameState.user1Symbol === 'O');
        
        winnerUserId = isUser1Winner ? gameState.user1Id : gameState.user2Id;
        winnerName = isUser1Winner ? gameState.user1Name : gameState.user2Name;
        winnerDisplaySymbol = isUser1Winner ? gameState.user1DisplaySymbol : gameState.user2DisplaySymbol;
        
        setWinner(winnerName);
        setGameStatus('won');
        
        console.log('🏆 Winner determined:', { winnerUserId, winnerName, winnerDisplaySymbol });
        
        // Update game in database
        const { error: updateError } = await supabase
          .from('game_sessions')
          .update({ 
            status: 'completed',
            session_data: {
              ...gameState,
              winner_id: winnerUserId,
              winner_name: winnerName,
              end_reason: reason,
              completed_at: new Date().toISOString()
            } as any
          })
          .eq('id', sessionId);

        if (updateError) {
          console.error('❌ Error updating game session:', updateError);
          return;
        }

        console.log('✅ Game session updated successfully');

        // Only winner can create love grant
        if (winnerUserId === user?.id) {
          console.log('🎯 Current user is the winner, showing love grant creation modal');
          setShowWinModal(true);
        }

      } else {
        // Draw
        setGameStatus('draw');
        setWinner(null);
        
        // Update game for draw
        const { error: updateError } = await supabase
          .from('game_sessions')
          .update({ 
            status: 'completed',
            session_data: {
              ...gameState,
              end_reason: reason,
              completed_at: new Date().toISOString()
            } as any
          })
          .eq('id', sessionId);

        if (updateError) {
          console.error('❌ Error updating game session for draw:', updateError);
        }
      }
    } catch (error) {
      console.error('❌ Error in handleGameEnd:', error);
    }
  }, [gameStatus, gameState, sessionId, user?.id, winner]);

  const handleCreateLoveGrant = async (requestText: string) => {
    console.log('📝 Creating love grant with text:', requestText);
    
    if (!coupleData) {
      toast.error('Couple data not found');
      return;
    }

    setIsGrantSubmitting(true);
    
    try {
      // Get winner info
      const isUser1Winner = winner === gameState.user1Name;
      const winnerUserId = isUser1Winner ? gameState.user1Id : gameState.user2Id;
      const winnerName = isUser1Winner ? gameState.user1Name : gameState.user2Name;
      const winnerSymbol = isUser1Winner ? gameState.user1DisplaySymbol : gameState.user2DisplaySymbol;

      console.log('💝 Creating love grant:', {
        gameId: sessionId,
        coupleId: coupleData.id,
        winnerUserId,
        winnerName,
        winnerSymbol,
        requestText
      });

      const { data: newGrant, error } = await supabase
        .from('love_grants')
        .insert({
          game_id: sessionId,
          couple_id: coupleData.id,
          winner_user_id: winnerUserId,
          winner_name: winnerName,
          winner_symbol: winnerSymbol,
          request_text: requestText,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating love grant:', error);
        toast.error('Failed to create love grant');
        return;
      }

      console.log('✅ Love grant created successfully:', newGrant);
      toast.success('Love grant sent! 💝');
      
      setShowWinModal(false);
      
    } catch (error) {
      console.error('❌ Error in handleCreateLoveGrant:', error);
      toast.error('Failed to create love grant');
    } finally {
      setIsGrantSubmitting(false);
    }
  };

  const handleAcceptGrant = async () => {
    console.log('✅ Accepting love grant:', pendingLoveGrant?.id);
    
    if (!pendingLoveGrant) return;

    try {
      const { error } = await supabase
        .from('love_grants')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', pendingLoveGrant.id);

      if (error) {
        console.error('❌ Error accepting love grant:', error);
        toast.error('Failed to accept love grant');
        return;
      }

      console.log('✅ Love grant accepted successfully');
      toast.success('Love grant accepted! ❤️');
      
      setShowGrantReceivedModal(false);
      setPendingLoveGrant(null);
      
    } catch (error) {
      console.error('❌ Error in handleAcceptGrant:', error);
      toast.error('Failed to accept love grant');
    }
  };

  const handleDeclineGrant = async (reason?: string) => {
    console.log('❌ Declining love grant:', pendingLoveGrant?.id, 'with reason:', reason);
    
    if (!pendingLoveGrant) return;

    try {
      const { error } = await supabase
        .from('love_grants')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          response_text: reason || null
        })
        .eq('id', pendingLoveGrant.id);

      if (error) {
        console.error('❌ Error declining love grant:', error);
        toast.error('Failed to decline love grant');
        return;
      }

      console.log('✅ Love grant declined successfully');
      toast.success('Love grant declined');
      
      setShowGrantReceivedModal(false);
      setPendingLoveGrant(null);
      
    } catch (error) {
      console.error('❌ Error in handleDeclineGrant:', error);
      toast.error('Failed to decline love grant');
    }
  };

  const handleCellClick = async (row: number, col: number) => {
    if (gameState.board[row][col] || gameStatus !== 'playing') return;

    // Check if it's current user's turn
    const isUserTurn = (currentPlayer === 'X' && gameState.user1Id === user?.id) ||
                      (currentPlayer === 'O' && gameState.user2Id === user?.id);
    
    if (!isUserTurn) {
      toast.error("It's not your turn!");
      return;
    }

    const newBoard = gameState.board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;

    const winner = checkWinner(newBoard);
    const isDraw = !winner && isBoardFull(newBoard);

    const newGameState = {
      ...gameState,
      board: newBoard,
      currentPlayer: currentPlayer === 'X' ? 'O' as Player : 'X' as Player,
    };

    setGameState(newGameState);
    setCurrentPlayer(newGameState.currentPlayer);

    // Update database
    try {
      await supabase
        .from('game_sessions')
        .update({
          session_data: newGameState as any
        })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error updating game:', error);
    }

    if (winner) {
      handleGameEnd(winner, 'Three in a row');
    } else if (isDraw) {
      handleGameEnd(null, 'Board full');
    }
  };

  const renderCell = (row: number, col: number) => {
    const value = gameState.board[row][col];
    let displayValue = '';
    
    if (value === 'X') {
      displayValue = gameState.user1DisplaySymbol;
    } else if (value === 'O') {
      displayValue = gameState.user2DisplaySymbol;
    }

    return (
      <Button
        key={`${row}-${col}`}
        variant="outline"
        className="w-20 h-20 text-4xl p-0 hover:bg-primary/10 border-2"
        onClick={() => handleCellClick(row, col)}
        disabled={!!value || gameStatus !== 'playing'}
      >
        {displayValue}
      </Button>
    );
  };

  const getCurrentPlayerName = () => {
    if (currentPlayer === 'X') {
      return gameState.user1Id === user?.id ? 'You' : gameState.user1Name;
    } else {
      return gameState.user2Id === user?.id ? 'You' : gameState.user2Name;
    }
  };

  const getCurrentPlayerSymbol = () => {
    return currentPlayer === 'X' ? gameState.user1DisplaySymbol : gameState.user2DisplaySymbol;
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            Tic Toe Heart
            <Heart className="w-6 h-6 text-red-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Game Status */}
          <div className="text-center">
            {gameStatus === 'playing' && (
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {getCurrentPlayerName()}'s turn {getCurrentPlayerSymbol()}
              </Badge>
            )}
            {gameStatus === 'won' && winner && (
              <Badge variant="default" className="text-lg px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500">
                <Trophy className="w-4 h-4 mr-2" />
                {winner === (user?.user_metadata?.first_name || 'You') ? 'You won!' : `${winner} won!`}
                <Crown className="w-4 h-4 ml-2" />
              </Badge>
            )}
            {gameStatus === 'draw' && (
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Star className="w-4 h-4 mr-2" />
                It's a draw!
                <Star className="w-4 h-4 ml-2" />
              </Badge>
            )}
          </div>

          {/* Game Board */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {gameState.board.map((row, rowIndex) =>
              row.map((_, colIndex) => renderCell(rowIndex, colIndex))
            )}
          </div>

          {/* Game Controls */}
          {gameStatus !== 'playing' && (
            <div className="flex gap-2">
              <Button onClick={onRematch} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
              <Button variant="outline" onClick={onExit} className="flex-1">
                Exit to Games
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Love Grant Creation Modal - for winner */}
      <LoveGrantWinModal
        isOpen={showWinModal}
        onClose={() => setShowWinModal(false)}
        onSubmit={handleCreateLoveGrant}
        winnerName={winner || ''}
        isSubmitting={isGrantSubmitting}
      />

      {/* Love Grant Received Modal - for recipient */}
      {pendingLoveGrant && (
        <LoveGrantReceivedModal
          isOpen={showGrantReceivedModal}
          onClose={() => setShowGrantReceivedModal(false)}
          onAccept={handleAcceptGrant}
          onDecline={handleDeclineGrant}
          grant={pendingLoveGrant}
          isProcessing={false}
        />
      )}
    </div>
  );
};