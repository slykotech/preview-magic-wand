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
import { DebugInfo } from '@/components/CardGame/DebugInfo';

// Enhanced move interface for tracking
interface GameMove {
  id: string;
  game_id: string;
  player_id: string;
  position_row: number;
  position_col: number;
  symbol: CellValue;
  move_number: number;
  created_at: string;
}

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
  partner_response?: string;
  responded_at?: string;
  rejection_reason?: string;
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
  const [showGrantResponse, setShowGrantResponse] = useState(false);
  const [pendingGrant, setPendingGrant] = useState<LoveGrant | null>(null);
  const [winnerReward, setWinnerReward] = useState('');
  const [loveGrants, setLoveGrants] = useState<LoveGrant[]>([]);
  const [playfulMessage, setPlayfulMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [moveHistory, setMoveHistory] = useState<GameMove[]>([]);
  const [isProcessingMove, setIsProcessingMove] = useState(false);

  // Determine partner ID
  const partnerId = coupleData?.user1_id === user?.id ? coupleData?.user2_id : coupleData?.user1_id;
  
  // 🎯 FIXED: Consistent symbol assignment - 💖 for user1, 💘 for user2  
  const getUserSymbol = (userId: string): CellValue => {
    if (!coupleData) return '💖';
    return coupleData.user1_id === userId ? '💖' : '💘';
  };

  const userSymbol = getUserSymbol(user?.id || '');
  const partnerSymbol = getUserSymbol(partnerId || '');
  
  // Debug current turn state
  const debugTurnState = () => {
    if (gameState && user?.id) {
      console.log('🎮 TURN DEBUG:', {
        gameStateCurrentPlayer: gameState.current_player_id,
        currentUserId: user.id,
        partnerId: partnerId,
        isUserTurn: gameState.current_player_id === user.id,
        userSymbol,
        partnerSymbol,
        gameStatus: gameState.game_status,
        movesCount: gameState.moves_count
      });
    }
  };

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

  // Real-time subscription for game updates with enhanced sync
  useEffect(() => {
    if (!sessionId || !user?.id) {
      setConnectionStatus('disconnected');
      return;
    }

    console.log('🎮 Setting up enhanced real-time subscription for session:', sessionId);
    setConnectionStatus('connecting');

    // Add force refresh function for debugging
    const refreshGameState = async () => {
      try {
        const { data, error } = await supabase
          .from('tic_toe_heart_games')
          .select('*')
          .eq('session_id', sessionId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          console.log('🎮 🔄 Manual refresh data:', data);
          console.log('🎮 📋 Board from refresh:', data.board);
          
          // Ensure board is properly parsed
          const parsedBoard = typeof data.board === 'string' 
            ? JSON.parse(data.board) 
            : data.board;
            
          setGameState({
            ...data,
            board: parsedBoard as Board,
            game_status: data.game_status as GameStatus,
            last_move_at: data.last_move_at || new Date().toISOString()
          });
          setConnectionStatus('connected');
        }
      } catch (error) {
        console.error('🎮 ❌ Manual refresh failed:', error);
      }
    };

    const channel = supabase
      .channel(`tic-toe-game-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tic_toe_heart_games',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.group('🎮 Real-time Game Update Received');
          console.log('Event Type:', payload.eventType);
          console.log('Table:', payload.table);
          console.log('Session ID Filter:', sessionId);
          console.log('Payload:', payload);
          console.log('New Data:', payload.new);
          console.log('Old Data:', payload.old);
          console.log('Raw board data:', (payload.new as any)?.board);
          console.log('Board type:', typeof (payload.new as any)?.board);
          console.log('Timestamp:', new Date().toISOString());
          console.groupEnd();

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedState = payload.new as any;
            
            // Validate we have the right session
            if (updatedState.session_id !== sessionId) {
              console.warn('🎮 Received update for wrong session:', updatedState.session_id, 'Expected:', sessionId);
              return;
            }

            // CRITICAL: Properly parse the board from JSONB
            let parsedBoard: Board;
            try {
              if (typeof updatedState.board === 'string') {
                parsedBoard = JSON.parse(updatedState.board);
              } else if (Array.isArray(updatedState.board)) {
                parsedBoard = updatedState.board;
              } else {
                console.error('🎮 ❌ Unexpected board format:', updatedState.board);
                // Fallback: try to refresh manually
                refreshGameState();
                return;
              }
              
              console.log('🎮 📋 Parsed board:', parsedBoard);
            } catch (parseError) {
              console.error('🎮 ❌ Board parsing failed:', parseError);
              // Fallback: try to refresh manually
              refreshGameState();
              return;
            }

            const newGameState = {
              ...updatedState,
              board: parsedBoard,
              game_status: updatedState.game_status as GameStatus,
              last_move_at: updatedState.last_move_at || new Date().toISOString()
            };
            
            console.log('🎮 ✅ Applying game state update:', newGameState);
            console.log('🎮 📋 Board after parsing:', newGameState.board);
            console.log('🎮 Current turn now belongs to:', newGameState.current_player_id);
            console.log('🎮 Current user ID:', user?.id);
            console.log('🎮 Is user turn?:', newGameState.current_player_id === user?.id);
            
            // Force update game state immediately
            setGameState(newGameState);
            setConnectionStatus('connected');
            
            // Update playful message based on new turn
            const isUserTurn = newGameState.current_player_id === user?.id;
            const currentPlayerName = isUserTurn ? getUserDisplayName() : getPartnerDisplayName();
            const currentSymbol = isUserTurn ? userSymbol : partnerSymbol;
            setPlayfulMessage(getPlayfulMessage(isUserTurn, currentPlayerName || 'Player', currentSymbol));
            
            // Check for game end
            if (newGameState.game_status !== 'playing') {
              setShowCelebration(true);
              if (newGameState.winner_id === user?.id) {
                setTimeout(() => setShowLoveGrant(true), 2000);
              }
            }

            // Force re-render by updating a timestamp
            console.log('🎮 State updated successfully at:', new Date().toISOString());
          }
        }
      )
      .on('system', { event: 'CHANNEL_ERROR' }, (payload) => {
        console.error('🎮 ❌ Channel error - connection failed', payload);
        setConnectionStatus('error');
        // Try to refresh manually on channel error
        refreshGameState();
      })
      .subscribe((status) => {
        console.log('🎮 Enhanced Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          console.log('🎮 ✅ Successfully subscribed to real-time updates');
          
          // Initial refresh to ensure we have latest state
          refreshGameState();
          
          // Enhanced polling fallback with better error handling
          console.log('🎮 🔄 Starting enhanced polling fallback...');
          const pollInterval = setInterval(async () => {
            try {
              const { data: currentState } = await supabase
                .from('tic_toe_heart_games')
                .select('*')
                .eq('session_id', sessionId)
                .single();
              
              if (currentState && gameState && currentState.last_move_at !== gameState.last_move_at) {
                console.log('🎮 📊 Polling detected change, updating state');
                console.log('🎮 📋 Polling board data:', currentState.board);
                
                const parsedBoard = typeof currentState.board === 'string' 
                  ? JSON.parse(currentState.board) 
                  : currentState.board;
                  
                setGameState({
                  ...currentState,
                  board: parsedBoard as Board,
                  game_status: currentState.game_status as GameStatus
                });
              }
            } catch (error) {
              console.error('🎮 ❌ Polling error:', error);
            }
          }, 1500); // More frequent polling for better sync
          
          return () => clearInterval(pollInterval);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('🎮 ❌ Channel error - connection failed');
          setConnectionStatus('error');
          // Try manual refresh on channel error
          refreshGameState();
        }
      });

    return () => {
      console.log('🎮 🧹 Cleaning up enhanced real-time subscription');
      supabase.removeChannel(channel);
      setConnectionStatus('disconnected');
    };
  }, [sessionId, user?.id, userSymbol, partnerSymbol]);

  // Real-time subscription for love grants
  useEffect(() => {
    if (!coupleData?.id) return;

    console.log('💌 Setting up love grants real-time subscription for couple:', coupleData.id);

    const loveGrantsChannel = supabase
      .channel(`love-grants-${coupleData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'love_grants',
          filter: `couple_id=eq.${coupleData.id}`
        },
        (payload) => {
          console.log('💌 New love grant received:', payload);
          const newGrant = payload.new as any;
          
          // Add to local state immediately for real-time updates
          setLoveGrants(prev => [{
            ...newGrant,
            winner_symbol: newGrant.winner_symbol as CellValue,
            status: newGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
          }, ...prev]);
          
          // If this is for the current user and they are NOT the winner, show response modal
          if (newGrant.winner_user_id !== user?.id && newGrant.status === 'pending') {
            setPendingGrant({
              ...newGrant,
              winner_symbol: newGrant.winner_symbol as CellValue,
              status: newGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
            });
            setShowGrantResponse(true);
            toast.success(`💌 ${newGrant.winner_name} sent you a Love Grant!`);
          } else if (newGrant.winner_user_id === user?.id) {
            toast.success('💌 Love Grant sent successfully!');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'love_grants',
          filter: `couple_id=eq.${coupleData.id}`
        },
        (payload) => {
          console.log('💌 Love grant updated:', payload);
          const updatedGrant = payload.new as any;
          
          // Update local state
          setLoveGrants(prev => prev.map(grant => 
            grant.id === updatedGrant.id 
              ? {
                  ...updatedGrant,
                  winner_symbol: updatedGrant.winner_symbol as CellValue,
                  status: updatedGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
                }
              : grant
          ));
          
          // Notify the winner about the response
          if (updatedGrant.winner_user_id === user?.id) {
            if (updatedGrant.status === 'acknowledged') {
              toast.success(`💚 Your Love Grant was accepted!`);
            } else if (updatedGrant.status === 'fulfilled') {
              toast.success(`💌 Love Grant completed!`);
            } else if (updatedGrant.partner_response && updatedGrant.partner_response.includes('rejected')) {
              toast.error(`💔 Your Love Grant was rejected. ${updatedGrant.rejection_reason || 'Try another request!'}`);
              
              // Automatically show grant creation popup for winner when rejected
              setTimeout(() => {
                setShowLoveGrant(true);
                setWinnerReward('');
              }, 2000); // Show after 2 seconds to let the user see the rejection message
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('💌 Love grants subscription status:', status);
      });

    return () => {
      console.log('💌 Cleaning up love grants subscription');
      supabase.removeChannel(loveGrantsChannel);
    };
  }, [coupleData?.id, user?.id]);

  // Enhanced polling fallback when real-time fails
  useEffect(() => {
    if (connectionStatus !== 'connected' && sessionId && user?.id && gameState) {
      console.log('🎮 🔄 Starting enhanced polling fallback...');
      const pollInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('tic_toe_heart_games')
            .select('*')
            .eq('session_id', sessionId)
            .single();
          
          if (data && !error) {
            const polledGameState = {
              ...data,
              board: data.board as Board,
              game_status: data.game_status as GameStatus,
              last_move_at: data.last_move_at || new Date().toISOString()
            };
            
            // Only update if there's actually a change
            const hasChanged = (
              JSON.stringify(polledGameState.board) !== JSON.stringify(gameState.board) ||
              polledGameState.current_player_id !== gameState.current_player_id ||
              polledGameState.moves_count !== gameState.moves_count ||
              polledGameState.game_status !== gameState.game_status
            );

            if (hasChanged) {
              console.log('🎮 📊 Polling detected changes:', polledGameState);
              setGameState(polledGameState);
              
              // Update UI accordingly
              const isUserTurn = polledGameState.current_player_id === user?.id;
              const currentPlayerName = isUserTurn ? getUserDisplayName() : getPartnerDisplayName();
              const currentSymbol = isUserTurn ? userSymbol : partnerSymbol;
              setPlayfulMessage(getPlayfulMessage(isUserTurn, currentPlayerName || 'Player', currentSymbol));
            }
          }
        } catch (error) {
          console.error('🎮 ❌ Polling error:', error);
        }
      }, 3000); // Poll every 3 seconds

      return () => {
        console.log('🎮 🧹 Cleaning up enhanced polling fallback');
        clearInterval(pollInterval);
      };
    }
  }, [connectionStatus, sessionId, user?.id, gameState]);

  // Connection health monitoring
  useEffect(() => {
    const channels = supabase.getChannels();
    console.log('🎮 📡 Active channels:', channels);
    
    // Monitor auth state for connection issues
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🎮 🔐 Auth state changed:', event, !!session);
      if (event === 'SIGNED_OUT') {
        setConnectionStatus('disconnected');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update playful message when turn changes
  useEffect(() => {
    if (gameState && gameState.game_status === 'playing') {
      const isUserTurn = gameState.current_player_id === user?.id;
      const currentPlayerName = isUserTurn ? getUserDisplayName() : getPartnerDisplayName();
      const currentSymbol = isUserTurn ? userSymbol : partnerSymbol;
      setPlayfulMessage(getPlayfulMessage(isUserTurn, currentPlayerName || 'Player', currentSymbol));
      
      // Debug turn changes
      debugTurnState();
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
        const loadedState = {
          ...existingGame,
          board: existingGame.board as Board,
          game_status: existingGame.game_status as GameStatus,
          last_move_at: existingGame.last_move_at || new Date().toISOString()
        };
        setGameState(loadedState);
        
        // Debug turn state after loading
        setTimeout(() => debugTurnState(), 100);
      } else {
        // Ensure we have both user and partner before creating game
        if (!user?.id || !partnerId) {
          console.error('❌ Cannot create game: missing user or partner ID', { user: user?.id, partnerId });
          toast.error('Partner connection required to start game');
          return;
        }

        // Create new game with randomly selected first player
        const players = [user.id, partnerId];
        const randomFirstPlayer = players[Math.floor(Math.random() * players.length)];
        
        console.log('🎮 Creating new game with random first player:', {
          user: user.id,
          partner: partnerId,
          randomFirstPlayer: randomFirstPlayer,
          playerName: randomFirstPlayer === user.id ? getUserDisplayName() : getPartnerDisplayName()
        });
        
        // Use upsert to prevent duplicates if both players try to create simultaneously
        const { data: newGame, error: createError } = await supabase
          .from('tic_toe_heart_games')
          .upsert({
            session_id: sessionId,
            current_player_id: randomFirstPlayer,
            board: [
              [null, null, null],
              [null, null, null],
              [null, null, null]
            ]
          }, {
            onConflict: 'session_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Create game error:', createError);
          // If creation failed due to conflict, try to fetch the existing game
          const { data: conflictGame, error: conflictError } = await supabase
            .from('tic_toe_heart_games')
            .select('*')
            .eq('session_id', sessionId)
            .single();
          
          if (conflictError) throw createError; // Throw original error if fetch also fails
          
          console.log('🎮 Game already exists due to conflict, using existing:', conflictGame);
          const conflictState = {
            ...conflictGame,
            board: conflictGame.board as Board,
            game_status: conflictGame.game_status as GameStatus,
            last_move_at: conflictGame.last_move_at || new Date().toISOString()
          };
          setGameState(conflictState);
        } else {
          console.log('🎮 New game created:', newGame);
          const newGameState = {
            ...newGame,
            board: newGame.board as Board,
            game_status: newGame.game_status as GameStatus,
            last_move_at: newGame.last_move_at || new Date().toISOString()
          };
          setGameState(newGameState);
        }
        
        // Debug turn state after creating new game
        setTimeout(() => debugTurnState(), 100);
      }

      // Load love grants history
      await loadLoveGrants();
      
      // Load move history
      await loadMoveHistory();
    } catch (error) {
      console.error('❌ Error initializing game:', error);
      toast.error('Failed to initialize game');
    } finally {
      setLoading(false);
    }
  };

  const loadMoveHistory = async () => {
    try {
      if (!gameState?.id) return;
      
      const { data: moves, error } = await supabase
        .from('tic_toe_moves')
        .select('*')
        .eq('game_id', gameState.id)
        .order('move_number', { ascending: true });

      if (error) throw error;
      setMoveHistory((moves || []).map(move => ({
        ...move,
        symbol: move.symbol as CellValue
      })));
    } catch (error) {
      console.error('❌ Error loading move history:', error);
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
      console.log('💌 Loaded love grants:', grants);
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
          winner_user_id: grant.winner_user_id, // 🎯 FIX: Use the actual winner from grant
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
    if (isProcessingMove) {
      console.log('❌ Move already in progress');
      return;
    }

    console.group('🎮 Enhanced Move Processing');
    console.log('Player:', user?.id);
    console.log('Current Turn:', gameState?.current_player_id);
    console.log('Position:', { row, col });
    console.log('Session ID:', sessionId);
    console.log('User Symbol:', userSymbol);
    console.log('Partner ID:', partnerId);

    if (!gameState || !user?.id) {
      console.error('❌ No game state or user ID');
      toast.error("Game not ready!");
      console.groupEnd();
      return;
    }

    if (gameState.current_player_id !== user.id) {
      console.log('❌ Not user turn - Current player:', gameState.current_player_id, 'User:', user.id);
      toast.error("🚫 It's not your turn!");
      console.groupEnd();
      return;
    }

    if (gameState.board[row][col] !== null) {
      console.log('❌ Cell already occupied:', gameState.board[row][col]);
      toast.error("Cell already taken!");
      console.groupEnd();
      return;
    }

    if (gameState.game_status !== 'playing') {
      console.log('❌ Game not in playing state:', gameState.game_status);
      console.groupEnd();
      return;
    }

    try {
      setIsProcessingMove(true);
      console.log('🎮 ✅ Processing valid move at:', row, col);

      // Create optimistic board update
      const newBoard = gameState.board.map((r, rowIndex) =>
        r.map((c, colIndex) => 
          rowIndex === row && colIndex === col ? userSymbol : c
        )
      );

      // Check for winner
      const winner = checkWinner(newBoard);
      const isFull = isBoardFull(newBoard);
      
      let newStatus: GameStatus = 'playing';
      let winnerId: string | null = null;

      if (winner) {
        newStatus = 'won';
        winnerId = winner; // checkWinner already returns the correct player ID
        console.log('🎮 🏆 Winner detected:', winnerId);
      } else if (isFull) {
        newStatus = 'draw';
        console.log('🎮 🤝 Draw detected');
      }

      // Determine next player - switch turns if game is still playing
      const nextPlayerId = newStatus === 'playing' ? partnerId : gameState.current_player_id;
      
      console.log('🎮 📤 Updating database with move...');
      
      // Update the database with comprehensive error handling
      console.log('🎮 📤 Board being sent to DB:', newBoard);
      console.log('🎮 📤 Board JSON:', JSON.stringify(newBoard));
      
      const { data: updatedGame, error: updateError } = await supabase
        .from('tic_toe_heart_games')
        .update({
          board: JSON.stringify(newBoard), // Ensure proper JSON serialization
          current_player_id: nextPlayerId,
          game_status: newStatus,
          winner_id: winnerId,
          moves_count: gameState.moves_count + 1,
          last_move_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        toast.error('Failed to make move');
        console.groupEnd();
        return;
      }

      console.log('🎮 ✅ Database update successful:', updatedGame);
      
      // Record move in history
      if (gameState.id) {
        const { error: moveError } = await supabase
          .from('tic_toe_moves')
          .insert({
            game_id: gameState.id,
            player_id: user.id,
            position_row: row,
            position_col: col,
            symbol: userSymbol,
            move_number: gameState.moves_count + 1
          });

        if (moveError) {
          console.warn('⚠️ Failed to record move in history:', moveError);
          // Don't fail the move for history errors
        } else {
          console.log('📝 Move recorded in history');
        }
      }

      console.log('Move completed successfully');
      console.groupEnd();

      // Real-time subscription will handle UI updates
      toast.success("Move made successfully!");

      if (newStatus !== 'playing') {
        if (winnerId === user.id) {
          setTimeout(() => setShowLoveGrant(true), 2000);
        }
      }

    } catch (error) {
      console.error('❌ Error making move:', error);
      toast.error(`Failed to make move: ${error.message}`);
      console.groupEnd();
    } finally {
      setIsProcessingMove(false);
    }
  };

  const handleLoveGrantSubmit = async () => {
    if (!winnerReward.trim() || !gameState || !user?.id || !coupleData?.id) return;

    // 🎯 FIX: Use the actual winner_id from gameState, not always the current user
    const actualWinnerId = gameState.winner_id;
    const actualWinnerSymbol = getUserSymbol(actualWinnerId || '');
    const actualWinnerName = actualWinnerId === user.id 
      ? getUserDisplayName() || 'You'
      : getPartnerDisplayName() || 'Your Partner';

    const loveGrant: Omit<LoveGrant, 'id' | 'created_at'> = {
      couple_id: coupleData.id,
      winner_user_id: actualWinnerId || user.id, // Use actual winner
      winner_name: actualWinnerName,
      winner_symbol: actualWinnerSymbol,
      request_text: winnerReward.trim(),
      game_session_id: sessionId,
      status: 'pending'
    };

    console.log('🎯 Creating Love Grant for actual winner:', {
      actualWinnerId,
      currentUserId: user.id,
      loveGrant
    });

    await saveLoveGrant(loveGrant);
    setShowLoveGrant(false);
    setWinnerReward('');
  };

  const handleGrantResponse = async (accepted: boolean) => {
    if (!pendingGrant || !user?.id) return;

    try {
      console.log('💌 Responding to grant:', pendingGrant.id, 'Accepted:', accepted);
      
      const updateData: any = {
        responded_at: new Date().toISOString(),
        status: accepted ? 'acknowledged' : 'pending'
      };

      if (accepted) {
        updateData.partner_response = 'accepted';
        updateData.status = 'acknowledged';
      } else {
        updateData.partner_response = 'rejected';
        updateData.rejection_reason = rejectionReason || 'The request was declined. Please try another approach.';
      }

      const { error } = await supabase
        .from('love_grants')
        .update(updateData)
        .eq('id', pendingGrant.id);

      if (error) throw error;

      setShowGrantResponse(false);
      setPendingGrant(null);
      setRejectionReason('');

      if (accepted) {
        toast.success('💚 Love Grant accepted! Your partner has been notified.');
      } else {
        toast.success('💔 Love Grant declined. Your partner can try again.');
      }
    } catch (error) {
      console.error('❌ Error responding to grant:', error);
      toast.error('Failed to respond to Love Grant');
    }
  };

  const handleRematch = async () => {
    if (!gameState || !user?.id) return;

    try {
      // Randomly select first player for rematch
      const players = [user.id, partnerId];
      const randomFirstPlayer = players[Math.floor(Math.random() * players.length)];
      
      console.log('🎮 Starting rematch with random first player:', {
        user: user.id,
        partner: partnerId,
        randomFirstPlayer: randomFirstPlayer,
        playerName: randomFirstPlayer === user.id ? getUserDisplayName() : getPartnerDisplayName()
      });
      
      // Reset the game state
      const { error } = await supabase
        .from('tic_toe_heart_games')
        .update({
          board: [
            [null, null, null],
            [null, null, null],
            [null, null, null]
          ],
          current_player_id: randomFirstPlayer,
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

  if (!gameState || !gameState.board || !Array.isArray(gameState.board)) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-muted-foreground">
                {!gameState ? 'Failed to load game' : 'Invalid game board'}
              </p>
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
          {/* Connection Status Indicator */}
          <div className="flex justify-center mb-4">
            <Badge variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'connecting' ? 'secondary' : 'destructive'}>
              {connectionStatus === 'connected' && '🟢 Real-time Connected'}
              {connectionStatus === 'connecting' && '🟡 Connecting...'}
              {connectionStatus === 'disconnected' && '🔴 Offline Mode'}
            </Badge>
          </div>
          
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
              ) : (
                <div className="space-y-3">
                  <Heart className="h-8 w-8 text-pink-500 mx-auto" />
                  <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    💜 Your partner won this round!
                  </h3>
                  <p className="text-purple-600 dark:text-purple-400">
                    They've earned a 💌 Love Grant from you! 💝
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

      {/* Grant Response Modal (for losing partner) */}
      <Dialog open={showGrantResponse} onOpenChange={setShowGrantResponse}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              💌 Love Grant Received! 💝
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
              <Crown className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-purple-700 text-sm font-medium">
                {pendingGrant?.winner_name} has a request for you:
              </p>
            </div>
            
            <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
              <p className="text-gray-800 font-medium text-center">
                "{pendingGrant?.request_text}"
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-center text-sm text-muted-foreground">
                How would you like to respond?
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleGrantResponse(true)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Accept 💚
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleGrantResponse(false)}
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  💔 Decline
                </Button>
              </div>

              {/* Optional rejection reason */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Optional: Suggest something else (if declining)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="You could try asking for... (optional)"
                  className="w-full p-2 rounded border text-sm h-16 resize-none"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {rejectionReason.length}/100 characters
                </p>
              </div>
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
              {loveGrants.slice(0, 5).map((grant) => (
                <div key={grant.id} className="p-3 bg-white/50 rounded-lg border space-y-2">
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
                  
                  {/* Enhanced status display */}
                  <div className="flex items-center gap-2">
                    {grant.status === 'pending' && !grant.partner_response && (
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                        💌 Awaiting response
                      </Badge>
                    )}
                    {grant.status === 'pending' && grant.partner_response?.includes('rejected') && (
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        💔 Declined
                      </Badge>
                    )}
                    {grant.status === 'acknowledged' && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        💚 Accepted
                      </Badge>
                    )}
                    {grant.status === 'fulfilled' && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        ✨ Completed
                      </Badge>
                    )}
                    
                    {/* Show rejection reason if available */}
                    {grant.rejection_reason && grant.winner_user_id === user?.id && (
                      <span className="text-xs text-orange-600 italic">
                        💡 {grant.rejection_reason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Info - Similar to Card Game */}
      <DebugInfo 
        gameState={{
          id: sessionId,
          session_id: sessionId,
          game_id: gameState?.id,
          user1_id: coupleData?.user1_id,
          user2_id: coupleData?.user2_id,
          current_turn: gameState?.current_player_id,
          status: gameState?.game_status,
          moves_count: gameState?.moves_count,
          connection_status: connectionStatus,
          partner_online: isPartnerOnline,
          user_symbol: userSymbol,
          partner_symbol: partnerSymbol,
          partner_id: partnerId
        }}
        currentUserId={user?.id || ''}
        isMyTurn={isUserTurn}
      />
    </div>
  );
};