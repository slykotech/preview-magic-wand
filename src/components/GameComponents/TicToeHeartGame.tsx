import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Trophy, RotateCcw, MessageCircle, Sparkles, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { usePresence } from '@/hooks/usePresence';
import { useGameSession } from '@/hooks/useGameSession';
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

// Simple background celebration with winner's symbol
const WinnerCelebration = ({ winnerSymbol }: { winnerSymbol: CellValue }) => {
  if (!winnerSymbol) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-ping opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
            fontSize: `${1.5 + Math.random() * 1}rem`
          }}
        >
          {winnerSymbol}
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
  const [grantResponseMessage, setGrantResponseMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [moveHistory, setMoveHistory] = useState<GameMove[]>([]);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const loveGrantsChannelRef = useRef<any>(null);
  const gameChannelRef = useRef<any>(null);

  // Determine partner ID
  const partnerId = coupleData?.user1_id === user?.id ? coupleData?.user2_id : coupleData?.user1_id;
  
  // 🎯 FIXED: Consistent symbol assignment - 💖 for user1, 💘 for user2  
  const getUserSymbol = (userId: string): CellValue => {
    if (!coupleData) return '💖';
    return coupleData.user1_id === userId ? '💖' : '💘';
  };

  const userSymbol = getUserSymbol(user?.id || '');
  const partnerSymbol = getUserSymbol(partnerId || '');

  // Handle game state updates from unified session
  function handleGameStateUpdate(newGameState: any) {
    console.log('🎮 Tic Toe game state update:', newGameState);
    
    // Parse board if needed
    let parsedBoard: Board;
    try {
      if (Array.isArray(newGameState.board)) {
        parsedBoard = newGameState.board;
      } else if (typeof newGameState.board === 'string') {
        parsedBoard = JSON.parse(newGameState.board);
      } else {
        console.error('🎮 ❌ Unexpected board format:', newGameState.board);
        return;
      }
    } catch (parseError) {
      console.error('🎮 ❌ Board parsing failed:', parseError);
      return;
    }

    const updatedGameState: TicToeGameState = {
      id: newGameState.id,
      session_id: newGameState.session_id,
      board: parsedBoard,
      current_player_id: newGameState.current_player_id,
      game_status: newGameState.game_status as GameStatus,
      winner_id: newGameState.winner_id,
      moves_count: newGameState.moves_count,
      last_move_at: newGameState.last_move_at || new Date().toISOString()
    };
    
    setGameState(updatedGameState);
    
    // Update playful message
    const isUserTurn = updatedGameState.current_player_id === user?.id;
    const currentPlayerName = isUserTurn ? getUserDisplayName() : getPartnerDisplayName();
    const currentSymbol = isUserTurn ? userSymbol : partnerSymbol;
    setPlayfulMessage(getPlayfulMessage(isUserTurn, currentPlayerName || 'Player', currentSymbol));
    
      // Check for game end - immediate grant modal
      if (updatedGameState.game_status !== 'playing') {
        setShowCelebration(true);
        if (updatedGameState.winner_id === user?.id) {
          // Show love grant modal immediately after celebration
          setTimeout(() => setShowLoveGrant(true), 500);
        } else if (updatedGameState.winner_id && updatedGameState.winner_id !== user?.id) {
          // Check for pending love grants immediately
          setTimeout(() => checkForPendingGrants(), 500);
        }
      }
  }

  // Use unified game session management - no waiting logic
  const { connectionStatus, sendBroadcast } = useGameSession({
    sessionId,
    gameType: 'tic-toe-heart', 
    onGameStateUpdate: handleGameStateUpdate,
    onPartnerJoin: () => {
      console.log('🎮 Partner joined Tic Toe Heart game!');
      // No toast needed as game starts immediately
    },
    onError: (error) => {
      console.error('🎮 Tic Toe game session error:', error);
      toast.error('Connection error in game');
    }
  });

  // Partner is always considered connected - no waiting logic
  const isPartnerConnected = true;
  
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
      // Load love grants when component mounts
      loadLoveGrants();
      
      // Don't check for pending grants on mount - only during game flow
      // This prevents old grants from previous games showing up
    }
  }, [sessionId, user?.id, partnerId]);

  // Polling fallback for when real-time fails
  useEffect(() => {
    if (!sessionId || !user?.id || connectionStatus.status === 'connected') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('tic_toe_heart_games')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (error) throw error;
        if (data) {
          const parsedBoard = Array.isArray(data.board) ? data.board : JSON.parse(String(data.board));
          const newState: TicToeGameState = { 
            ...data, 
            board: parsedBoard,
            game_status: data.game_status as GameStatus
          };
          
            if (JSON.stringify(newState) !== JSON.stringify(gameState)) {
              setGameState(newState);
              
              // Partner connection is handled by unified session
              
              console.log('🔄 Updated via polling fallback');
            }
        }
      } catch (error) {
        console.warn('Polling fallback failed:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [sessionId, user?.id, connectionStatus.status, gameState]);

  // Set up real-time channels with proper refs for broadcasting
  useEffect(() => {
    if (!sessionId || !user?.id || !coupleData?.id) {
      return;
    }

    console.log('🎮 Setting up enhanced real-time subscription for session:', sessionId);

    // Game state channel
    const gameChannel = supabase
      .channel(`tic-toe-game-${sessionId}`, { config: { broadcast: { ack: true }}})
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
          console.log('Session ID Filter:', String(sessionId));
          console.log('Payload:', payload);
          console.log('New Data:', payload.new);
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
              if (Array.isArray(updatedState.board)) {
                parsedBoard = updatedState.board;
              } else if (typeof updatedState.board === 'string') {
                parsedBoard = JSON.parse(updatedState.board);
              } else {
                console.error('🎮 ❌ Unexpected board format:', updatedState.board);
                return;
              }
              
              console.log('🎮 📋 Parsed board:', parsedBoard);
            } catch (parseError) {
              console.error('🎮 ❌ Board parsing failed:', parseError);
              return;
            }

            const newGameState: TicToeGameState = {
              id: updatedState.id,
              session_id: updatedState.session_id,
              board: parsedBoard,
              current_player_id: updatedState.current_player_id,
              game_status: updatedState.game_status as GameStatus,
              winner_id: updatedState.winner_id,
              moves_count: updatedState.moves_count,
              last_move_at: updatedState.last_move_at || new Date().toISOString()
            };
            
            console.log('🎮 ✅ Applying game state update:', newGameState);
            console.log('🎮 Current turn now belongs to:', newGameState.current_player_id);
            console.log('🎮 Is user turn?:', newGameState.current_player_id === user?.id);
            
            // Force update game state immediately
            setGameState(newGameState as TicToeGameState);
            
            // Update playful message based on new turn
            const isUserTurn = newGameState.current_player_id === user?.id;
            const currentPlayerName = isUserTurn ? getUserDisplayName() : getPartnerDisplayName();
            const currentSymbol = isUserTurn ? userSymbol : partnerSymbol;
            setPlayfulMessage(getPlayfulMessage(isUserTurn, currentPlayerName || 'Player', currentSymbol));
            
            // Check for game end - NO LOVE GRANT LOGIC HERE
            if (newGameState.game_status !== 'playing') {
              setShowCelebration(true);
              if (newGameState.winner_id === user?.id) {
                // Winner gets immediate love grant modal
                setTimeout(() => setShowLoveGrant(true), 1500);
              }
              // Loser receives love grants via real-time broadcast - no polling needed
            }
 
            console.log('🎮 State updated successfully at:', new Date().toISOString());
          }
        }
      )
      .on('broadcast', { event: 'love_grant_created' }, (payload) => {
        console.log('💌 🎯 GAME CHANNEL: Love grant broadcast received:', payload);
        console.log('💌 🎯 Current user ID:', user?.id);
        const newGrant = (payload as any).payload;
        console.log('💌 🎯 Grant details:', newGrant);
        
        if (newGrant && newGrant.winner_user_id === user?.id && newGrant.status === 'pending') {
          console.log('💌 🎯 GAME CHANNEL: Showing love grant popup to recipient!');
          console.log('💌 🎯 Grant details:', { 
            grantId: newGrant.id, 
            recipientId: newGrant.winner_user_id, 
            currentUserId: user?.id,
            message: newGrant.request_text 
          });
          toast.success('💌 You received a love grant from your partner!');
          setPendingGrant({
            ...newGrant,
            winner_symbol: newGrant.winner_symbol as CellValue,
            status: newGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
          });
          setShowGrantResponse(true);
          
          // Also add to local state
          setLoveGrants(prev => [{
            ...newGrant,
            winner_symbol: newGrant.winner_symbol as CellValue,
            status: newGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
          }, ...prev]);
        } else {
          console.log('💌 🎯 GAME CHANNEL: Grant not for current user or not pending', {
            grantWinnerId: newGrant?.winner_user_id,
            currentUserId: user?.id,
            status: newGrant?.status,
            isForCurrentUser: newGrant?.winner_user_id === user?.id
          });
        }
      })
      .subscribe();

    // Store channel ref for broadcasting
    gameChannelRef.current = gameChannel;

    return () => {
      console.log('🎮 🧹 Cleaning up enhanced real-time subscription');
      supabase.removeChannel(gameChannel);
      gameChannelRef.current = null;
    };
  }, [sessionId, user?.id, coupleData?.id, userSymbol, partnerSymbol, getUserDisplayName, getPartnerDisplayName]);

  // Real-time subscription for love grants
  useEffect(() => {
    if (!coupleData?.id) return;

    console.log('💌 Setting up love grants real-time subscription for couple:', coupleData.id);

    const loveGrantsChannel = supabase
      .channel(`love-grants-${coupleData.id}`, { config: { broadcast: { ack: true }}})
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'love_grants',
          filter: `couple_id=eq.${coupleData.id}`
        },
        (payload) => {
          console.log('💌 🎯 DB SUBSCRIPTION: New love grant created:', payload);
          const newGrant = payload.new as any;
          
          console.log('💌 🎯 DB SUBSCRIPTION: Checking grant recipient:', {
            newGrantWinnerId: newGrant.winner_user_id,
            currentUserId: user?.id,
            isForCurrentUser: newGrant.winner_user_id !== user?.id,
            grantStatus: newGrant.status
          });
          
          // Check if this grant is for the current user (they are the recipient)
          if (newGrant.winner_user_id === user?.id && newGrant.status === 'pending') {
            console.log('💌 🎯 DB SUBSCRIPTION: Showing love grant popup to recipient!');
            console.log('💌 🎯 Grant details:', { 
              grantId: newGrant.id, 
              recipientId: newGrant.winner_user_id, 
              currentUserId: user?.id,
              message: newGrant.request_text 
            });
            toast.success('💌 You received a love grant from your partner!');
            setPendingGrant({
              ...newGrant,
              winner_symbol: newGrant.winner_symbol as CellValue,
              status: newGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
            });
            setShowGrantResponse(true);
          } else {
            console.log('💌 🎯 DB SUBSCRIPTION: Grant not for current user or not pending', {
              grantWinnerId: newGrant.winner_user_id,
              currentUserId: user?.id,
              status: newGrant.status,
              isForCurrentUser: newGrant.winner_user_id === user?.id
            });
          }
          
          // Add to local state
          setLoveGrants(prev => [{
            ...newGrant,
            winner_symbol: newGrant.winner_symbol as CellValue,
            status: newGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
          }, ...prev]);
        })
      .on('broadcast', { event: 'love_grant_created' }, (payload) => {
        console.log('💌 🎯 LOVE GRANTS CHANNEL: Broadcast received:', payload);
        console.log('💌 🎯 Current user ID:', user?.id);
        const newGrant = (payload as any).payload;
        console.log('💌 🎯 Grant details:', newGrant);
        
        if (newGrant && newGrant.winner_user_id === user?.id && newGrant.status === 'pending') {
          console.log('💌 🎯 LOVE GRANTS CHANNEL: Showing love grant popup to recipient!');
          console.log('💌 🎯 Grant details:', { 
            grantId: newGrant.id, 
            recipientId: newGrant.winner_user_id, 
            currentUserId: user?.id,
            message: newGrant.request_text 
          });
          toast.success('💌 You received a love grant from your partner!');
          setPendingGrant({
            ...newGrant,
            winner_symbol: newGrant.winner_symbol as CellValue,
            status: newGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
          });
          setShowGrantResponse(true);
          
          // Add to local state
          setLoveGrants(prev => [{
            ...newGrant,
            winner_symbol: newGrant.winner_symbol as CellValue,
            status: newGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
          }, ...prev]);
        } else {
          console.log('💌 🎯 LOVE GRANTS CHANNEL: Grant not for current user or not pending', {
            grantWinnerId: newGrant?.winner_user_id,
            currentUserId: user?.id,
            status: newGrant?.status,
            isForCurrentUser: newGrant?.winner_user_id === user?.id
          });
        }
      })
      .subscribe();

    loveGrantsChannelRef.current = loveGrantsChannel;

    return () => {
      console.log('💌 🧹 Cleaning up love grants subscription');
      if (loveGrantsChannelRef.current) {
        supabase.removeChannel(loveGrantsChannelRef.current);
      }
    };
  }, [coupleData?.id, user?.id, showGrantResponse]);

  // Auth change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🎮 🔐 Auth state changed:', event, !!session);
      // Connection status is now handled by unified session
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check for pending grants
  const checkForPendingGrants = async () => {
    if (!coupleData?.id || !user?.id) return;

    try {
      console.log('💌 Checking for pending grants for couple:', coupleData.id);
      
      const { data: pendingGrants, error } = await supabase
        .from('love_grants')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('status', 'pending')
        .neq('winner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('💌 ❌ Error checking for pending grants:', error);
        return;
      }

      console.log('💌 Found pending grants:', pendingGrants);

      if (pendingGrants && pendingGrants.length > 0) {
        const latestGrant = pendingGrants[0];
        console.log('💌 Showing pending grant to user:', latestGrant);
        
        setPendingGrant({
          ...latestGrant,
          winner_symbol: latestGrant.winner_symbol as CellValue,
          status: latestGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
        });
        setShowGrantResponse(true);
      } else {
        console.log('💌 No pending grants found');
      }
    } catch (error) {
      console.error('💌 ❌ Error in checkForPendingGrants:', error);
    }
  };

  // Initialize game state
  const initializeGame = async () => {
    try {
      setLoading(true);
      console.log('🎮 Initializing or fetching existing Tic Toe Heart game for session:', sessionId);

      // First try to find existing game
      const { data: existingGame, error: fetchError } = await supabase
        .from('tic_toe_heart_games')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (existingGame && !fetchError) {
        console.log('🎮 Found existing game state:', existingGame);
        const parsedBoard = Array.isArray(existingGame.board) ? existingGame.board : JSON.parse(String(existingGame.board));
        const loadedState: TicToeGameState = {
          ...existingGame,
          board: parsedBoard,
          game_status: existingGame.game_status as GameStatus
        };
        
        setGameState(loadedState);
        
        // Update playful message
        const isUserTurn = loadedState.current_player_id === user?.id;
        const currentPlayerName = isUserTurn ? getUserDisplayName() : getPartnerDisplayName();
        const currentSymbol = isUserTurn ? userSymbol : partnerSymbol;
        setPlayfulMessage(getPlayfulMessage(isUserTurn, currentPlayerName || 'Player', currentSymbol));
        
        // Also consider partner connected if game has progressed
        const gameHasProgressed = loadedState.moves_count > 0;
        const bothPlayersPresent = user?.id && partnerId && coupleData;
        // Partner connection is handled by unified session
        
        // Debug turn state after loading
        setTimeout(() => debugTurnState(), 100);
      } else {
        // For new games, partner hasn't joined yet
        // Partner connection is handled by unified session
        
        // Ensure we have both user and partner before creating game
        if (!user?.id || !partnerId || !coupleData) {
          console.error('🎮 ❌ Missing required data for game creation:', { user: !!user?.id, partnerId: !!partnerId, coupleData: !!coupleData });
          setLoading(false);
          return;
        }

        console.log('🎮 No existing game found, creating new game...');
        
        // Create the initial board
        const initialBoard: Board = [
          [null, null, null],
          [null, null, null],
          [null, null, null]
        ];

        // Create new game - user goes first
        const newGameData = {
          session_id: sessionId,
          board: JSON.stringify(initialBoard),
          current_player_id: user.id,
          game_status: 'playing' as GameStatus,
          winner_id: null,
          moves_count: 0
        };

        console.log('🎮 Creating new game with data:', newGameData);

        const { data: newGame, error: createError } = await supabase
          .from('tic_toe_heart_games')
          .insert(newGameData)
          .select()
          .single();

        if (createError) {
          // Check if it's a conflict (another player created at same time)
          if (createError.code === '23505') {
            console.log('🎮 Detected conflict - fetching game created by other player');
            const { data: conflictGame } = await supabase
              .from('tic_toe_heart_games')
              .select('*')
              .eq('session_id', sessionId)
              .single();
              
            if (conflictGame) {
              const parsedBoard = Array.isArray(conflictGame.board) ? conflictGame.board : JSON.parse(String(conflictGame.board));
              const conflictState: TicToeGameState = {
                ...conflictGame,
                board: parsedBoard,
                game_status: conflictGame.game_status as GameStatus
              };
              setGameState(conflictState);
              
              console.log('🎮 Using conflict game state:', conflictState);
              
              // If conflict game exists, both players have joined
              // Partner connection is handled by unified session
            } else {
              console.error('🎮 ❌ Failed to create game and no conflict game found:', createError);
            }
          } else {
            console.error('🎮 ❌ Failed to create game:', createError);
          }
        } else {
          console.log('🎮 New game created successfully:', newGame);
          const newGameState = {
            ...newGame,
            board: initialBoard,
            game_status: newGame.game_status as GameStatus
          };
          setGameState(newGameState);
          
          // Update playful message for new game
          const currentPlayerName = getUserDisplayName();
          setPlayfulMessage(getPlayfulMessage(true, currentPlayerName || 'Player', userSymbol));
          
          // Set a timer to check for partner connection after a short delay
          setTimeout(() => {
            if (user?.id && partnerId && coupleData) {
              // Partner connection is handled by unified session
            }
          }, 1000);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('🎮 ❌ Failed to initialize game:', error);
      setLoading(false);
      toast.error('Failed to initialize game');
    }
  };

  // Load existing love grants - show all couple's grants in history
  const loadLoveGrants = async () => {
    if (!coupleData?.id) return;

    try {
      const { data: grants, error } = await supabase
        .from('love_grants')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('💌 ❌ Error loading love grants:', error);
        return;
      }

      console.log('💌 Loaded existing love grants for history:', grants);
      
      setLoveGrants(grants?.map(grant => ({
        ...grant,
        winner_symbol: grant.winner_symbol as CellValue,
        status: grant.status as 'pending' | 'acknowledged' | 'fulfilled'
      })) || []);
    } catch (error) {
      console.error('💌 ❌ Error in loadLoveGrants:', error);
    }
  };

  // Handle cell click
  const handleCellClick = async (row: number, col: number) => {
    if (!gameState || !user?.id || !partnerId) {
      console.log('🎮 ❌ Cannot make move - missing game state or user info');
      return;
    }

    // Check if it's the user's turn
    if (gameState.current_player_id !== user.id) {
      console.log('🎮 ❌ Not your turn!');
      toast.info("It's not your turn! Wait for your partner 💕");
      return;
    }

    // Check if cell is already occupied
    if (gameState.board[row][col] !== null) {
      console.log('🎮 ❌ Cell already occupied');
      toast.warning("That spot is already taken! Choose another 💖");
      return;
    }

    // Check if game is still active
    if (gameState.game_status !== 'playing') {
      console.log('🎮 ❌ Game is not active');
      toast.info("Game has ended! 🎉");
      return;
    }

    if (isProcessingMove) {
      console.log('🎮 ❌ Already processing a move');
      return;
    }

    setIsProcessingMove(true);

    try {
      console.log(`🎮 Making move at [${row}, ${col}] with symbol ${userSymbol}`);

      // Create optimistic update
      const newBoard = gameState.board.map((boardRow, rowIndex) =>
        boardRow.map((cell, colIndex) =>
          rowIndex === row && colIndex === col ? userSymbol : cell
        )
      );

      const newMoveCount = gameState.moves_count + 1;
      
      // Check for win condition with the new board
      const winner = checkWinner(newBoard);
      const isDraw = !winner && newBoard.flat().every(cell => cell !== null);
      
      const newStatus: GameStatus = winner ? 'won' : (isDraw ? 'draw' : 'playing');
      const winnerId = winner ? user.id : null;
      const nextPlayerId = newStatus === 'playing' ? partnerId : gameState.current_player_id;

      console.log('🎮 Calculated move results:', {
        winner,
        isDraw,
        newStatus,
        winnerId,
        nextPlayerId,
        moveCount: newMoveCount
      });

      // Apply optimistic update immediately
      setGameState(prev => prev ? {
        ...prev,
        board: newBoard,
        current_player_id: nextPlayerId,
        game_status: newStatus,
        winner_id: winnerId,
        moves_count: newMoveCount,
        last_move_at: new Date().toISOString()
      } : null);

      // Update playful message immediately
      if (newStatus === 'playing') {
        const nextPlayerName = getPartnerDisplayName();
        setPlayfulMessage(getPlayfulMessage(false, nextPlayerName || 'Partner', partnerSymbol));
      }

      // Send move to database
      const { error: moveError } = await supabase
        .from('tic_toe_heart_games')
        .update({
          board: JSON.stringify(newBoard),
          current_player_id: nextPlayerId,
          game_status: newStatus,
          winner_id: winnerId,
          moves_count: newMoveCount,
          last_move_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (moveError) {
        console.error('🎮 ❌ Failed to save move to database:', moveError);
        toast.error('Failed to save move. Please try again.');
        
        // Revert optimistic update on error
        setGameState(gameState);
        setIsProcessingMove(false);
        return;
      }

      // Move history tracking removed for now (table doesn't exist in types)

      console.log('🎮 ✅ Move processed successfully');

      // Handle game end
      if (winner) {
        console.log('🎮 🏆 Game won by:', user.id);
        console.log('🎮 🏆 Creating automatic love grants...');
        toast.success(`🎉 You won! Amazing job! 🏆`);
        setShowCelebration(true);
        
        // Automatically create love grant for winner
        try {
          await handleGameEnd(newStatus, user.id);
          console.log('🎮 🏆 ✅ Automatic love grants created successfully');
        } catch (error) {
          console.error('🎮 🏆 ❌ Failed to create automatic love grants:', error);
        }
        
        // Winner gets to create a custom love grant
        setTimeout(() => {
          setShowLoveGrant(true);
        }, 2000);
      } else if (isDraw) {
        console.log('🎮 🤝 Game is a draw');
        toast.info('🤝 It\'s a draw! Great game!');
        setShowCelebration(true);
        
        // Handle draw scenario
        try {
          await handleGameEnd(newStatus, null);
          console.log('🎮 🤝 ✅ Draw love grants created successfully');
        } catch (error) {
          console.error('🎮 🤝 ❌ Failed to create draw love grants:', error);
        }
      } else {
        // Game continues
        toast.success(`💕 Nice move! It's your partner's turn now.`);
      }

    } catch (error) {
      console.error('🎮 ❌ Error making move:', error);
      toast.error('Failed to make move. Please try again.');
      
      // Revert optimistic update on error
      setGameState(gameState);
    } finally {
      setIsProcessingMove(false);
    }
  };

  // Check for winner
  const checkWinner = (board: Board): CellValue => {
    // Check rows
    for (let row = 0; row < 3; row++) {
      if (board[row][0] && board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
        return board[row][0];
      }
    }

    // Check columns
    for (let col = 0; col < 3; col++) {
      if (board[0][col] && board[0][col] === board[1][col] && board[1][col] === board[2][col]) {
        return board[0][col];
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

  // Handle game end logic with automatic love grants
  const handleGameEnd = async (gameStatus: GameStatus, winnerId: string | null) => {
    console.log('💌 🎯 HANDLE GAME END STARTED:', { gameStatus, winnerId, coupleId: coupleData?.id, userId: user?.id });
    
    if (!coupleData || !user?.id) {
      console.error('💌 ❌ Missing coupleData or user.id:', { coupleData: !!coupleData, userId: user?.id });
      return;
    }

    try {
      console.log('🎮 🏆 Handling game end:', { gameStatus, winnerId, coupleId: coupleData.id });

      if (gameStatus === 'won' && winnerId) {
        // Winner gets reward
        const winnerGrantData = {
          couple_id: coupleData.id,
          winner_user_id: winnerId,
          winner_name: winnerId === user.id 
            ? (getUserDisplayName() || user.email?.split('@')[0] || 'Winner')
            : (getPartnerDisplayName() || 'Partner'),
          winner_symbol: winnerId === user.id ? userSymbol : partnerSymbol,
          request_text: 'Victory in Tic Toe Heart! 💖 Ask for something special from your partner!',
          game_session_id: sessionId,
          status: 'pending' as const
        };

        const { data: winnerGrant, error: winnerError } = await supabase
          .from('love_grants')
          .insert(winnerGrantData)
          .select()
          .single();

        if (winnerError) {
          console.error('💌 ❌ Failed to create winner grant:', winnerError);
        } else {
          console.log('💌 ✅ Winner grant created:', winnerGrant);
          
          // Add to local state
          setLoveGrants(prev => [{
            ...winnerGrant,
            winner_symbol: winnerGrant.winner_symbol as CellValue,
            status: winnerGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
          }, ...prev]);

          // If this grant is for current user, show popup immediately
          if (winnerGrant.winner_user_id === user.id) {
            console.log('💌 🎯 IMMEDIATE: Showing winner grant popup to current user');
            setPendingGrant({
              ...winnerGrant,
              winner_symbol: winnerGrant.winner_symbol as CellValue,
              status: winnerGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
            });
            setShowGrantResponse(true);
          }

          // Broadcast to both players
          await broadcastLoveGrant(winnerGrant);
        }

        // Loser gets good sport points
        const loserId = winnerId === user.id ? partnerId : user.id;
        const loserGrantData = {
          couple_id: coupleData.id,
          winner_user_id: loserId,
          winner_name: loserId === user.id 
            ? (getUserDisplayName() || user.email?.split('@')[0] || 'Player')
            : (getPartnerDisplayName() || 'Partner'),
          winner_symbol: loserId === user.id ? userSymbol : partnerSymbol,
          request_text: 'Good sport! Better luck next time 💘',
          game_session_id: sessionId,
          status: 'pending' as const
        };

        const { data: loserGrant, error: loserError } = await supabase
          .from('love_grants')
          .insert(loserGrantData)
          .select()
          .single();

        if (loserError) {
          console.error('💌 ❌ Failed to create loser grant:', loserError);
        } else {
          console.log('💌 ✅ Loser grant created:', loserGrant);
          
          // Add to local state
          setLoveGrants(prev => [{
            ...loserGrant,
            winner_symbol: loserGrant.winner_symbol as CellValue,
            status: loserGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
          }, ...prev]);

          // If this grant is for current user, show popup immediately
          if (loserGrant.winner_user_id === user.id) {
            console.log('💌 🎯 IMMEDIATE: Showing loser grant popup to current user');
            setPendingGrant({
              ...loserGrant,
              winner_symbol: loserGrant.winner_symbol as CellValue,
              status: loserGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
            });
            setShowGrantResponse(true);
          }

          // Broadcast to both players
          await broadcastLoveGrant(loserGrant);
        }

      } else if (gameStatus === 'draw') {
        // Both players get participation points
        const participants = [
          { id: user.id, name: getUserDisplayName() || user.email?.split('@')[0] || 'Player', symbol: userSymbol },
          { id: partnerId, name: getPartnerDisplayName() || 'Partner', symbol: partnerSymbol }
        ];

        for (const participant of participants) {
          const participantGrantData = {
            couple_id: coupleData.id,
            winner_user_id: participant.id,
            winner_name: participant.name,
            winner_symbol: participant.symbol,
            request_text: 'Great match! It\'s a draw 💝',
            game_session_id: sessionId,
            status: 'pending' as const
          };

          const { data: participantGrant, error: participantError } = await supabase
            .from('love_grants')
            .insert(participantGrantData)
            .select()
            .single();

          if (participantError) {
            console.error('💌 ❌ Failed to create participant grant:', participantError);
          } else {
            console.log('💌 ✅ Participant grant created:', participantGrant);
            
            // Add to local state
            setLoveGrants(prev => [{
              ...participantGrant,
              winner_symbol: participantGrant.winner_symbol as CellValue,
              status: participantGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
            }, ...prev]);

            // Broadcast to both players
            await broadcastLoveGrant(participantGrant);
          }
        }
      }

    } catch (error) {
      console.error('💌 ❌ Error handling game end:', error);
    }
  };

  // Broadcast love grant to all channels
  const broadcastLoveGrant = async (grant: any) => {
    const broadcastPayload = {
      ...grant,
      winner_symbol: grant.winner_symbol as CellValue,
      status: grant.status as 'pending' | 'acknowledged' | 'fulfilled'
    };

    console.log('💌 📡 Broadcasting love grant:', broadcastPayload);

    // Send on game channel
    if (gameChannelRef.current) {
      try {
        await gameChannelRef.current.send({
          type: 'broadcast',
          event: 'love_grant_created',
          payload: broadcastPayload
        });
        console.log('💌 📡 SUCCESS: Auto-grant broadcast sent on game channel');
      } catch (error) {
        console.error('💌 ❌ Failed to broadcast auto-grant on game channel:', error);
      }
    }

    // Send on dedicated love grants channel
    if (loveGrantsChannelRef.current) {
      try {
        await loveGrantsChannelRef.current.send({
          type: 'broadcast',
          event: 'love_grant_created',
          payload: broadcastPayload
        });
        console.log('💌 📡 SUCCESS: Auto-grant broadcast sent on dedicated love grants channel');
      } catch (error) {
        console.error('💌 ❌ Failed to broadcast auto-grant on love grants channel:', error);
      }
    }

    // Send via unified session
    if (sendBroadcast) {
      try {
        await sendBroadcast('love_grant_created', broadcastPayload);
        console.log('💌 📡 SUCCESS: Auto-grant broadcast sent via unified session');
      } catch (error) {
        console.error('💌 ❌ Failed to broadcast auto-grant via unified session:', error);
      }
    }
  };

  // Create love grant
  const createLoveGrant = async () => {
    if (!winnerReward.trim() || !gameState || !user?.id || !coupleData) {
      toast.error('Please enter what you want from your partner! 💕');
      return;
    }

    try {
      console.log('💌 Creating love grant:', {
        winnerReward,
        gameState: gameState.id,
        user: user.id,
        couple: coupleData.id
      });

      const loveGrantData = {
        couple_id: coupleData.id,
        winner_user_id: user.id,
        winner_name: getUserDisplayName() || user.email?.split('@')[0] || 'Winner',
        winner_symbol: userSymbol,
        request_text: winnerReward.trim(),
        game_session_id: sessionId,
        status: 'pending' as const
      };

      const { data: newGrant, error } = await supabase
        .from('love_grants')
        .insert(loveGrantData)
        .select()
        .single();

      if (error) {
        console.error('💌 ❌ Failed to create love grant:', error);
        toast.error('Failed to create love grant. Please try again.');
        return;
      }

      console.log('💌 ✅ Love grant created successfully:', newGrant);
      
      // Add to local state immediately
      setLoveGrants(prev => [{
        ...newGrant,
        winner_symbol: newGrant.winner_symbol as CellValue,
        status: newGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
      }, ...prev]);

      // IMMEDIATE broadcast to partner on BOTH channels for maximum reliability
      const broadcastPayload = {
        ...newGrant,
        winner_symbol: newGrant.winner_symbol as CellValue,
        status: newGrant.status as 'pending' | 'acknowledged' | 'fulfilled'
      };

      // Send on game channel
      if (gameChannelRef.current) {
        try {
          await gameChannelRef.current.send({
            type: 'broadcast',
            event: 'love_grant_created',
            payload: broadcastPayload
          });
          console.log('💌 📡 SUCCESS: Broadcast sent on game channel');
        } catch (error) {
          console.error('💌 ❌ Failed to broadcast on game channel:', error);
        }
      } else {
        console.warn('💌 ⚠️ Game channel ref not available for broadcasting');
      }

      // Send on dedicated love grants channel
      if (loveGrantsChannelRef.current) {
        try {
          await loveGrantsChannelRef.current.send({
            type: 'broadcast',
            event: 'love_grant_created',
            payload: broadcastPayload
          });
          console.log('💌 📡 SUCCESS: Broadcast sent on dedicated love grants channel');
        } catch (error) {
          console.error('💌 ❌ Failed to broadcast on love grants channel:', error);
        }
      } else {
        console.warn('💌 ⚠️ Love grants channel ref not available for broadcasting');
      }

      // Triple redundancy: Also use sendBroadcast from unified session
      if (sendBroadcast) {
        try {
          await sendBroadcast('love_grant_created', broadcastPayload);
          console.log('💌 📡 SUCCESS: Broadcast sent via unified session');
        } catch (error) {
          console.error('💌 ❌ Failed to broadcast via unified session:', error);
        }
      }

      toast.success('💌 Love grant sent to your partner! 💕');
      setShowLoveGrant(false);
      setWinnerReward('');

    } catch (error) {
      console.error('💌 ❌ Error creating love grant:', error);
      toast.error('Failed to create love grant. Please try again.');
    }
  };

  // Respond to love grant
  const respondToLoveGrant = async (accepted: boolean) => {
    if (!pendingGrant || !user?.id) return;

    try {
      console.log('💌 Responding to love grant:', { 
        grantId: pendingGrant.id, 
        accepted, 
        grantResponseMessage: grantResponseMessage.trim(),
        rejectionReason: rejectionReason.trim()
      });

      const updateData = {
        status: accepted ? 'acknowledged' : 'fulfilled',
        responded_at: new Date().toISOString(),
        partner_response: accepted ? grantResponseMessage.trim() || 'Accepted! 💕' : rejectionReason.trim() || 'Not right now 💔'
      };

      const { error } = await supabase
        .from('love_grants')
        .update(updateData)
        .eq('id', pendingGrant.id);

      if (error) {
        console.error('💌 ❌ Failed to respond to love grant:', error);
        toast.error('Failed to respond. Please try again.');
        return;
      }

      console.log('💌 ✅ Successfully responded to love grant');
      
      // Update local state
      setLoveGrants(prev => prev.map(grant => 
        grant.id === pendingGrant.id 
          ? { ...grant, ...updateData, status: updateData.status as 'pending' | 'acknowledged' | 'fulfilled' }
          : grant
      ));

      if (accepted) {
        toast.success('💕 You accepted the love grant! Your partner will be thrilled!');
      } else {
        toast.info('💔 Love grant declined. Maybe next time!');
      }

      // Close modal and reset
      setShowGrantResponse(false);
      setPendingGrant(null);
      setGrantResponseMessage('');
      setRejectionReason('');

    } catch (error) {
      console.error('💌 ❌ Error responding to love grant:', error);
      toast.error('Failed to respond. Please try again.');
    }
  };

  // Get cell content
  const getCellContent = (value: CellValue, row: number, col: number) => {
    if (value) {
      return (
        <span className="text-4xl select-none animate-pulse">
          {value}
        </span>
      );
    }

    // Empty cell - show if it's user's turn and game is active
    const isUserTurn = gameState?.current_player_id === user?.id;
    const canClick = isUserTurn && gameState?.game_status === 'playing' && !isProcessingMove;
    
    return (
      <div
        className={`w-full h-full flex items-center justify-center ${
          canClick 
            ? 'hover:bg-pink-100 cursor-pointer transition-colors duration-200' 
            : ''
        }`}
        onClick={() => canClick && handleCellClick(row, col)}
      >
        {canClick && (
          <span className="text-2xl opacity-30 hover:opacity-60 transition-opacity">
            {userSymbol}
          </span>
        )}
      </div>
    );
  };

  // Reset game
  const resetGame = async () => {
    if (!gameState || !user?.id || !partnerId) return;

    try {
      console.log('🔄 Resetting game...');

      const initialBoard: Board = [
        [null, null, null],
        [null, null, null],
        [null, null, null]
      ];

      const { error } = await supabase
        .from('tic_toe_heart_games')
        .update({
          board: JSON.stringify(initialBoard),
          current_player_id: user.id, // User who resets goes first
          game_status: 'playing',
          winner_id: null,
          moves_count: 0,
          last_move_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (error) {
        console.error('🔄 ❌ Failed to reset game:', error);
        toast.error('Failed to reset game');
        return;
      }

      console.log('🔄 ✅ Game reset successfully');
      
      // Update local state
      setGameState({
        ...gameState,
        board: initialBoard,
        current_player_id: user.id,
        game_status: 'playing',
        winner_id: null,
        moves_count: 0,
        last_move_at: new Date().toISOString()
      });

      setShowCelebration(false);
      setShowLoveGrant(false);
      setShowGrantResponse(false);
      
      // Update playful message
      const currentPlayerName = getUserDisplayName();
      setPlayfulMessage(getPlayfulMessage(true, currentPlayerName || 'Player', userSymbol));

      toast.success('🔄 Game reset! Let\'s play again! 💕');

    } catch (error) {
      console.error('🔄 ❌ Error resetting game:', error);
      toast.error('Failed to reset game');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">💕</div>
          <p>Loading Tic Toe Heart...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl mb-4">Failed to load game</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show loading while initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Heart className="w-6 h-6 text-pink-500 animate-pulse" />
              Loading Game
              <Heart className="w-6 h-6 text-pink-500 animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-6xl animate-spin">💖</div>
            <p className="text-lg">Setting up your romantic game...</p>
            <p className="text-sm text-muted-foreground">
              Loading game state...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Always render the game - no waiting screen needed

  const isUserTurn = gameState.current_player_id === user?.id;
  const gameEnded = gameState.game_status !== 'playing';
  const userIsWinner = gameState.winner_id === user?.id;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Winner celebration background */}
      {showCelebration && gameState.winner_id && (
        <WinnerCelebration winnerSymbol={userIsWinner ? userSymbol : partnerSymbol} />
      )}

      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Heart className="w-6 h-6 text-pink-500" />
            Tic Toe Heart
            <Heart className="w-6 h-6 text-pink-500" />
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Game Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {/* Connection Status */}
            <div className="flex justify-center items-center gap-2">
              <Badge variant={connectionStatus.status === 'connected' ? 'default' : 'secondary'}>
                {connectionStatus.status === 'connected' ? '🟢 Connected' : 
                 connectionStatus.status === 'connecting' ? '🟡 Connecting...' : 
                 connectionStatus.status === 'error' ? '🔴 Error' : '⚪ Disconnected'}
              </Badge>
              
              {isPartnerOnline && (
                <Badge variant="outline">
                  👥 Partner Online
                </Badge>
              )}
              
              {isPartnerConnected && (
                <Badge variant="outline">
                  💕 Partner Joined
                </Badge>
              )}
            </div>

            {/* Players */}
            <div className="flex justify-center items-center gap-8">
              <div className="text-center">
                <Avatar className="mx-auto mb-2">
                  <AvatarFallback>
                    {getUserDisplayName()?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium">{getUserDisplayName() || user?.email}</p>
                <p className="text-2xl">{userSymbol}</p>
                {isUserTurn && !gameEnded && (
                  <Badge variant="default" className="mt-1">Your Turn</Badge>
                )}
                {userIsWinner && (
                  <Badge variant="default" className="mt-1 bg-yellow-500">
                    <Crown className="w-3 h-3 mr-1" />
                    Winner!
                  </Badge>
                )}
              </div>

              <div className="text-4xl">vs</div>

              <div className="text-center">
                <Avatar className="mx-auto mb-2">
                  <AvatarFallback>
                    {getPartnerDisplayName()?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium">{getPartnerDisplayName() || 'Partner'}</p>
                <p className="text-2xl">{partnerSymbol}</p>
                {!isUserTurn && !gameEnded && (
                  <Badge variant="secondary" className="mt-1">Their Turn</Badge>
                )}
                {gameState.winner_id === partnerId && (
                  <Badge variant="default" className="mt-1 bg-yellow-500">
                    <Crown className="w-3 h-3 mr-1" />
                    Winner!
                  </Badge>
                )}
              </div>
            </div>

            {/* Playful Message */}
            {playfulMessage && (
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg">
                <p className="text-lg font-medium text-center">{playfulMessage}</p>
              </div>
            )}

            {/* Game End Message */}
            {gameEnded && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg">
                {gameState.game_status === 'draw' ? (
                  <p className="text-lg font-bold text-center">🤝 It's a draw! Great game!</p>
                ) : userIsWinner ? (
                  <p className="text-lg font-bold text-center">🎉 You won! Congratulations! 🏆</p>
                ) : (
                  <p className="text-lg font-bold text-center">💔 You lost, but great game! 💕</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Game Board */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {gameState.board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="aspect-square border-2 border-pink-200 rounded-lg flex items-center justify-center bg-white hover:bg-pink-50 transition-colors"
                >
                  {getCellContent(cell, rowIndex, colIndex)}
                </div>
              ))
            )}
          </div>

          {/* Game Info */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Moves: {gameState.moves_count} | Status: {gameState.game_status}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Game Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 justify-center">
            <Button
              onClick={resetGame}
              variant="outline"
              disabled={isProcessingMove}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Game
            </Button>
            
            <Button
              onClick={onRematch}
              variant="outline"
              disabled={isProcessingMove}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              New Game
            </Button>
            
            <Button
              onClick={onExit}
              variant="outline"
              disabled={isProcessingMove}
            >
              Exit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Love Grants History */}
      {loveGrants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Love Grants History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {loveGrants.slice(0, 5).map((grant) => (
                <div
                  key={grant.id}
                  className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {grant.winner_symbol} {grant.winner_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        "{grant.request_text}"
                      </p>
                      {grant.partner_response && (
                        <p className="text-sm text-green-600 mt-1">
                          Response: "{grant.partner_response}"
                        </p>
                      )}
                    </div>
                    <Badge variant={
                      grant.status === 'pending' ? 'secondary' : 
                      grant.status === 'acknowledged' ? 'default' : 'outline'
                    }>
                      {grant.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Winner Love Grant Modal */}
      <Dialog open={showLoveGrant} onOpenChange={setShowLoveGrant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">
              🎉 You Won! Create a Love Grant 💕
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              As the winner, you get to ask your partner for something special!
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">
                What would you like from your partner? 💖
              </label>
              <textarea
                value={winnerReward}
                onChange={(e) => setWinnerReward(e.target.value)}
                placeholder="A back massage, cooking dinner, choosing the next movie..."
                className="w-full p-3 border rounded-lg resize-none"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {winnerReward.length}/200 characters
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={createLoveGrant}
                disabled={!winnerReward.trim()}
                className="flex-1"
              >
                Send Love Grant 💌
              </Button>
              <Button
                onClick={() => setShowLoveGrant(false)}
                variant="outline"
              >
                Skip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Partner Love Grant Response Modal */}
      <Dialog open={showGrantResponse} onOpenChange={setShowGrantResponse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">
              💌 Love Grant from {pendingGrant?.winner_name}
            </DialogTitle>
          </DialogHeader>
          {pendingGrant && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-6xl mb-2">{pendingGrant.winner_symbol}</p>
                <p className="text-lg font-medium">
                  {pendingGrant.winner_name} won and wants:
                </p>
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg mt-3">
                  <p className="text-lg italic">"{pendingGrant.request_text}"</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your playful response (optional):
                  </label>
                  <input
                    value={grantResponseMessage}
                    onChange={(e) => setGrantResponseMessage(e.target.value)}
                    placeholder="Of course! I'd love to... 💕"
                    className="w-full p-2 border rounded-lg"
                    maxLength={100}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    If declining, why? (optional):
                  </label>
                  <input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Maybe later... I'm busy right now 💔"
                    className="w-full p-2 border rounded-lg"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => respondToLoveGrant(true)}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  💕 Accept
                </Button>
                <Button
                  onClick={() => respondToLoveGrant(false)}
                  variant="outline"
                  className="flex-1"
                >
                  💔 Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Debug Info */}
      <DebugInfo
        gameState={gameState}
        currentUserId={user?.id || ''}
        isMyTurn={isUserTurn}
      />
    </div>
  );
};
