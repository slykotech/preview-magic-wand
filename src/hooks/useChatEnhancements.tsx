import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  message_type: 'text' | 'emoji' | 'image' | 'video' | 'sticker';
  is_read: boolean;
  created_at: string;
  updated_at: string;
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'seen';
}

export const useChatEnhancements = (conversationId: string | null, userId: string | null) => {
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle typing indicators
  const handleTypingStart = () => {
    if (!conversationId || !userId) return;
    
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing indicator to partner
    supabase.channel(`typing-${conversationId}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, typing: true }
      });
    
    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  };

  const handleTypingStop = () => {
    if (!conversationId || !userId) return;
    
    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send stop typing indicator to partner
    supabase.channel(`typing-${conversationId}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, typing: false }
      });
  };

  // Listen for partner typing
  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId: senderId, typing } = payload.payload;
        if (senderId !== userId) {
          setPartnerTyping(typing);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      handleTypingStop();
    };
  }, []);

  // Enhanced message delivery status tracking
  const updateMessageDeliveryStatus = async (messageId: string, status: 'delivered' | 'seen') => {
    try {
      await supabase
        .from('messages')
        .update({ 
          is_read: status === 'seen',
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };

  return {
    isTyping,
    partnerTyping,
    handleTypingStart,
    handleTypingStop,
    updateMessageDeliveryStatus,
  };
};