import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, GamepadIcon, SparklesIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { GradientHeader } from '@/components/GradientHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Games: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coupleData } = useCoupleData();

  const startTicToeHeartGame = async () => {
    if (!user || !coupleData) {
      toast.error('Please connect with your partner first');
      return;
    }

    try {
      // Check for existing active game
      const { data: existingGame } = await supabase
        .from('tic_toe_heart_games')
        .select(`
          *,
          game_sessions!inner(*)
        `)
        .eq('game_sessions.couple_id', coupleData.id)
        .eq('game_status', 'playing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingGame) {
        navigate(`/tic-toe-heart`);
      } else {
        navigate('/tic-toe-heart');
      }
    } catch (error) {
      console.error('Error checking for existing game:', error);
      navigate('/tic-toe-heart');
    }
  };

  const startCardDeckGame = async () => {
    if (!user || !coupleData) {
      toast.error('Please connect with your partner first');
      return;
    }

    try {
      // Check for existing active card game
      const { data: existingGame } = await supabase
        .from('card_deck_game_sessions')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingGame) {
        navigate(`/card-deck/${existingGame.id}`);
      } else {
        // Create new game session
        const { data: newSession, error } = await supabase
          .from('card_deck_game_sessions')
          .insert({
            couple_id: coupleData.id,
            user1_id: coupleData.user1_id,
            user2_id: coupleData.user2_id,
            current_turn: Math.random() < 0.5 ? coupleData.user1_id : coupleData.user2_id,
            game_mode: 'classic',
            status: 'active'
          })
          .select()
          .single();

        if (error) throw error;
        navigate(`/card-deck/${newSession.id}`);
      }
    } catch (error) {
      console.error('Error starting card game:', error);
      toast.error('Failed to start card game');
    }
  };

  if (!user || !coupleData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-muted-foreground">Please connect with your partner to play games</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <GradientHeader 
          title="Relationship Games 💕" 
          subtitle="Play fun games together to strengthen your bond"
          icon="🎮"
          backRoute="/"
        />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tic-Tac-Toe Heart Game */}
          <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 hover:shadow-lg transition-all duration-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                TikTok Toe Heart 💕
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Play tic-tac-toe with heart emojis! Winner gets to make a Love Grant request 💌
              </p>
              
              <div className="flex justify-center gap-2 flex-wrap">
                <Badge className="bg-pink-100 text-pink-700">Real-time</Badge>
                <Badge className="bg-purple-100 text-purple-700">Love Grants</Badge>
                <Badge className="bg-yellow-100 text-yellow-700">Quick Play</Badge>
              </div>

              <div className="text-center space-y-2">
                <div className="text-2xl space-x-2">
                  <span>💖</span>
                  <span className="text-gray-400">vs</span>
                  <span>💘</span>
                </div>
                <p className="text-xs text-muted-foreground">Classic 3x3 grid with hearts</p>
              </div>

              <Button 
                onClick={startTicToeHeartGame}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                <Heart className="w-4 h-4 mr-2" />
                Start TikTok Toe Heart
              </Button>
            </CardContent>
          </Card>

          {/* Card Deck Game */}
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 hover:shadow-lg transition-all duration-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-4">
                <GamepadIcon className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Relationship Cards 🃏
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Draw cards with fun challenges, deep questions, and romantic prompts to explore together
              </p>
              
              <div className="flex justify-center gap-2 flex-wrap">
                <Badge className="bg-orange-100 text-orange-700">Timed</Badge>
                <Badge className="bg-red-100 text-red-700">Deep Connection</Badge>
                <Badge className="bg-yellow-100 text-yellow-700">Photos</Badge>
              </div>

              <div className="text-center space-y-2">
                <div className="text-2xl space-x-2">
                  <span>💝</span>
                  <span>💭</span>
                  <span>📸</span>
                </div>
                <p className="text-xs text-muted-foreground">Romantic, Fun & Deep prompts</p>
              </div>

              <Button 
                onClick={startCardDeckGame}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                Start Card Game
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Game Rules Section */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
              📝 How to Play
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-pink-700">💕 TikTok Toe Heart</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Take turns placing 💖 or 💘 on the grid</li>
                  <li>• Get 3 in a row to win</li>
                  <li>• Winner gets to make a Love Grant request</li>
                  <li>• Partner can accept or suggest alternative</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-orange-700">🃏 Relationship Cards</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Draw cards with challenges and questions</li>
                  <li>• Complete within the time limit</li>
                  <li>• Share photos, thoughts, or do actions</li>
                  <li>• Build deeper connection together</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};