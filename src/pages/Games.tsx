import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart, MessageCircle, Lightbulb, HelpCircle, Brain, Ticket, Users } from "lucide-react";
import { useCardGames } from "@/hooks/useCardGames";

const gameTypes = [
  {
    id: "truth_or_love",  // Updated to match database
    title: "Truth or Love",
    subtitle: "Deep Talk",
    icon: Heart,
    secondaryIcon: MessageCircle,
    gradient: "from-pink-400 to-red-400",
    bgGradient: "from-pink-50 to-red-50",
    darkBgGradient: "from-pink-950/30 to-red-950/30",
    description: "Honest conversations that deepen your connection"
  },
  {
    id: "this_or_that",  // Updated to match database
    title: "This or That",
    subtitle: "Fun",
    icon: Lightbulb,
    secondaryIcon: HelpCircle,
    gradient: "from-yellow-400 to-orange-400",
    bgGradient: "from-yellow-50 to-orange-50", 
    darkBgGradient: "from-yellow-950/30 to-orange-950/30",
    description: "Fun choices that reveal your preferences"
  },
  {
    id: "memory_match",  // Updated to match database
    title: "Memory Match", 
    subtitle: "Bonding",
    icon: Brain,
    secondaryIcon: Heart,
    gradient: "from-purple-400 to-pink-400",
    bgGradient: "from-purple-50 to-pink-50",
    darkBgGradient: "from-purple-950/30 to-pink-950/30", 
    description: "Test how well you know each other"
  },
  {
    id: "love_coupons",  // Updated to match database
    title: "Love Coupons",
    subtitle: "Romantic", 
    icon: Ticket,
    secondaryIcon: Heart,
    gradient: "from-pink-400 to-rose-400",
    bgGradient: "from-pink-50 to-rose-50",
    darkBgGradient: "from-pink-950/30 to-rose-950/30",
    description: "Create romantic gestures for each other"
  },
  {
    id: "couple_quiz",  // Updated to match database
    title: "Couple Quiz",
    subtitle: "Knowledge",
    icon: Users, 
    secondaryIcon: HelpCircle,
    gradient: "from-blue-400 to-indigo-400",
    bgGradient: "from-blue-50 to-indigo-50",
    darkBgGradient: "from-blue-950/30 to-indigo-950/30",
    description: "Test your knowledge about each other"
  }
];

export const Games = () => {
  const navigate = useNavigate();
  const { createGameSession, loading } = useCardGames();

  const handleGameSelect = async (gameType: string) => {
    try {
      const session = await createGameSession(gameType);
      if (session) {
        navigate(`/games/${session.id}`);
      }
    } catch (error) {
      console.error('Failed to create game session:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-rose-100 dark:from-gray-900 dark:via-purple-950/20 dark:to-pink-950/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-pink-200 dark:border-pink-800">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="hover:bg-pink-100 dark:hover:bg-pink-900/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-pink-900 dark:text-pink-100">Games</h1>
          <div className="w-10" /> {/* Spacer for center alignment */}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Let's Play
          </h1>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-rose-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
            Something Sweet
            <Heart className="h-8 w-8 text-rose-500 fill-rose-500" />
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
                  <h3 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">
                    {game.title}
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