import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, ArrowLeft, MoreVertical, Image, Video, Heart, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  message_type: 'text' | 'emoji' | 'image' | 'video' | 'sticker';
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  couple_id: string;
  created_at: string;
  updated_at: string;
}

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Chat: React.FC<ChatProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { coupleData, userProfile, partnerProfile, getUserDisplayName, getPartnerDisplayName } = useCoupleData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickEmojis = ['❤️', '😂', '😍', '🥰', '😘', '🔥', '👏', '💯', '🙌', '✨'];
  const loveStickers = ['💕', '💖', '💗', '💓', '💘', '💝', '💞', '💟', '❣️', '💋', '🌹', '💐'];
  const actionStickers = ['🫶', '👫', '💏', '👪', '🥳', '🎉', '🎊', '🔥', '⭐', '✨', '💫', '🌟'];

  useEffect(() => {
    if (isOpen && coupleData) {
      initializeChat();
    }
  }, [isOpen, coupleData]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!conversation?.id) return;

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark message as read if it's from partner
          if (newMessage.sender_id !== user?.id) {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    if (!coupleData?.id || !user?.id) return;

    try {
      setLoading(true);

      // Check if conversation exists
      let { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('couple_id', coupleData.id)
        .maybeSingle();

      if (!existingConversation) {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({ couple_id: coupleData.id })
          .select()
          .single();

        if (error) throw error;
        existingConversation = newConversation;
      }

      setConversation(existingConversation);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', existingConversation.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setMessages((messagesData || []) as Message[]);

      // Mark unread messages as read
      const unreadMessages = messagesData?.filter(
        msg => !msg.is_read && msg.sender_id !== user.id
      );

      if (unreadMessages && unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(msg => msg.id));
      }

    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async (text: string, type: 'text' | 'emoji' | 'sticker' | 'image' | 'video' = 'text') => {
    if (!text.trim() || !conversation?.id || !user?.id) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          message_text: text.trim(),
          message_type: type,
          is_read: false
        });

      if (error) throw error;

      setNewMessage('');
      setShowEmojiPicker(false);
      setShowStickers(false);
      setShowAttachments(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !conversation?.id || !user?.id) return;

    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : 'text';
    
    if (fileType === 'text') {
      toast.error('Please select an image or video file');
      return;
    }

    const maxSize = fileType === 'video' ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB for video, 5MB for image
    if (file.size > maxSize) {
      toast.error(`File size too large. Max ${fileType === 'video' ? '50MB' : '5MB'} allowed.`);
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('memory-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('memory-images')
        .getPublicUrl(filePath);

      await sendMessage(urlData.publicUrl, fileType);
      toast.success(`${fileType === 'video' ? 'Video' : 'Image'} sent successfully!`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }
  };

  const handleEmojiClick = (emoji: string) => {
    sendMessage(emoji, 'emoji');
  };

  const handleStickerClick = (sticker: string) => {
    sendMessage(sticker, 'sticker');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(newMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col h-screen">
      {/* Debug info */}
      <div className="hidden">Chat component mounted - input should be visible</div>
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center gap-3 shadow-lg flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Avatar className="h-10 w-10">
          <AvatarImage src={partnerProfile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary-foreground text-primary">
            {getPartnerDisplayName().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{getPartnerDisplayName()}</h3>
          <p className="text-sm text-primary-foreground/80">Online</p>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages Container - Reduced size */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-background to-muted/20" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-2">
                <div className="text-6xl">💬</div>
                <h3 className="text-lg font-semibold text-muted-foreground">Start the conversation</h3>
                <p className="text-sm text-muted-foreground">Send your first message to {getPartnerDisplayName()}</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              const senderName = isOwn ? getUserDisplayName() : getPartnerDisplayName();
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`${
                        message.message_type === 'emoji' || message.message_type === 'sticker'
                          ? 'text-3xl px-2 py-1 bg-transparent' 
                          : `px-4 py-2 rounded-2xl ${
                              isOwn
                                ? 'bg-primary text-primary-foreground ml-2'
                                : 'bg-muted text-foreground mr-2'
                            }`
                      }`}
                    >
                      {message.message_type === 'image' ? (
                        <img 
                          src={message.message_text} 
                          alt="Shared image" 
                          className="max-w-full h-auto rounded-lg cursor-pointer"
                          onClick={() => window.open(message.message_text, '_blank')}
                        />
                      ) : message.message_type === 'video' ? (
                        <video 
                          src={message.message_text} 
                          controls 
                          className="max-w-full h-auto rounded-lg"
                          style={{ maxHeight: '300px' }}
                        />
                      ) : (
                        message.message_text
                      )}
                    </div>
                    
                    <div className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right mr-2' : 'ml-2'}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      {isOwn && (
                        <span className="ml-1">
                          {message.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {!isOwn && (
                    <Avatar className={`h-8 w-8 ${isOwn ? 'order-1 mr-2' : 'order-2 ml-2'}`}>
                      <AvatarImage src={partnerProfile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {senderName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="border-t bg-background p-4 flex-shrink-0">
          <div className="grid grid-cols-5 gap-2 mb-2">
            {quickEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleEmojiClick(emoji)}
                className="text-2xl p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Love Stickers */}
      {showStickers && (
        <div className="border-t bg-background p-4 flex-shrink-0">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Love Stickers</h4>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {loveStickers.map((sticker, index) => (
              <button
                key={index}
                onClick={() => handleStickerClick(sticker)}
                className="text-2xl p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {sticker}
              </button>
            ))}
          </div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Action Stickers</h4>
          <div className="grid grid-cols-6 gap-2">
            {actionStickers.map((sticker, index) => (
              <button
                key={index}
                onClick={() => handleStickerClick(sticker)}
                className="text-2xl p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachments Panel */}
      {showAttachments && (
        <div className="border-t bg-background p-4 flex-shrink-0">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
            >
              <Camera className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">Photo</span>
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'video/*';
                  fileInputRef.current.click();
                }
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
            >
              <Video className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">Video</span>
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*,video/*';
                  fileInputRef.current.click();
                }
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
            >
              <Image className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">Gallery</span>
            </button>
          </div>
        </div>
      )}

      {/* Message Input - Always visible at bottom */}
      <div className="border-t bg-background p-4 flex-shrink-0">
        <div className="flex gap-2 items-end">
          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowAttachments(!showAttachments);
              setShowEmojiPicker(false);
              setShowStickers(false);
            }}
            className={`rounded-full ${showAttachments ? 'bg-muted' : ''}`}
          >
            <Image className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-12 min-h-[44px] rounded-full border-2 focus:border-primary"
              disabled={loading}
            />
          </div>
          
          {/* Love Stickers Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowStickers(!showStickers);
              setShowEmojiPicker(false);
              setShowAttachments(false);
            }}
            className={`rounded-full ${showStickers ? 'bg-muted' : ''}`}
          >
            <Heart className="h-5 w-5 text-red-500" />
          </Button>
          
          {/* Emoji Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowStickers(false);
              setShowAttachments(false);
            }}
            className={`rounded-full ${showEmojiPicker ? 'bg-muted' : ''}`}
          >
            <Smile className="h-5 w-5" />
          </Button>
          
          {/* Send Button */}
          <Button
            onClick={() => sendMessage(newMessage)}
            disabled={loading || !newMessage.trim()}
            size="icon"
            className="rounded-full min-w-[44px]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
              e.target.value = '';
            }
          }}
          className="hidden"
        />
      </div>
    </div>
  );
};