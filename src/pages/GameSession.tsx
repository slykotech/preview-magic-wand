import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GradientHeader } from '@/components/GradientHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Heart, Star, Clock, Send, RotateCcw, GamepadIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { toast } from 'sonner';

// Import specialized game components
import { TruthOrLoveGame } from '@/components/GameComponents/TruthOrLoveGame';
import { ThisOrThatGame } from '@/components/GameComponents/ThisOrThatGame';
import { MemoryMatchGame } from '@/components/GameComponents/MemoryMatchGame';
import { LoveCouponsGame } from '@/components/GameComponents/LoveCouponsGame';
import { CoupleQuizGame } from '@/components/GameComponents/CoupleQuizGame';

interface GameSession {
  id: string;
  couple_id: string;
  game_id: string;
  status: string;
  current_card_id: string | null;
  player_turn: string;
  total_cards_played: number;
  session_data: any;
  card_games: {
    name: string;
    game_type: string;
  };
}

interface GameCard {
  id: string;
  title: string;
  prompt: string;
  category: string;
  requires_action: boolean;
  time_limit_seconds: number;
}

interface CardResponse {
  id: string;
  response_text: string;
  partner_rating: number | null;
  user_id: string;
  meaningful_response: boolean;
}

export const GameSession = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coupleData, getUserDisplayName, getPartnerDisplayName } = useCoupleData();
  
  const [session, setSession] = useState<GameSession | null>(null);
  const [currentCard, setCurrentCard] = useState<GameCard | null>(null);
  const [allCards, setAllCards] = useState<GameCard[]>([]);
  const [responses, setResponses] = useState<CardResponse[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchGameSession();
    }
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      setupRealtimeSubscription();
    }
  }, [session]);

  const fetchGameSession = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select(`
          *,
          card_games (name, game_type)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch all cards for this game
      const { data: cardsData, error: cardsError } = await supabase
        .from('game_cards')
        .select('*')
        .eq('game_id', sessionData.game_id)
        .order('card_number');

      if (cardsError) throw cardsError;
      setAllCards(cardsData || []);

      // Set current card
      if (sessionData.current_card_id) {
        const currentCardData = cardsData?.find(card => card.id === sessionData.current_card_id);
        setCurrentCard(currentCardData || null);
      } else {
        // Start with first card
        const firstCard = cardsData?.[0];
        if (firstCard) {
          setCurrentCard(firstCard);
          await updateCurrentCard(firstCard.id);
        }
      }

      // Fetch responses for current card
      if (sessionData.current_card_id) {
        await fetchCardResponses(sessionData.current_card_id);
      }

    } catch (error) {
      console.error('Error fetching game session:', error);
      toast.error('Failed to load game session');
      navigate('/games');
    } finally {
      setLoading(false);
    }
  };

  const fetchCardResponses = async (cardId: string) => {
    try {
      const { data, error } = await supabase
        .from('card_responses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('card_id', cardId)
        .order('created_at');

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`game-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_responses',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          if (currentCard) {
            fetchCardResponses(currentCard.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        },
        () => {
          fetchGameSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const submitResponse = async () => {
    if (!currentResponse.trim() || !currentCard || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('card_responses')
        .insert({
          session_id: sessionId,
          card_id: currentCard.id,
          user_id: user.id,
          response_text: currentResponse.trim()
        });

      if (error) throw error;

      setCurrentResponse('');
      toast.success('Response submitted!');
      
      // Update total cards played
      await supabase
        .from('game_sessions')
        .update({ 
          total_cards_played: session!.total_cards_played + 1,
          player_turn: session!.player_turn === user.id ? 
            (coupleData?.user1_id === user.id ? coupleData.user2_id : coupleData?.user1_id) : 
            user.id
        })
        .eq('id', sessionId);

    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const updateCurrentCard = async (cardId: string) => {
    try {
      await supabase
        .from('game_sessions')
        .update({ current_card_id: cardId })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error updating current card:', error);
    }
  };

  const nextCard = async () => {
    if (!allCards.length || !currentCard) return;

    const currentIndex = allCards.findIndex(card => card.id === currentCard.id);
    const nextIndex = (currentIndex + 1) % allCards.length;
    const nextCard = allCards[nextIndex];

    setCurrentCard(nextCard);
    await updateCurrentCard(nextCard.id);
    await fetchCardResponses(nextCard.id);
    setCurrentResponse('');
  };

  const rateResponse = async (responseId: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('card_responses')
        .update({ partner_rating: rating })
        .eq('id', responseId);

      if (error) throw error;
      toast.success('Rating submitted!');
    } catch (error) {
      console.error('Error rating response:', error);
      toast.error('Failed to submit rating');
    }
  };

  const getUserResponse = () => responses.find(r => r.user_id === user?.id);
  const getPartnerResponse = () => responses.find(r => r.user_id !== user?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
        <GradientHeader 
          title="Loading Game..." 
          subtitle="Please wait while we prepare your game"
          icon={<GamepadIcon className="w-6 h-6" />}
        />
        <div className="max-w-md mx-auto p-4">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session || !currentCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
        <GradientHeader 
          title="Game Not Found" 
          subtitle="The requested game session could not be found"
          icon={<GamepadIcon className="w-6 h-6" />}
        />
      </div>
    );
  }

  const progressPercentage = allCards.length > 0 ? 
    ((allCards.findIndex(card => card.id === currentCard.id) + 1) / allCards.length) * 100 : 0;

  const userResponse = getUserResponse();
  const partnerResponse = getPartnerResponse();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      <GradientHeader 
        title={session.card_games.name}
        subtitle={`Playing with ${getPartnerDisplayName()}`}
        icon={<GamepadIcon className="w-6 h-6" />}
        backRoute="/games"
      />
      
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {allCards.findIndex(card => card.id === currentCard.id) + 1} of {allCards.length}
              </span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </CardContent>
        </Card>

        {/* Specialized Game Card Component */}
        {session.card_games.game_type === 'truth_or_love' && (
          <TruthOrLoveGame currentCard={currentCard} />
        )}
        {session.card_games.game_type === 'this_or_that' && (
          <ThisOrThatGame currentCard={currentCard} />
        )}
        {session.card_games.game_type === 'memory_match' && (
          <MemoryMatchGame currentCard={currentCard} />
        )}
        {session.card_games.game_type === 'love_coupons' && (
          <LoveCouponsGame currentCard={currentCard} />
        )}
        {session.card_games.game_type === 'couple_quiz' && (
          <CoupleQuizGame currentCard={currentCard} />
        )}
        {/* Fallback for existing games */}
        {!['truth_or_love', 'this_or_that', 'memory_match', 'love_coupons', 'couple_quiz'].includes(session.card_games.game_type) && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{currentCard.title}</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {currentCard.category}
                </Badge>
              </div>
              {currentCard.requires_action && (
                <Badge className="w-fit bg-amber-100 text-amber-800 border-amber-200">
                  Action Required
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed mb-4">
                {currentCard.prompt}
              </CardDescription>
              
              {currentCard.time_limit_seconds && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Suggested time: {Math.round(currentCard.time_limit_seconds / 60)} minutes</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User's Response */}
        {!userResponse ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Share your thoughts..."
                value={currentResponse}
                onChange={(e) => setCurrentResponse(e.target.value)}
                className="min-h-[120px]"
              />
              <Button 
                onClick={submitResponse}
                disabled={!currentResponse.trim() || submitting}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Response'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="text-lg text-emerald-800 dark:text-emerald-200">
                Your Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-emerald-700 dark:text-emerald-300">
                {userResponse.response_text}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Partner's Response */}
        {partnerResponse ? (
          <Card className="border-violet-200 bg-violet-50 dark:bg-violet-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-violet-800 dark:text-violet-200">
                  {getPartnerDisplayName()}'s Response
                </CardTitle>
                {userResponse && !partnerResponse.partner_rating && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => rateResponse(partnerResponse.id, star)}
                        className="text-yellow-400 hover:text-yellow-500 transition-colors"
                      >
                        <Star className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-violet-700 dark:text-violet-300 mb-2">
                {partnerResponse.response_text}
              </p>
              {partnerResponse.partner_rating && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Your rating:</span>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < partnerResponse.partner_rating! 
                          ? 'text-yellow-400 fill-current' 
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : userResponse ? (
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="p-6 text-center">
              <Heart className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">
                Waiting for {getPartnerDisplayName()}'s response...
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Next Card Button */}
        {userResponse && partnerResponse && (
          <Button 
            onClick={nextCard}
            className="w-full"
            size="lg"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Next Card
          </Button>
        )}
      </div>
    </div>
  );
};