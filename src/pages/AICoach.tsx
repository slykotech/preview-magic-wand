import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GradientHeader } from "@/components/GradientHeader";
import { Send, Sparkles, Mic, MicOff, Volume2, VolumeX, Lightbulb, Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePersistentChat } from "@/hooks/usePersistentChat";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export const AICoach = () => {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isOutOfTokens, setIsOutOfTokens] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{
    tokensUsed: number;
    tokensRemaining: number;
    dailyLimit: number;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [messagesPad, setMessagesPad] = useState(120);
  const {
    toast
  } = useToast();
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();
  const {
    isSpeaking,
    speak,
    stopSpeaking
  } = useTextToSpeech();
  
  // Use persistent chat hook
  const {
    messages,
    isLoaded,
    addMessage,
    setMessages,
    clearMessages,
    getSessionInfo
  } = usePersistentChat(sessionId);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      initializeChatSession();
    }
  }, [user, loading, navigate]);

  const initializeChatSession = async () => {
    try {
      // Generate consistent sessionId based on user ID + current date
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const consistentSessionId = `${user?.id}-${today}`;
      setSessionId(consistentSessionId);

      // Set initial suggestions
      setSuggestions(["How can we improve our communication?", "Planning a special date night", "Dealing with relationship stress", "Building emotional intimacy"]);
    } catch (error) {
      console.error('Error initializing chat session:', error);
      toast({
        title: "Error",
        description: "Failed to start chat session",
        variant: "destructive"
      });
    }
  };

  // Initialize welcome message when chat is loaded and empty
  useEffect(() => {
    if (sessionId && isLoaded && messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        content: "Welcome to Soul Syncing 💞. A cozy corner just for you two — to share feelings, rediscover each other, and grow closer with every word. What's on your heart today? Let's open up and sync your souls together.",
        role: 'assistant',
        timestamp: new Date()
      };
      addMessage(welcomeMessage);
    }
  }, [sessionId, isLoaded, messages.length, addMessage]);

  // Keyboard and viewport handlers to keep composer visible
  useEffect(() => {
    const vv: any = (window as any).visualViewport;
    const handleResize = () => {
      if (!vv) return;
      const keyboard = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      setKeyboardOpen(keyboard > 80);
    };
    const onFocusIn = () => setKeyboardOpen(true);
    const onFocusOut = () => setKeyboardOpen(false);

    if (vv) {
      vv.addEventListener('resize', handleResize);
      handleResize();
    }
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('focusout', onFocusOut);

    return () => {
      if (vv) vv.removeEventListener('resize', handleResize);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Recompute message padding when composer/nav changes and auto-scroll when keyboard opens
  useEffect(() => {
    const h = composerRef.current?.offsetHeight ?? 0;
    const navH = keyboardOpen ? 0 : 64; // approx bottom nav height
    setMessagesPad(h + navH + 16);
    if (keyboardOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [keyboardOpen, newMessage, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || newMessage;
    if (!textToSend.trim() || !sessionId) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      role: 'user',
      timestamp: new Date()
    };
    addMessage(userMessage);
    setNewMessage("");
    setIsTyping(true);
    try {
      // Save user message to database
      await supabase.from('ai_coach_messages').insert({
        session_id: sessionId,
        content: userMessage.content,
        role: 'user'
      });

      // Get AI response from OpenAI
      const {
        data,
        error
      } = await supabase.functions.invoke('ai-coach-chat', {
        body: {
          messages: messages.concat(userMessage).map(m => ({
            role: m.role,
            content: m.content
          })),
          userContext: "Couple relationship coaching session"
        }
      });
      
      if (error) {
        // Check if it's a token limit error (429 status)
        if (error.message && error.message.includes('Daily token limit reached')) {
          setIsOutOfTokens(true);
          setIsTyping(false);
          toast({
            title: "Daily Token Limit Reached",
            description: "You've used your daily AI coach allowance. Reset tomorrow!",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message,
        role: 'assistant',
        timestamp: new Date()
      };
      addMessage(aiResponse);
      
      // Update token usage if available
      if (data.tokenUsage) {
        setTokenUsage(data.tokenUsage);
        // Check if close to limit (90% used)
        const usagePercentage = (data.tokenUsage.tokensUsed / data.tokenUsage.dailyLimit) * 100;
        if (usagePercentage >= 90 && usagePercentage < 100) {
          toast({
            title: "Token Usage Warning",
            description: `You've used ${Math.round(usagePercentage)}% of your daily tokens`,
            variant: "default"
          });
        }
      }
      
      setIsTyping(false);

      // Save AI response to database
      await supabase.from('ai_coach_messages').insert({
        session_id: sessionId,
        content: aiResponse.content,
        role: 'assistant'
      });

      // Auto-speak in voice mode
      if (isVoiceMode) {
        await speak(aiResponse.content);
      }

      // Update suggestions based on conversation
      updateSuggestions(aiResponse.content);
    } catch (error) {
      console.error('Error handling message:', error);
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updateSuggestions = (aiResponse: string) => {
    // Generate contextual suggestions based on AI response
    const contextSuggestions = ["Can you give me specific examples?", "How do we practice this together?", "What if my partner doesn't respond well?", "Any other techniques you'd recommend?"];
    setSuggestions(contextSuggestions);
  };

  const handleVoiceMessage = async () => {
    if (isRecording) {
      const transcribedText = await stopRecording();
      if (transcribedText) {
        await handleSendMessage(transcribedText);
      }
    } else {
      await startRecording();
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    if (isSpeaking) {
      stopSpeaking();
    }
    toast({
      title: isVoiceMode ? "Voice mode disabled" : "Voice mode enabled",
      description: isVoiceMode ? "AI responses will be text only" : "AI responses will be spoken aloud"
    });
  };

  // Handle clear chat
  const handleClearChat = () => {
    clearMessages();
    setSuggestions(["How can we improve our communication?", "Planning a special date night", "Dealing with relationship stress", "Building emotional intimacy"]);
    toast({
      title: "Chat cleared",
      description: "Your conversation history has been cleared"
    });
  };

  // Get session info for display
  const sessionInfo = getSessionInfo();

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Gradient Header */}
      <GradientHeader title="AI Relationship Coach" subtitle="Always here to help your love grow" icon={<Sparkles size={24} />} showBackButton={false}>
        {/* Clear Chat Button */}
        {messages.length > 1 && (
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleClearChat}
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 px-3"
            >
              <Trash2 size={14} className="mr-1" />
              Clear
            </Button>
          </div>
        )}
      </GradientHeader>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ paddingBottom: messagesPad }}>
        {messages.map(message => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${message.role === 'user' ? 'bg-primary text-primary-foreground ml-12' : 'bg-card shadow-soft mr-12'}`}>
              <p className="font-inter text-sm leading-relaxed font-medium">{message.content}</p>
              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
              </p>
            </div>
          </div>)}

        {/* Typing indicator */}
        {isTyping && <div className="flex justify-start animate-fade-in">
            <div className="bg-card shadow-soft rounded-2xl p-4 mr-12">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
              animationDelay: '0.1s'
            }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
              animationDelay: '0.2s'
            }}></div>
              </div>
            </div>
          </div>}
        
        {/* Suggestions */}
        {suggestions.length > 0 && !isOutOfTokens && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} className="text-secondary" />
              <span className="text-sm font-medium text-muted-foreground">Quick suggestions:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => handleSendMessage(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      
      {/* Out of Tokens Message */}
      {isOutOfTokens && <div className="px-4 pb-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-destructive rounded-full" />
              <span className="text-sm font-semibold text-destructive">Daily Limit Reached</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              You've used your daily AI coach allowance of 10,000 tokens. Your limit will reset tomorrow.
            </p>
            <div className="text-xs text-muted-foreground">
              Come back tomorrow for more personalized relationship guidance! 💕
            </div>
          </div>
        </div>}
      


      {/* Voice Controls */}
      {isVoiceMode && <div className="px-4 pb-2">
          <div className="bg-card rounded-lg p-3 border border-secondary/20">
            <div className="flex items-center justify-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isVoiceMode ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
              <span className="text-sm font-medium">Voice Mode Active</span>
              {(isRecording || isProcessing || isSpeaking) && <div className="text-xs text-muted-foreground">
                  {isRecording && "🎤 Listening..."}
                  {isProcessing && "⚡ Processing..."}
                  {isSpeaking && "🔊 Speaking..."}
                </div>}
            </div>
          </div>
        </div>}

      {/* Input (fixed above safe area) */}
      <div ref={composerRef} className="fixed left-0 right-0 z-40 p-3 sm:p-4 bg-card border-t border-border pb-[max(env(safe-area-inset-bottom),0px)]" style={{ bottom: keyboardOpen ? 'env(safe-area-inset-bottom, 0px)' : 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-md mx-auto flex gap-3">
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isOutOfTokens ? "Daily token limit reached - come back tomorrow!" : isVoiceMode ? "Tap mic to speak or type..." : "Share what's on your mind..."}
            className="flex-1 rounded-full border-muted focus:border-secondary font-inter"
            disabled={isTyping || isRecording || isProcessing || isOutOfTokens}
          />

          {/* Send Button */}
          <Button
            onClick={() => handleSendMessage()}
            disabled={!newMessage.trim() || isTyping || isRecording || isProcessing || isOutOfTokens}
            variant="floating"
            size="fab"
            className="shrink-0"
          >
            <Send size={20} className={newMessage.trim() && !isOutOfTokens ? 'animate-pulse' : ''} />
          </Button>
        </div>
      </div>

      {!keyboardOpen && <BottomNavigation />}
    </div>;
  };