import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart, MessageCircle, Lightbulb, HelpCircle, Brain, Ticket, Users, Spade } from "lucide-react";

export const Games = () => {
  const navigate = useNavigate();

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

        {/* Coming Soon Message */}
        <div className="text-center mt-16">
          <div className="p-8 bg-muted rounded-lg max-w-md mx-auto">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Games Coming Soon!</h3>
            <p className="text-muted-foreground">
              We're working on creating amazing relationship games for you and your partner. 
              Stay tuned for updates!
            </p>
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-20" />
      </div>
    </div>
  );
};