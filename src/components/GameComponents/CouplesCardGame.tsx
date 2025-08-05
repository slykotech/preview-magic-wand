import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Clock, Send, Shuffle, ThumbsUp, Eye, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { usePresence } from '@/hooks/usePresence';

interface GameCard {
  id: string;
  title: string;
  prompt: string;
  category: string;
  time_limit_seconds: number;
  requires_action: boolean;
}

interface CouplesCardGameProps {
  currentCard: GameCard;
  sessionId: string;
  onSubmitResponse: (response: string) => void;
  onNextCard: () => void;
  userResponse?: string;
  partnerResponse?: string;
  isUserTurn: boolean;
}

const categories = [
  { id: 'romantic', name: '💞 Romantic', color: 'from-pink-400 to-red-400' },
  { id: 'flirty', name: '🔥 Flirty', color: 'from-orange-400 to-red-400' },
  { id: 'funny', name: '😆 Funny', color: 'from-yellow-400 to-orange-400' },
  { id: 'deep_talk', name: '🧠 Deep Talk', color: 'from-purple-400 to-blue-400' },
  { id: 'communication', name: '💬 Communication', color: 'from-blue-400 to-cyan-400' },
  { id: 'conflict_resolution', name: '💔 Healing', color: 'from-green-400 to-blue-400' },
  { id: 'compatibility', name: '🧩 Compatibility', color: 'from-indigo-400 to-purple-400' },
  { id: 'future_planning', name: '🤝 Future Dreams', color: 'from-violet-400 to-pink-400' }
];

export const CouplesCardGame: React.FC<CouplesCardGameProps> = ({
  currentCard,
  sessionId,
  onSubmitResponse,
  onNextCard,
  userResponse,
  partnerResponse,
  isUserTurn
}) => {
  const { user } = useAuth();
  const { coupleData, getPartnerDisplayName } = useCoupleData();
  const { isPartnerOnline } = usePresence(coupleData?.id);
  const [response, setResponse] = useState('');
  const [showReactions, setShowReactions] = useState(false);

  const categoryInfo = categories.find(cat => cat.id === currentCard.category) || categories[0];

  const handleSubmit = () => {
    if (response.trim()) {
      onSubmitResponse(response.trim());
      setResponse('');
    }
  };

  const handleNudge = () => {
    // TODO: Implement nudge functionality
    console.log('Nudging partner...');
  };

  const reactions = ['🔥', '😳', '😂', '🫣', '❤️'];

  return (
    <div className="space-y-6">
      {/* Live Avatars & Status */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/placeholder-avatar.jpg" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <p className="font-medium">You</p>
                <p className="text-sm text-muted-foreground">Online</p>
              </div>
            </div>

            <Heart className="h-6 w-6 text-rose-500 animate-pulse" />

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium">{getPartnerDisplayName()}</p>
                <p className="text-sm text-muted-foreground">
                  {isPartnerOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/placeholder-avatar.jpg" />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {getPartnerDisplayName()?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  isPartnerOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>
            </div>
          </div>

          {!isPartnerOnline && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={handleNudge}>
                👋 Nudge Partner
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Card */}
      <Card className={`border-0 bg-gradient-to-br ${categoryInfo.color} text-white shadow-xl`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {currentCard.title}
            </CardTitle>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {categoryInfo.name}
            </Badge>
          </div>
          {currentCard.requires_action && (
            <Badge className="w-fit bg-amber-100 text-amber-800 border-amber-200">
              ✨ Action Required
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <CardDescription className="text-white/90 text-base leading-relaxed mb-4">
            {currentCard.prompt}
          </CardDescription>
          
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Clock className="w-4 h-4" />
            <span>Suggested time: {Math.round(currentCard.time_limit_seconds / 60)} minutes</span>
          </div>
        </CardContent>
      </Card>

      {/* Your Response */}
      {!userResponse ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5" />
              Your Response
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Share your thoughts, feelings, or story..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                💖 Be authentic and let your heart speak
              </p>
              <Button 
                onClick={handleSubmit}
                disabled={!response.trim()}
                className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <ThumbsUp className="h-5 w-5" />
              Your Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
              {userResponse}
            </p>
            
            {/* Reactions */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">React:</span>
              {reactions.map((emoji, index) => (
                <button
                  key={index}
                  className="text-lg hover:scale-125 transition-transform"
                  onClick={() => console.log('React with:', emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partner's Response */}
      {partnerResponse ? (
        <Card className="border-violet-200 bg-violet-50 dark:bg-violet-950/20">
          <CardHeader>
            <CardTitle className="text-lg text-violet-800 dark:text-violet-200 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {getPartnerDisplayName()}'s Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-violet-700 dark:text-violet-300 leading-relaxed">
              {partnerResponse}
            </p>
            
            {/* Reactions */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">React:</span>
              {reactions.map((emoji, index) => (
                <button
                  key={index}
                  className="text-lg hover:scale-125 transition-transform"
                  onClick={() => console.log('React with:', emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : userResponse ? (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="p-6 text-center">
            <Heart className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">
              Waiting for {getPartnerDisplayName()}'s response...
            </p>
            {!isPartnerOnline && (
              <Button variant="outline" size="sm" className="mt-4" onClick={handleNudge}>
                👋 Send Reminder
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Next Card Button */}
      {userResponse && partnerResponse && (
        <div className="space-y-4">
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
            <p className="text-green-700 dark:text-green-300 font-medium">
              🎉 Great conversation! Ready for the next card?
            </p>
          </div>
          <Button 
            onClick={onNextCard}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            size="lg"
          >
            <ChevronRight className="w-4 h-4 mr-2" />
            Next Card
          </Button>
        </div>
      )}

      {/* Custom Card Suggestion */}
      <Card className="border-dashed border-primary/30">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            💡 Have a custom question? Add it for future games!
          </p>
          <Button variant="outline" size="sm">
            Add Custom Card
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};