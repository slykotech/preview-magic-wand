import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Send, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
      const { data: session, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: user?.id,
          title: 'Daily Check-in Chat'
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(session.id);

      // Add welcome message
      const welcomeMessage: Message = {
        id: '1',
        content: "Hello! I'm your AI relationship coach. I'm here to help you and your partner strengthen your connection. What would you like to talk about today? 💕",
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);

      // Save welcome message to database
      await supabase
        .from('ai_chat_messages')
        .insert({
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsTyping(true);

    try {
      // Save user message to database
      await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: sessionId,
          content: userMessage.content,
          role: 'user'
        });

      // Simulate AI response (in a real app, this would call an AI service)
      setTimeout(async () => {
        const responses = [
          "That's a wonderful insight! Communication is indeed the foundation of any strong relationship. Have you tried expressing this to your partner using 'I' statements?",
          "I understand how challenging that can feel. Remember, every relationship has its ups and downs. What matters is how you both navigate through them together.",
          "It sounds like you're both putting in effort, which is beautiful! Small gestures of appreciation can go a long way. When did you last tell your partner something you're grateful for?",
          "Quality time is so important! Even 15 minutes of undivided attention each day can strengthen your bond. What's your favorite way to connect with your partner?"
        ];

        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: responses[Math.floor(Math.random() * responses.length)],
          role: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);

        // Save AI response to database
        await supabase
          .from('ai_chat_messages')
          .insert({
            session_id: sessionId,
            content: aiResponse.content,
            role: 'assistant'
          });

      }, 2000);

    } catch (error) {
      console.error('Error saving message:', error);
      setIsTyping(false);
    }

    toast({
      title: "Message sent! 📨",
      description: "Your AI coach is thinking...",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <div className="bg-gradient-romance text-white p-6 shadow-romantic">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-poppins">AI Relationship Coach</h1>
            <p className="text-white/80 text-sm font-inter font-bold">Always here to help your love grow</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-twilight-blue text-white ml-12'
                  : 'bg-card shadow-soft mr-12'
              }`}
            >
              <p className="font-inter text-sm leading-relaxed font-medium">{message.content}</p>
              <p className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-card shadow-soft rounded-2xl p-4 mr-12">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex gap-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share what's on your mind..."
            className="flex-1 rounded-full border-muted focus:border-secondary font-inter"
            disabled={isTyping}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isTyping}
            variant="floating"
            size="fab"
            className="shrink-0"
          >
            <Send size={20} className={newMessage.trim() ? 'animate-pulse' : ''} />
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};