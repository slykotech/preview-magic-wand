import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GradientHeader } from "@/components/GradientHeader";
import { Send, Sparkles, Mic, MicOff, Volume2, VolumeX, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { Badge } from "@/components/ui/badge";
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}
export const AICoach = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      // Create or get existing chat session
      const {
        data: session,
        error
      } = await supabase.from('ai_coach_sessions').insert({
        user_id: user?.id,
        title: 'Daily Check-in Chat'
      }).select().single();
      if (error) throw error;
      setSessionId(session.id);

      // Add welcome message
      const welcomeMessage: Message = {
        id: '1',
        content: "Welcome to Soul Syncing 💞. A cozy corner just for you two — to share feelings, rediscover each other, and grow closer with every word. What’s on your heart today? Let’s open up and sync your souls together.",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);

      // Set initial suggestions
      setSuggestions(["How can we improve our communication?", "Planning a special date night", "Dealing with relationship stress", "Building emotional intimacy"]);

      // Save welcome message to database
      await supabase.from('ai_coach_messages').insert({
        session_id: session.id,
        content: welcomeMessage.content,
        role: 'assistant'
      });
    } catch (error) {
      console.error('Error initializing chat session:', error);
      toast({
        title: "Error",
        description: "Failed to start chat session",
        variant: "destructive"
      });
    }
  };
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
    setMessages(prev => [...prev, userMessage]);
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
      if (error) throw error;
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
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
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  return <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Gradient Header */}
      <GradientHeader
        title="AI Relationship Coach"
        subtitle="Always here to help your love grow"
        icon={<Sparkles size={24} />}
        showBackButton={false}
      >
        {/* Voice Mode Toggle */}
        <div className="flex justify-center mt-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleVoiceMode} 
            className="text-white hover:bg-white/20 bg-white/10 backdrop-blur-sm border border-white/20"
          >
            {isVoiceMode ? <Volume2 size={16} className="mr-2" /> : <VolumeX size={16} className="mr-2" />}
            {isVoiceMode ? 'Voice Mode On' : 'Voice Mode Off'}
          </Button>
        </div>
      </GradientHeader>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && <div className="px-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-secondary" />
            <span className="text-sm font-medium text-muted-foreground">Quick suggestions:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => handleSendMessage(suggestion)}>
                {suggestion}
              </Badge>)}
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

      {/* Input */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex gap-3">
          <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder={isVoiceMode ? "Tap mic to speak or type..." : "Share what's on your mind..."} className="flex-1 rounded-full border-muted focus:border-secondary font-inter" disabled={isTyping || isRecording || isProcessing} />
          
          {/* Voice Button */}
          <Button onClick={handleVoiceMessage} disabled={isTyping || isProcessing} variant={isRecording ? "destructive" : "outline"} size="fab" className="shrink-0">
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </Button>

          {/* Send Button */}
          <Button onClick={() => handleSendMessage()} disabled={!newMessage.trim() || isTyping || isRecording || isProcessing} variant="floating" size="fab" className="shrink-0">
            <Send size={20} className={newMessage.trim() ? 'animate-pulse' : ''} />
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>;
};