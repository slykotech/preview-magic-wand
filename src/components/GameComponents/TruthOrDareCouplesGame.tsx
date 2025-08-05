import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  HelpCircle, 
  Lightbulb, 
  RotateCcw, 
  Camera, 
  Send, 
  Trophy,
  CheckCircle,
  Heart,
  Star
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { usePresence } from '@/hooks/usePresence';

type SpinResult = 'truth' | 'dare';
type GamePhase = 'waiting' | 'spinning' | 'prompt' | 'responding' | 'completed';

interface TruthOrDareCouplesGameProps {
  sessionId: string;
  isUserTurn: boolean;
  onSubmitResponse: (response: string, proof?: File) => void;
  onNextRound: () => void;
  gameData?: {
    phase: GamePhase;
    currentPrompt?: string;
    promptType?: SpinResult;
    userScore: number;
    partnerScore: number;
    round: number;
    maxRounds: number;
  };
}

const themes = [
  { id: 'mixed', name: '🎭 Mixed Fun', description: 'A bit of everything!' },
  { id: 'flirty', name: '🔥 Flirty', description: 'Spice things up' },
  { id: 'romantic', name: '💕 Romantic', description: 'Sweet and loving' },
  { id: 'spicy', name: '🌶️ Spicy', description: 'Turn up the heat' },
  { id: 'silly', name: '😄 Silly', description: 'Laugh together' },
  { id: 'deep', name: '🧠 Deep Talk', description: 'Meaningful conversations' }
];

const sampleTruths = {
  flirty: [
    "What's the most romantic thing you've ever wanted me to do?",
    "When did you first realize you were attracted to me?",
    "What's your favorite thing about my appearance?"
  ],
  romantic: [
    "What's your favorite memory of us together?",
    "How do you envision our future in 5 years?",
    "What made you fall in love with me?"
  ],
  deep: [
    "What's something you've never told me about yourself?",
    "What are you most afraid of in our relationship?",
    "What's your biggest dream for us as a couple?"
  ],
  silly: [
    "If we were cartoon characters, which ones would we be?",
    "What's the weirdest habit you think I have?",
    "If you could give me a new nickname, what would it be?"
  ]
};

const sampleDares = {
  flirty: [
    "Send me a selfie with your most seductive look",
    "Text me using only emojis for the next hour",
    "Do 10 push-ups while saying why you love me"
  ],
  romantic: [
    "Write me a short love poem right now",
    "Send me a voice message singing our song",
    "Take a photo of something that reminds you of me"
  ],
  silly: [
    "Do your best impression of me",
    "Dance like no one's watching for 30 seconds",
    "Make the weirdest face you can and take a selfie"
  ]
};

export const TruthOrDareCouplesGame: React.FC<TruthOrDareCouplesGameProps> = ({
  sessionId,
  isUserTurn,
  onSubmitResponse,
  onNextRound,
  gameData
}) => {
  const { user } = useAuth();
  const { coupleData, getPartnerDisplayName } = useCoupleData();
  const { isPartnerOnline } = usePresence(coupleData?.id);
  
  const [selectedTheme, setSelectedTheme] = useState('mixed');
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [userScore, setUserScore] = useState(0);
  const [partnerScore, setPartnerScore] = useState(0);
  const [round, setRound] = useState(1);
  const [showWinnerReward, setShowWinnerReward] = useState(false);
  const [winnerReward, setWinnerReward] = useState('');

  const maxRounds = 10;

  // Initialize from game data
  useEffect(() => {
    if (gameData) {
      setPhase(gameData.phase);
      setCurrentPrompt(gameData.currentPrompt || '');
      setSpinResult(gameData.promptType || null);
      setUserScore(gameData.userScore);
      setPartnerScore(gameData.partnerScore);
      setRound(gameData.round);
    }
  }, [gameData]);

  const handleSpin = () => {
    setIsSpinning(true);
    setPhase('spinning');
    
    // Simulate spinning animation
    setTimeout(() => {
      const result: SpinResult = Math.random() > 0.5 ? 'truth' : 'dare';
      setSpinResult(result);
      
      // Get random prompt based on theme and result
      const prompts = result === 'truth' ? sampleTruths : sampleDares;
      const themePrompts = prompts[selectedTheme as keyof typeof prompts] || prompts.silly;
      const randomPrompt = themePrompts[Math.floor(Math.random() * themePrompts.length)];
      
      setCurrentPrompt(randomPrompt);
      setIsSpinning(false);
      setPhase('prompt');
    }, 2000);
  };

  const handleSubmit = () => {
    if (response.trim()) {
      onSubmitResponse(response.trim(), proofFile || undefined);
      setResponse('');
      setProofFile(null);
      setPhase('completed');
      
      // Update score (simplified scoring)
      if (isUserTurn) {
        setUserScore(prev => prev + 1);
      } else {
        setPartnerScore(prev => prev + 1);
      }
      
      // Check if game is finished
      if (round >= maxRounds) {
        const winner = userScore >= partnerScore ? 'user' : 'partner';
        if (winner === 'user') {
          setShowWinnerReward(true);
        }
      }
    }
  };

  const handleNextRound = () => {
    setRound(prev => prev + 1);
    setPhase('waiting');
    setSpinResult(null);
    setCurrentPrompt('');
    onNextRound();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProofFile(file);
    }
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
                  <AvatarFallback className="bg-orange-500 text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <p className="font-medium">You</p>
                <p className="text-sm text-muted-foreground">Score: {userScore}</p>
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <span className="font-bold">Round {round}/{maxRounds}</span>
              </div>
              <p className="text-xs text-muted-foreground">Truth or Dare</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium">{getPartnerDisplayName()}</p>
                <p className="text-sm text-muted-foreground">Score: {partnerScore}</p>
              </div>
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-pink-500 text-white">
                    {getPartnerDisplayName()?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  isPartnerOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Selection */}
      {phase === 'waiting' && round === 1 && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="text-lg text-purple-800 dark:text-purple-200">
              🎭 Choose Your Theme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTheme === theme.id
                      ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <p className="font-medium text-sm">{theme.name}</p>
                  <p className="text-xs text-muted-foreground">{theme.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spinner */}
      {(phase === 'waiting' || phase === 'spinning') && (
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              {/* Spinning Wheel */}
              <div className="relative mx-auto w-48 h-48">
                <div 
                  className={`w-full h-full rounded-full border-8 border-gradient-to-r from-blue-500 to-pink-500 ${
                    isSpinning ? 'animate-spin' : ''
                  }`}
                  style={{
                    background: `conic-gradient(
                      from 0deg,
                      #3B82F6 0deg 180deg,
                      #EC4899 180deg 360deg
                    )`
                  }}
                >
                  <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <div className="text-center">
                      {isSpinning ? (
                        <div className="animate-pulse">
                          <RotateCcw className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm font-medium">Spinning...</p>
                        </div>
                      ) : spinResult ? (
                        <div>
                          {spinResult === 'truth' ? (
                            <HelpCircle className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                          ) : (
                            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-pink-500" />
                          )}
                          <p className="text-lg font-bold capitalize">{spinResult}</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-center mb-2">
                            <HelpCircle className="h-6 w-6 text-blue-500 mr-1" />
                            <Lightbulb className="h-6 w-6 text-pink-500 ml-1" />
                          </div>
                          <p className="text-sm font-medium">Ready to Spin?</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-gray-800"></div>
                </div>
              </div>

              {/* Spin Button */}
              {phase === 'waiting' && isUserTurn && (
                <Button 
                  onClick={handleSpin}
                  className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                  size="lg"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Spin the Wheel!
                </Button>
              )}

              {phase === 'waiting' && !isUserTurn && (
                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-blue-700 dark:text-blue-300">
                    Waiting for {getPartnerDisplayName()} to spin...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Prompt */}
      {phase === 'prompt' && currentPrompt && (
        <Card className={`border-0 ${
          spinResult === 'truth' 
            ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20' 
            : 'bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/20 dark:to-orange-950/20'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xl flex items-center gap-2 ${
                spinResult === 'truth' ? 'text-blue-800 dark:text-blue-200' : 'text-pink-800 dark:text-pink-200'
              }`}>
                {spinResult === 'truth' ? (
                  <HelpCircle className="h-5 w-5" />
                ) : (
                  <Lightbulb className="h-5 w-5" />
                )}
                {spinResult === 'truth' ? 'Truth' : 'Dare'}
              </CardTitle>
              <Badge variant="secondary" className={
                spinResult === 'truth' 
                  ? 'bg-blue-100 text-blue-800 border-blue-200' 
                  : 'bg-pink-100 text-pink-800 border-pink-200'
              }>
                {themes.find(t => t.id === selectedTheme)?.name || '🎭 Mixed'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg mb-4 ${
              spinResult === 'truth' 
                ? 'bg-blue-100 dark:bg-blue-900/30' 
                : 'bg-pink-100 dark:bg-pink-900/30'
            }`}>
              <p className={`text-base leading-relaxed ${
                spinResult === 'truth' 
                  ? 'text-blue-800 dark:text-blue-200' 
                  : 'text-pink-800 dark:text-pink-200'
              }`}>
                {currentPrompt}
              </p>
            </div>

            {/* Response Input */}
            <div className="space-y-4">
              <Textarea
                placeholder={spinResult === 'truth' 
                  ? "Share your honest answer..." 
                  : "Describe how you completed the dare or upload proof!"
                }
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="min-h-[100px] resize-none"
              />

              {/* File Upload for Dares */}
              {spinResult === 'dare' && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Camera className="w-4 h-4" />
                    <span className="text-sm">Upload Proof</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {proofFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Proof uploaded!</span>
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={handleSubmit}
                disabled={!response.trim()}
                className={`w-full ${
                  spinResult === 'truth' 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-pink-500 hover:bg-pink-600'
                }`}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit {spinResult === 'truth' ? 'Truth' : 'Dare'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Complete */}
      {phase === 'completed' && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
              Round Complete! 🎉
            </h3>
            <p className="text-green-700 dark:text-green-300 mb-4">
              Great job! Ready for the next round?
            </p>
            
            {/* Reactions */}
            <div className="flex justify-center gap-3 mb-6">
              {reactions.map((emoji, index) => (
                <button
                  key={index}
                  className="text-2xl hover:scale-125 transition-transform"
                  onClick={() => console.log('React with:', emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {round < maxRounds ? (
              <Button 
                onClick={handleNextRound}
                className="bg-green-500 hover:bg-green-600"
              >
                Next Round ({round + 1}/{maxRounds})
              </Button>
            ) : (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">Game Complete! 🏆</h3>
                <p className="text-lg">
                  Final Score: You {userScore} - {partnerScore} {getPartnerDisplayName()}
                </p>
                {userScore > partnerScore && (
                  <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <h4 className="font-bold text-yellow-800 dark:text-yellow-200">You Won! 🎉</h4>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Congratulations! You've earned a special reward.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Winner Reward */}
      {showWinnerReward && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <Star className="h-5 w-5" />
              Victory Reward! 🏆
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-yellow-700 dark:text-yellow-300">
              As the winner, you've earned a special question or request:
            </p>
            <Textarea
              value={winnerReward}
              onChange={(e) => setWinnerReward(e.target.value)}
              placeholder="Ask anything you want or make a sweet request..."
              className="min-h-[80px] resize-none"
            />
            <Button 
              onClick={() => console.log('Winner reward sent:', winnerReward)}
              disabled={!winnerReward.trim()}
              className="w-full bg-yellow-500 hover:bg-yellow-600"
            >
              <Heart className="w-4 h-4 mr-2" />
              Send Your Reward
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};