import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, ArrowLeft, MoreVertical, Image, Video, Heart, Camera, Trash2, Settings, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
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
export const Chat: React.FC<ChatProps> = ({
  isOpen,
  onClose
}) => {
  const {
    user
  } = useAuth();
  const {
    coupleData,
    userProfile,
    partnerProfile,
    getUserDisplayName,
    getPartnerDisplayName
  } = useCoupleData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickEmojis = ['❤️', '😂', '😍', '🥰', '😘', '🔥', '👏', '💯', '🙌', '✨'];
  const reactionEmojis = ['❤️', '😍', '🥰', '😘', '💕', '💖'];
  const loveStickers = ['💕', '💖', '💗', '💓', '💘', '💝', '💞', '💟', '❣️', '💋', '🌹', '💐'];
  const actionStickers = ['🫶', '👫', '💏', '👪', '🥳', '🎉', '🎊', '🔥', '⭐', '✨', '💫', '🌟'];
  useEffect(() => {
    if (isOpen) {
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

    // Set up real-time subscription for new messages and updates
    const channel = supabase.channel(`messages:${conversation.id}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversation.id}`
    }, payload => {
      const newMessage = payload.new as Message;
      setMessages(prev => [...prev, newMessage]);

      // Mark message as read if it's from partner
      if (newMessage.sender_id !== user?.id) {
        markMessageAsRead(newMessage.id);
      }
    }).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversation.id}`
    }, payload => {
      const updatedMessage = payload.new as Message;
      setMessages(prev => prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg));
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, user?.id]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  const initializeChat = async () => {
    if (!coupleData?.id || !user?.id) {
      console.log('Missing data for chat initialization:', {
        coupleData: !!coupleData,
        user: !!user
      });
      return;
    }
    try {
      setLoading(true);

      // Check if conversation exists
      let {
        data: existingConversation
      } = await supabase.from('conversations').select('*').eq('couple_id', coupleData.id).maybeSingle();
      if (!existingConversation) {
        // Create new conversation
        const {
          data: newConversation,
          error
        } = await supabase.from('conversations').insert({
          couple_id: coupleData.id
        }).select().single();
        if (error) throw error;
        existingConversation = newConversation;
      }
      setConversation(existingConversation);

      // Fetch messages
      const {
        data: messagesData,
        error: messagesError
      } = await supabase.from('messages').select('*').eq('conversation_id', existingConversation.id).order('created_at', {
        ascending: true
      });
      if (messagesError) throw messagesError;
      setMessages((messagesData || []) as Message[]);

      // Mark unread messages as read
      const unreadMessages = messagesData?.filter(msg => !msg.is_read && msg.sender_id !== user.id);
      if (unreadMessages && unreadMessages.length > 0) {
        await supabase.from('messages').update({
          is_read: true
        }).in('id', unreadMessages.map(msg => msg.id));
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
      // Update local state immediately for better UX
      setMessages(prev => prev.map(msg => msg.id === messageId ? {
        ...msg,
        is_read: true
      } : msg));

      // Update in database
      await supabase.from('messages').update({
        is_read: true
      }).eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);

      // Revert local state on error
      setMessages(prev => prev.map(msg => msg.id === messageId ? {
        ...msg,
        is_read: false
      } : msg));
    }
  };
  const sendMessage = async (text: string, type: 'text' | 'emoji' | 'sticker' | 'image' | 'video' = 'text') => {
    if (!text.trim() || !conversation?.id || !user?.id) return;
    try {
      const {
        error
      } = await supabase.from('messages').insert({
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
    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'text';
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
      const {
        error: uploadError
      } = await supabase.storage.from('memory-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data: urlData
      } = supabase.storage.from('memory-images').getPublicUrl(filePath);
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
  const handleClearChat = async () => {
    if (!conversation?.id) return;
    try {
      const {
        error
      } = await supabase.from('messages').delete().eq('conversation_id', conversation.id);
      if (error) throw error;
      setMessages([]);
      toast.success('Chat cleared successfully');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Failed to clear chat');
    }
  };
  const handleExportChat = () => {
    const chatData = messages.map(msg => ({
      sender: msg.sender_id === user?.id ? getUserDisplayName() : getPartnerDisplayName(),
      message: msg.message_text,
      timestamp: new Date(msg.created_at).toLocaleString(),
      type: msg.message_type
    }));
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Chat exported successfully');
  };
  const handleLongPressStart = (messageId: string) => {
    const timer = setTimeout(() => {
      setShowReactions(messageId);
      setShowEmojiPicker(false);
      setShowStickers(false);
      setShowAttachments(false);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    setMessageReactions(prev => {
      const currentReactions = prev[messageId] || [];
      const existingReaction = currentReactions.find(r => r.emoji === emoji);
      if (existingReaction) {
        // Toggle reaction if user already reacted with this emoji
        const userIndex = existingReaction.users.indexOf(user.id);
        if (userIndex > -1) {
          // Remove user's reaction
          existingReaction.users.splice(userIndex, 1);
          existingReaction.count--;
          if (existingReaction.count === 0) {
            return {
              ...prev,
              [messageId]: currentReactions.filter(r => r.emoji !== emoji)
            };
          }
        } else {
          // Add user's reaction
          existingReaction.users.push(user.id);
          existingReaction.count++;
        }
      } else {
        // Add new reaction
        currentReactions.push({
          emoji,
          count: 1,
          users: [user.id]
        });
      }
      return {
        ...prev,
        [messageId]: [...currentReactions]
      };
    });
    setShowReactions(null);
  };
  if (!isOpen) return null;

  // Close reactions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowReactions(null);
    };
    if (showReactions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showReactions]);
  return <div className="fixed inset-0 bg-background z-50 flex flex-col h-screen">
      {/* Debug info */}
      <div className="hidden">Chat component mounted - input should be visible</div>
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-3 flex items-center gap-3 shadow-lg flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 p-0 rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Avatar className="h-10 w-10">
          <AvatarImage src={partnerProfile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary-foreground text-primary">
            {getPartnerDisplayName().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{getPartnerDisplayName()}</h3>
          
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleExportChat}>
              <Download className="h-4 w-4 mr-2" />
              Export Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClearChat} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages Container - Reduced size */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 pb-20">
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-background to-muted/20">
          {loading ? <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div> : messages.length === 0 ? <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-2">
                <div className="text-6xl">💬</div>
                <h3 className="text-lg font-semibold text-muted-foreground">Start the conversation</h3>
                <p className="text-sm text-muted-foreground">Send your first message to {getPartnerDisplayName()}</p>
              </div>
            </div> : messages.map(message => {
          const isOwn = message.sender_id === user?.id;
          const senderName = isOwn ? getUserDisplayName() : getPartnerDisplayName();
          return <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in mb-4 relative`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 shadow-soft relative ${message.message_type === 'emoji' || message.message_type === 'sticker' ? 'text-3xl bg-transparent' : isOwn ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' : 'bg-card'}`} onTouchStart={() => handleLongPressStart(message.id)} onTouchEnd={handleLongPressEnd} onMouseDown={() => handleLongPressStart(message.id)} onMouseUp={handleLongPressEnd} onMouseLeave={handleLongPressEnd}>
                      {message.message_type === 'image' ? <img src={message.message_text} alt="Shared image" className="max-w-full h-auto rounded-lg cursor-pointer" onClick={() => window.open(message.message_text, '_blank')} /> : message.message_type === 'video' ? <video src={message.message_text} controls className="max-w-full h-auto rounded-lg" style={{
                maxHeight: '300px'
              }} /> : <div className="text-sm leading-relaxed">
                          {message.message_text}
                        </div>}
                      
                      {message.message_type !== 'emoji' && message.message_type !== 'sticker' && <div className="mt-2 text-xs opacity-70 text-right">
                          {new Date(message.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
                          {isOwn && <span className={`ml-1 ${message.is_read ? 'text-blue-400' : 'text-muted-foreground'}`}>
                              {message.is_read ? '✓✓' : '✓'}
                            </span>}
                        </div>}
                      
                      {/* Quick Reactions Overlay */}
                      {showReactions === message.id && <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-card rounded-full p-2 shadow-lg border z-50 flex gap-1">
                          {reactionEmojis.map((emoji, index) => <button key={index} onClick={() => handleReaction(message.id, emoji)} className="text-xl p-1 rounded-full hover:bg-muted transition-colors">
                              {emoji}
                            </button>)}
                        </div>}
                      
                      {/* Reaction emojis positioned at bottom right */}
                      {messageReactions[message.id] && messageReactions[message.id].length > 0 && <div className="absolute -bottom-2 -right-2 flex gap-1">
                          {messageReactions[message.id].map(reaction => <span key={reaction.emoji} className="text-sm bg-background rounded-full border shadow-sm px-1">
                              {reaction.emoji}
                            </span>)}
                        </div>}
                  </div>
                </div>;
        })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && <div className="border-t bg-background p-4 flex-shrink-0">
          <div className="grid grid-cols-5 gap-2 mb-2">
            {quickEmojis.map((emoji, index) => <button key={index} onClick={() => handleEmojiClick(emoji)} className="text-2xl p-2 rounded-lg hover:bg-muted transition-colors">
                {emoji}
              </button>)}
          </div>
        </div>}

      {/* Love Stickers */}
      {showStickers && <div className="border-t bg-background p-4 flex-shrink-0">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Love Stickers</h4>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {loveStickers.map((sticker, index) => <button key={index} onClick={() => handleStickerClick(sticker)} className="text-2xl p-2 rounded-lg hover:bg-muted transition-colors">
                {sticker}
              </button>)}
          </div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Action Stickers</h4>
          <div className="grid grid-cols-6 gap-2">
            {actionStickers.map((sticker, index) => <button key={index} onClick={() => handleStickerClick(sticker)} className="text-2xl p-2 rounded-lg hover:bg-muted transition-colors">
                {sticker}
              </button>)}
          </div>
        </div>}

      {/* Attachments Panel */}
      {showAttachments && <div className="border-t bg-background p-4 flex-shrink-0">
          <div className="grid grid-cols-3 gap-4">
            
            
            
          </div>
        </div>}

      {/* Message Input - Fixed at bottom like nav bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
        <div className="max-w-md mx-auto px-3 py-2">
          <div className="flex gap-1 items-center">
            {/* Gallery Button */}
            <Button variant="ghost" size="sm" onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.accept = 'image/*,video/*';
              fileInputRef.current.click();
            }
          }} className="rounded-full h-8 w-8 p-0">
              <Image className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 relative">
              <Input ref={inputRef} placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} className="h-8 rounded-full border focus:border-primary text-sm pl-10" disabled={loading} />
              <Button variant="ghost" size="sm" onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*';
                fileInputRef.current.setAttribute('capture', 'environment');
                fileInputRef.current.click();
              }
            }} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full h-6 w-6 p-0">
                <Camera className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Love Stickers Button */}
            
            
            {/* Emoji Button */}
            
            
            {/* Send Button */}
            <Button onClick={() => sendMessage(newMessage)} disabled={loading || !newMessage.trim()} size="sm" className="rounded-full h-8 w-8 p-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file);
            e.target.value = '';
          }
        }} className="hidden" />
        </div>
      </div>
    </div>;
};