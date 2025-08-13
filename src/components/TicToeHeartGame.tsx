import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, Trophy, RotateCcw, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { usePresence } from '@/hooks/usePresence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface TicToeHeartGameProps {
  sessionId?: string;
}

interface GameState {
  id: string;
  board: any; // JSONB from database
  current_player_id: string;
  game_status: string; // Will be cast to specific types when needed
  winner_id: string | null;
  moves_count: number;
  session_id: string;
  created_at: string;
  updated_at: string;
  last_move_at: string | null;
}

interface LoveGrant {
  id: string;
  request_text: string;
  status: string; // Will be cast to specific types when needed
  winner_name: string;
  winner_symbol: string;
  created_at: string;
  partner_response?: string | null;
  rejection_reason?: string | null;
  couple_id: string;
  winner_user_id: string;
  game_session_id?: string | null;
  responded_at?: string | null;
  response_text?: string | null;
  updated_at: string;
}

export const TicToeHeartGame: React.FC<TicToeHeartGameProps> = ({ sessionId }) => {
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const { isPartnerOnline } = usePresence(coupleData?.id);
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoveGrant, setShowLoveGrant] = useState(false);
  const [loveGrantText, setLoveGrantText] = useState('');
  const [loveGrants, setLoveGrants] = useState<LoveGrant[]>([]);
  
  // Get player symbols
  const userSymbol = user?.id === coupleData?.user1_id ? '💖' : '💘';
  const partnerSymbol = userSymbol === '💖' ? '💘' : '💖';
  const isUserTurn = gameState?.current_player_id === user?.id;

  // Initialize or join game
  useEffect(() => {
    if (sessionId) {
      loadExistingGame();
    } else {
      createNewGame();
    }
  }, [sessionId]);

  // Real-time subscriptions
  useEffect(() => {
    if (!gameState) return;

    const gameChannel = supabase
      .channel(`tic_toe_game_${gameState.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tic_toe_heart_games',
          filter: `id=eq.${gameState.id}`
        },
        (payload) => {
          console.log('Game state updated:', payload);
          if (payload.new) {
            setGameState(payload.new as any);
          }
        }
      )
      .subscribe();

    const grantsChannel = supabase
      .channel(`love_grants_${coupleData?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'love_grants',
          filter: `couple_id=eq.${coupleData?.id}`
        },
        () => {
          loadLoveGrants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(grantsChannel);
    };
  }, [gameState?.id, coupleData?.id]);

  // Load love grants
  useEffect(() => {
    if (coupleData?.id) {
      loadLoveGrants();
    }
  }, [coupleData?.id]);

  const createNewGame = async () => {
    if (!user || !coupleData) return;

    try {
      // Create game session - use the actual schema fields
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          couple_id: coupleData.id,
          game_id: 'tic_toe_heart', // Using game_id instead of game_type
          status: 'active'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create game state
      const randomFirstPlayer = Math.random() < 0.5 ? coupleData.user1_id : coupleData.user2_id;
      
      const { data: game, error: gameError } = await supabase
        .from('tic_toe_heart_games')
        .insert({
          session_id: session.id,
          current_player_id: randomFirstPlayer,
          board: [[null, null, null], [null, null, null], [null, null, null]]
        })
        .select()
        .single();

      if (gameError) throw gameError;

      setGameState(game as GameState);
      setLoading(false);
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
      setLoading(false);
    }
  };

  const loadExistingGame = async () => {
    if (!sessionId) return;

    try {
      const { data: game, error } = await supabase
        .from('tic_toe_heart_games')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;
      setGameState(game as GameState);
      setLoading(false);
    } catch (error) {
      console.error('Error loading game:', error);
      toast.error('Failed to load game');
      setLoading(false);
    }
  };

  const loadLoveGrants = async () => {
    if (!coupleData?.id) return;

    try {
      const { data, error } = await supabase
        .from('love_grants')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setLoveGrants((data || []) as LoveGrant[]);
    } catch (error) {
      console.error('Error loading love grants:', error);
    }
  };

  const makeMove = async (row: number, col: number) => {
    if (!gameState || !user || gameState.game_status !== 'playing') return;
    if (gameState.current_player_id !== user.id) {
      toast.error("It's not your turn!");
      return;
    }
    if (gameState.board[row][col] !== null) {
      toast.error("Cell already taken!");
      return;
    }

    try {
      // Update board
      const newBoard = gameState.board.map((boardRow, rowIndex) =>
        boardRow.map((cell, colIndex) =>
          rowIndex === row && colIndex === col ? userSymbol : cell
        )
      );

      // Check for winner
      const winner = checkWinner(newBoard);
      const isBoardFull = newBoard.every(row => row.every(cell => cell !== null));
      
      let newStatus: 'playing' | 'won' | 'draw' = 'playing';
      let winnerId = null;

      if (winner) {
        newStatus = 'won';
        winnerId = user.id;
      } else if (isBoardFull) {
        newStatus = 'draw';
      }

      // Get partner id for next turn
      const partnerId = coupleData?.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id;

      const { error } = await supabase
        .from('tic_toe_heart_games')
        .update({
          board: newBoard,
          current_player_id: newStatus === 'playing' ? partnerId : user.id,
          game_status: newStatus,
          winner_id: winnerId,
          moves_count: gameState.moves_count + 1,
          last_move_at: new Date().toISOString()
        })
        .eq('id', gameState.id);

      if (error) throw error;

      // Record move
      await supabase
        .from('tic_toe_moves')
        .insert({
          game_id: gameState.id,
          player_id: user.id,
          position_row: row,
          position_col: col,
          symbol: userSymbol,
          move_number: gameState.moves_count + 1
        });

      if (winner) {
        setShowLoveGrant(true);
        toast.success('🎉 You won! Claim your Love Grant!');
      } else if (isBoardFull) {
        toast.success('🤝 Draw! Great game!');
      }

    } catch (error) {
      console.error('Error making move:', error);
      toast.error('Failed to make move');
    }
  };

  const checkWinner = (board: (string | null)[][]): string | null => {
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

  const submitLoveGrant = async () => {
    if (!loveGrantText.trim() || !user || !coupleData) return;

    try {
      const { error } = await supabase
        .from('love_grants')
        .insert({
          couple_id: coupleData.id,
          winner_user_id: user.id,
          winner_name: user.user_metadata?.full_name || 'You',
          winner_symbol: userSymbol,
          request_text: loveGrantText.trim(),
          status: 'pending'
        });

      if (error) throw error;

      setShowLoveGrant(false);
      setLoveGrantText('');
      toast.success('Love Grant sent! 💌');
      loadLoveGrants();
    } catch (error) {
      console.error('Error submitting love grant:', error);
      toast.error('Failed to send Love Grant');
    }
  };

  const handleRematch = async () => {
    if (!user || !coupleData) return;
    
    // Navigate back to games page to create new game
    navigate('/games');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">💕</div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-xl text-muted-foreground mb-4">Game not found</p>
            <Button onClick={() => navigate('/games')}>
              Back to Games
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            TikTok Toe Heart Game 💕
          </h1>
          {gameState.game_status === 'won' && gameState.winner_id === user?.id && (
            <Badge className="bg-green-500 text-white animate-bounce">
              🎉 You Won! 👑
            </Badge>
          )}
          {gameState.game_status === 'won' && gameState.winner_id !== user?.id && (
            <Badge className="bg-blue-500 text-white">
              Your partner won this round
            </Badge>
          )}
          {gameState.game_status === 'draw' && (
            <Badge className="bg-yellow-500 text-white">
              🤝 Draw Game!
            </Badge>
          )}
        </div>

        {/* Player Status */}
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex justify-center mb-4">
              <Badge variant="default">
                {isPartnerOnline ? '🟢 Partner Online' : '🔴 Partner Offline'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-pink-500 text-white">
                    {user?.user_metadata?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">You ({userSymbol})</p>
                  <p className={`text-sm font-medium ${
                    isUserTurn ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    {isUserTurn ? '🎯 Your Turn' : 'Waiting...'}
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
                  <p className="font-medium">Partner ({partnerSymbol})</p>
                  <p className={`text-sm font-medium ${
                    !isUserTurn ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    {!isUserTurn ? '🎯 Their Turn' : 'Waiting...'}
                  </p>
                </div>
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-purple-500 text-white">
                    P
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Board */}
        <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Game Board
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {/* Game Board Grid */}
            <div className="grid grid-cols-3 gap-2 max-w-[300px] mx-auto mb-6">
              {gameState.board.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      aspect-square bg-white rounded-lg border-2 border-gray-200
                      flex items-center justify-center text-4xl
                      transition-all duration-200 hover:border-pink-300
                      ${cell ? 'cursor-default' : 'cursor-pointer hover:bg-pink-50'}
                      ${!isUserTurn || gameState.game_status !== 'playing' ? 'cursor-not-allowed' : ''}
                    `}
                    onClick={() => makeMove(rowIndex, colIndex)}
                    disabled={!!cell || !isUserTurn || gameState.game_status !== 'playing'}
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

            {/* Game Status Message */}
            <div className="text-center p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-pink-200">
              <p className="text-purple-700 font-medium">
            {gameState.game_status === 'playing' && isUserTurn && "💫 Your turn! Choose a cell"}
                {gameState.game_status === 'playing' && !isUserTurn && "⏳ Waiting for your partner..."}
                {gameState.game_status === 'won' && gameState.winner_id === user?.id && "🎉 You won! Claim your Love Grant below!"}
                {gameState.game_status === 'won' && gameState.winner_id !== user?.id && "Your partner won this round! 💕"}
                {gameState.game_status === 'draw' && "🤝 Draw game! Good match!"}
              </p>
            </div>

            {/* Winner Celebration */}
            {gameState.game_status === 'won' && gameState.winner_id === user?.id && (
              <div className="text-center p-6 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg border-2 border-pink-300 mt-6">
                <div className="space-y-3">
                  <div className="flex justify-center items-center gap-2">
                    <Sparkles className="h-6 w-6 text-yellow-500 animate-spin" />
                    <Crown className="h-8 w-8 text-yellow-500" />
                    <Sparkles className="h-6 w-6 text-yellow-500 animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-pink-700">
                    🎉 Congratulations! You Won! 🎉
                  </h3>
                  <p className="text-pink-600">
                    As the winner, you've earned a 💌 Love Grant! ✨
                  </p>
                </div>
              </div>
            )}

            {/* Game Controls */}
            <div className="flex gap-3 justify-center mt-6">
              {gameState.game_status === 'won' && gameState.winner_id === user?.id && (
                <Button 
                  onClick={() => setShowLoveGrant(true)}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Claim Love Grant 💌
                </Button>
              )}
              <Button 
                onClick={handleRematch}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                New Game 💞
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Love Grants History */}
        {loveGrants.length > 0 && (
          <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-pink-50">
            <CardHeader>
              <CardTitle className="text-lg text-yellow-800 flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Recent Love Grants 💌
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {loveGrants.map((grant) => (
                  <div key={grant.id} className="p-3 bg-white/50 rounded-lg border space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-sm">{grant.winner_name} {grant.winner_symbol}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(grant.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      "{grant.request_text}"
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${
                        grant.status === 'acknowledged' ? 'bg-green-100 text-green-800' :
                        grant.status === 'fulfilled' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {grant.status === 'acknowledged' && '💚 Accepted'}
                        {grant.status === 'fulfilled' && '✨ Completed'}
                        {grant.status === 'pending' && '⏳ Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                value={loveGrantText}
                onChange={(e) => setLoveGrantText(e.target.value)}
                placeholder="Ask a meaningful question, make a request, or suggest something romantic..."
                className="w-full p-3 rounded-lg border resize-none h-24"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {loveGrantText.length}/200 characters
              </p>
              
              <Button 
                onClick={submitLoveGrant}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                disabled={!loveGrantText.trim()}
              >
                <Heart className="w-4 h-4 mr-2" />
                Send Love Grant 💌
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};