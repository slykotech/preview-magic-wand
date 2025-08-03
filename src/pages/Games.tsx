import React, { useState, useEffect } from 'react';
import { GradientHeader } from '@/components/GradientHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Heart, Users, Clock, Sparkles, GamepadIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { useCardGames } from '@/hooks/useCardGames';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CardGame {
  id: string;
  name: string;
  description: string;
  game_type: string;
  estimated_duration_minutes: number;
  difficulty_level: string;
  lgbtq_inclusive: boolean;
}

export const Games = () => {
  const [games, setGames] = useState<CardGame[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const { createGameSession, activeSessions, recentAchievements } = useCardGames();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('card_games')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const startGame = async (gameId: string) => {
    if (!user || !coupleData?.id) {
      toast.error('Please ensure you have a partner connection to play games');
      return;
    }

    try {
      const session = await createGameSession(gameId);
      toast.success('Game session started!');
      navigate(`/games/${session.id}`);
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Failed to start game session');
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'intermediate': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'advanced': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'identity_dreams': return <Sparkles className="w-8 h-8" />;
      case 'love_language_lab': return <Heart className="w-8 h-8" />;
      default: return <Gamepad2 className="w-8 h-8" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      <GradientHeader 
        title="Relationship Games"
        subtitle="Strengthen your connection through playful interaction"
        icon={<GamepadIcon className="w-6 h-6" />}
      />
        <div className="max-w-md mx-auto p-4 space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
        <GradientHeader 
          title="Relationship Games"
          subtitle="Strengthen your connection through playful interaction"
          icon={<GamepadIcon className="w-6 h-6" />}
        />
      
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* LGBTQ+ Inclusive Banner */}
        <Card className="border-2 border-transparent bg-gradient-to-r from-violet-100 to-pink-100 dark:from-violet-950/30 dark:to-pink-950/30 relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Inclusive by Design</h3>
                <p className="text-sm text-muted-foreground">
                  Games designed for all relationship types and identities
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Games List */}
        <div className="space-y-4">
          {games.map((game) => (
            <Card key={game.id} className="group hover-scale transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-primary text-white">
                      {getGameIcon(game.game_type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{game.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={getDifficultyColor(game.difficulty_level)}
                        >
                          {game.difficulty_level}
                        </Badge>
                        {game.lgbtq_inclusive && (
                          <Badge variant="outline" className="bg-gradient-to-r from-violet-100 to-pink-100 text-violet-800 border-violet-200">
                            LGBTQ+ Inclusive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <CardDescription className="text-base leading-relaxed">
                  {game.description}
                </CardDescription>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{game.estimated_duration_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>2 players</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => startGame(game.id)}
                    className="group-hover:scale-105 transition-transform duration-200"
                    disabled={!coupleData?.id}
                  >
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    Start Game
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {games.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Games Available</h3>
              <p className="text-muted-foreground">
                Check back soon for exciting relationship games!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};