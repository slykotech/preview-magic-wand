import { useState, useEffect, useCallback } from "react";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatSession {
  sessionId: string;
  messages: Message[];
  createdAt: number;
  lastUpdated: number;
}

const STORAGE_KEY = 'ai_coach_chat_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const usePersistentChat = (sessionId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load messages from localStorage
  const loadMessages = useCallback(() => {
    if (!sessionId) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setIsLoaded(true);
        return;
      }

      const chatSession: ChatSession = JSON.parse(stored);
      const now = Date.now();

      // Check if session has expired (24 hours)
      if (now - chatSession.createdAt > SESSION_DURATION) {
        localStorage.removeItem(STORAGE_KEY);
        setMessages([]);
        setIsLoaded(true);
        return;
      }

      // If different session, clear storage and start fresh
      if (chatSession.sessionId !== sessionId) {
        localStorage.removeItem(STORAGE_KEY);
        setMessages([]);
        setIsLoaded(true);
        return;
      }

      // Convert timestamp strings back to Date objects
      const messagesWithDates = chatSession.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));

      setMessages(messagesWithDates);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading chat messages:', error);
      localStorage.removeItem(STORAGE_KEY);
      setIsLoaded(true);
    }
  }, [sessionId]);

  // Save messages to localStorage
  const saveMessages = useCallback((newMessages: Message[]) => {
    if (!sessionId || newMessages.length === 0) return;

    try {
      const chatSession: ChatSession = {
        sessionId,
        messages: newMessages,
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatSession));
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  }, [sessionId]);

  // Add message to the chat
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      saveMessages(newMessages);
      return newMessages;
    });
  }, [saveMessages]);

  // Add multiple messages at once
  const addMessages = useCallback((newMessages: Message[]) => {
    setMessages(prev => {
      const allMessages = [...prev, ...newMessages];
      saveMessages(allMessages);
      return allMessages;
    });
  }, [saveMessages]);

  // Replace all messages
  const setMessagesAndSave = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
    saveMessages(newMessages);
  }, [saveMessages]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  }, []);

  // Check if messages are expired and auto-clear
  const checkExpiration = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const chatSession: ChatSession = JSON.parse(stored);
      const now = Date.now();

      if (now - chatSession.createdAt > SESSION_DURATION) {
        localStorage.removeItem(STORAGE_KEY);
        setMessages([]);
        return true; // Was expired
      }
      return false; // Not expired
    } catch (error) {
      console.error('Error checking expiration:', error);
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }
  }, []);

  // Get session info
  const getSessionInfo = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const chatSession: ChatSession = JSON.parse(stored);
      const now = Date.now();
      const timeLeft = SESSION_DURATION - (now - chatSession.createdAt);
      const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
      const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

      return {
        sessionId: chatSession.sessionId,
        messageCount: chatSession.messages.length,
        createdAt: new Date(chatSession.createdAt),
        timeLeft: {
          hours: Math.max(0, hoursLeft),
          minutes: Math.max(0, minutesLeft),
          expired: timeLeft <= 0
        }
      };
    } catch (error) {
      console.error('Error getting session info:', error);
      return null;
    }
  }, []);

  // Load messages on sessionId change
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Set up periodic expiration check (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      checkExpiration();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkExpiration]);

  return {
    messages,
    isLoaded,
    addMessage,
    addMessages,
    setMessages: setMessagesAndSave,
    clearMessages,
    checkExpiration,
    getSessionInfo
  };
};