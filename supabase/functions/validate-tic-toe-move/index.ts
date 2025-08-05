import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MoveRequest {
  sessionId: string;
  playerId: string;
  row: number;
  col: number;
  symbol: '💖' | '💘';
}

interface GameState {
  id: string;
  session_id: string;
  board: ('💖' | '💘' | null)[][];
  current_player_id: string;
  game_status: 'playing' | 'won' | 'draw' | 'abandoned';
  winner_id: string | null;
  moves_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { sessionId, playerId, row, col, symbol }: MoveRequest = await req.json()

    // 1. Fetch current game state
    const { data: gameState, error: fetchError } = await supabaseClient
      .from('tic_toe_heart_games')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (fetchError) {
      throw new Error(`Game not found: ${fetchError.message}`)
    }

    const game = gameState as GameState

    // 2. Validate move
    const validation = validateMove(game, playerId, row, col)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Apply move
    const newBoard = [...game.board]
    newBoard[row][col] = symbol

    // 4. Check for winner or draw
    const winner = checkWinner(newBoard)
    const isDraw = !winner && newBoard.flat().every(cell => cell !== null)
    
    let newStatus: 'playing' | 'won' | 'draw' = 'playing'
    let winnerId: string | null = null

    if (winner) {
      newStatus = 'won'
      winnerId = winner === symbol ? playerId : getOtherPlayerId(game, playerId)
    } else if (isDraw) {
      newStatus = 'draw'
    }

    // 5. Determine next player
    const nextPlayerId = newStatus === 'playing' ? getOtherPlayerId(game, playerId) : game.current_player_id

    // 6. Update game state
    const { data: updatedGame, error: updateError } = await supabaseClient
      .from('tic_toe_heart_games')
      .update({
        board: newBoard,
        current_player_id: nextPlayerId,
        game_status: newStatus,
        winner_id: winnerId,
        moves_count: game.moves_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update game: ${updateError.message}`)
    }

    // 7. Record move in history
    const { error: moveError } = await supabaseClient
      .from('tic_toe_moves')
      .insert({
        game_id: game.id,
        player_id: playerId,
        position_row: row,
        position_col: col,
        symbol: symbol,
        move_number: game.moves_count + 1
      })

    if (moveError) {
      console.error('Failed to record move:', moveError)
      // Don't fail the request for move history errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        game: updatedGame,
        move: {
          player_id: playerId,
          position: { row, col },
          symbol,
          move_number: game.moves_count + 1
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Move validation error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function validateMove(
  game: GameState, 
  playerId: string, 
  row: number, 
  col: number
): { valid: boolean; error?: string } {
  // Check if game is active
  if (game.game_status !== 'playing') {
    return { valid: false, error: 'Game is not active' }
  }

  // Check if it's player's turn
  if (game.current_player_id !== playerId) {
    return { valid: false, error: 'Not your turn' }
  }

  // Check if position is valid
  if (row < 0 || row > 2 || col < 0 || col > 2) {
    return { valid: false, error: 'Invalid position' }
  }

  // Check if cell is empty
  if (game.board[row][col] !== null) {
    return { valid: false, error: 'Cell already occupied' }
  }

  return { valid: true }
}

function checkWinner(board: ('💖' | '💘' | null)[][]): '💖' | '💘' | null {
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
      return board[i][0]
    }
  }

  // Check columns
  for (let i = 0; i < 3; i++) {
    if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
      return board[0][i]
    }
  }

  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0]
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2]
  }

  return null
}

function getOtherPlayerId(game: GameState, currentPlayerId: string): string {
  // Get the partner ID from the game session
  // We need to fetch this from the couples table
  // For now, return the opposite of current player
  // This will be enhanced when we get proper session data
  return currentPlayerId
}