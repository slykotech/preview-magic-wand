import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart, MessageCircle, Lightbulb, HelpCircle, Brain, Ticket, Users, Spade } from "lucide-react";
import { useCardGames } from "@/hooks/useCardGames";
import { useCoupleData } from "@/hooks/useCoupleData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const gameTypes = [
  {
    id: "card_deck",
    title: "Card Deck Game",
    subtitle: "Deep Connection",
    icon: Spade,
    secondaryIcon: Heart,
    gradient: "from-pink-400 to-purple-400",
    bgGradient: "from-pink-50 to-purple-50",
    darkBgGradient: "from-pink-950/30 to-purple-950/30",
    description: "Interactive conversation cards with dynamic timers to deepen intimacy and spark meaningful moments",
    isNew: true
  },
  {
    id: "tic_toe_heart",
    title: "Tic Toe Heart",
    subtitle: "Playful Competition",
    icon: Heart,
    secondaryIcon: Users,
    gradient: "from-purple-400 to-pink-400",
    bgGradient: "from-purple-50 to-pink-50",
    darkBgGradient: "from-purple-950/30 to-pink-950/30",
    description: "Romantic twist on classic Tic-Tac-Toe with winner rewards and heart animations"
  }
];

export const Games = () => {
  const navigate = useNavigate();
  const { createGameSession, loading } = useCardGames();
  const { coupleData } = useCoupleData();

  const handleGameSelect = async (gameType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !coupleData) return;

      if (gameType === 'card_deck') {
        // Look for existing active game session
        const { data: existingGame } = await supabase
          .from("card_deck_game_sessions")
          .select("*")
          .eq("couple_id", coupleData.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (existingGame) {
          // Join existing game
          console.log('Joining existing card deck game:', existingGame.id);
          navigate(`/games/card-deck/${existingGame.id}`);
        } else {
          // Create new game session
          console.log('Creating new card deck game session');
          const { data: newSession, error } = await supabase
            .from("card_deck_game_sessions")
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
          
          console.log('Created new card deck game session:', newSession.id);
          navigate(`/games/card-deck/${newSession.id}`);
        }
        return;
      }

      // For tic_toe_heart - check for existing session and show waiting message for single player
      const { data: existingSession } = await supabase
        .from("game_sessions")
        .select(`
          *,
          tic_toe_heart_games(*)
        `)
        .eq("couple_id", coupleData.id)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Check if we have an active session with an incomplete game
      let shouldJoinExisting = false;
      if (existingSession && existingSession.tic_toe_heart_games) {
        const gameData = Array.isArray(existingSession.tic_toe_heart_games) 
          ? existingSession.tic_toe_heart_games[0] 
          : existingSession.tic_toe_heart_games;
        // Only join if the game is still in progress (not won/draw)
        if (gameData) {
          shouldJoinExisting = gameData.game_status === 'playing';
        }
      }
      
      if (shouldJoinExisting) {
        // Join existing incomplete game
        console.log('Joining existing incomplete game session:', existingSession.id);
        navigate(`/games/${existingSession.id}`);
      } else {
        // Create new session for completed games or no existing session
        console.log('Creating new game session for:', gameType);
        const session = await createGameSession(gameType);
        if (session) {
          console.log('Created new game session:', session.id);
          // Game created and ready to play
          toast.success('Game created! Starting immediately...');
          navigate(`/games/${session.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to create game session:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-primary backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Games</h1>
          <div className="w-10" /> {/* Spacer for center alignment */}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Let's Play
          </h1>
          <h2 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            Something Sweet
            <Heart className="h-8 w-8 text-foreground fill-current" />
          </h2>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {gameTypes.map((game) => {
            const IconComponent = game.icon;
            const SecondaryIconComponent = game.secondaryIcon;
            
            return (
              <Card
                key={game.id}
                className={`relative overflow-hidden bg-gradient-to-br ${game.bgGradient} dark:${game.darkBgGradient} border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group`}
                onClick={() => handleGameSelect(game.id)}
              >
                <div className="p-6">
                  {/* Icons */}
                  <div className="flex justify-center items-center mb-4 relative">
                    <div className={`p-4 bg-gradient-to-r ${game.gradient} rounded-2xl shadow-lg mr-2 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <div className={`p-3 bg-gradient-to-r ${game.gradient} rounded-xl shadow-md opacity-80 group-hover:scale-110 transition-transform duration-300 delay-75`}>
                      <SecondaryIconComponent className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2 flex items-center justify-center gap-2">
                    {game.title}
                    {game.isNew && (
                      <span className="text-xs bg-gradient-to-r from-emerald-400 to-green-500 text-white px-2 py-1 rounded-full">
                        NEW
                      </span>
                    )}
                  </h3>

                  {/* Subtitle Badge */}
                  <div className="flex justify-center mb-4">
                    <span className={`px-4 py-2 bg-gradient-to-r ${game.gradient} text-white text-sm font-semibold rounded-full shadow-md`}>
                      {game.subtitle}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-center text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {game.description}
                  </p>
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Card>
            );
          })}
        </div>

        {/* Bottom Spacing */}
        <div className="h-20" />
      </div>
    </div>
  );
};