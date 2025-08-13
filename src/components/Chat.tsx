import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, ArrowLeft, MoreVertical, Image, Video, Heart, Camera, Trash2, Settings, Download, RotateCcw, X, Shield, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useE2EEncryption } from '@/utils/encryption';
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  message_type: 'text' | 'emoji' | 'image' | 'video' | 'sticker';
  is_read: boolean;
  created_at: string;
  updated_at: string;
  is_encrypted?: boolean;
}
interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
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
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const quickEmojis = ['❤️', '😂', '😍', '🥰', '😘', '🔥', '👏', '💯', '🙌', '✨'];
  const reactionEmojis = ['❤️', '😍', '🥰', '😘', '💕', '💖'];
  const loveStickers = ['💕', '💖', '💗', '💓', '💘', '💝', '💞', '💟', '❣️', '💋', '🌹', '💐'];
  const actionStickers = ['🫶', '👫', '💏', '👪', '🥳', '🎉', '🎊', '🔥', '⭐', '✨', '💫', '🌟'];
  
  // Initialize encryption
  const { isInitialized: encryptionReady, encryptMessage, decryptMessage } = useE2EEncryption(coupleData?.id);
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

    // Set up real-time subscription for messages only
    const messagesChannel = supabase.channel(`messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, async (payload) => {
        const newMessage = payload.new as Message;
        
        // Check if user has cleared chat - if so, only show new messages
        const { data: clearData } = await supabase
          .from('user_conversation_clears')
          .select('cleared_at')
          .eq('user_id', user?.id)
          .eq('conversation_id', conversation.id)
          .single();

        const clearTimestamp = clearData?.cleared_at;
        const messageTime = new Date(newMessage.created_at);
        const clearTime = clearTimestamp ? new Date(clearTimestamp) : null;
        
        // Only add message if it's after clear time or no clear time exists
        if (!clearTime || messageTime > clearTime) {
          // Check if message already exists (to avoid duplicates from optimistic updates)
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            const updatedMessages = [...prev, newMessage];
            
            // Decrypt the new message if it's encrypted
            if (newMessage.is_encrypted && newMessage.message_type === 'text' && encryptionReady) {
              decryptMessage(newMessage.message_text).then(decrypted => {
                setDecryptedMessages(prevDecrypted => ({
                  ...prevDecrypted,
                  [newMessage.id]: decrypted
                }));
              }).catch(error => {
                console.error('Failed to decrypt incoming message:', error);
                setDecryptedMessages(prevDecrypted => ({
                  ...prevDecrypted,
                  [newMessage.id]: '[Unable to decrypt]'
                }));
              });
            }
            
            return updatedMessages;
          });

          // Mark message as read if it's from partner
          if (newMessage.sender_id !== user?.id) {
            markMessageAsRead(newMessage.id);
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, payload => {
        const updatedMessage = payload.new as Message;
        setMessages(prev => prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg));
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [conversation?.id, user?.id]);

  // Set up reactions subscription when messages are available
  useEffect(() => {
    if (!messages.length || !conversation?.id) return;

    const reactionsChannel = supabase.channel(`reactions:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reactions'
      }, payload => {
        const newReaction = payload.new as MessageReaction;
        // Only process if it's for one of our current messages
        if (messages.some(m => m.id === newReaction.message_id)) {
          setMessageReactions(prev => ({
            ...prev,
            [newReaction.message_id]: [
              ...(prev[newReaction.message_id] || []).filter(r => 
                !(r.user_id === newReaction.user_id && r.emoji === newReaction.emoji)
              ),
              newReaction
            ]
          }));
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'message_reactions'
      }, payload => {
        const deletedReaction = payload.old as MessageReaction;
        setMessageReactions(prev => ({
          ...prev,
          [deletedReaction.message_id]: (prev[deletedReaction.message_id] || [])
            .filter(r => r.id !== deletedReaction.id)
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reactionsChannel);
    };
  }, [messages]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  const loadReactions = async (conversationId: string) => {
    try {
      const { data: reactions, error } = await supabase
        .from('message_reactions')
        .select(`
          id,
          message_id,
          user_id,
          emoji,
          created_at
        `)
        .in('message_id', messages.map(m => m.id));
      
      if (error) throw error;
      
      // Group reactions by message_id
      const reactionsByMessage: Record<string, MessageReaction[]> = {};
      reactions?.forEach(reaction => {
        if (!reactionsByMessage[reaction.message_id]) {
          reactionsByMessage[reaction.message_id] = [];
        }
        reactionsByMessage[reaction.message_id].push(reaction);
      });
      
      setMessageReactions(reactionsByMessage);
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
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

      // Get user's last clear timestamp
      const { data: clearData } = await supabase
        .from('user_conversation_clears')
        .select('cleared_at')
        .eq('user_id', user.id)
        .eq('conversation_id', existingConversation.id)
        .single();

      const clearTimestamp = clearData?.cleared_at;

      // Fetch messages after clear timestamp
      let messagesQuery = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', existingConversation.id)
        .order('created_at', { ascending: true });

      if (clearTimestamp) {
        messagesQuery = messagesQuery.gt('created_at', clearTimestamp);
      }

      const { data: messagesData, error: messagesError } = await messagesQuery;
      if (messagesError) throw messagesError;
      
      const fetchedMessages = (messagesData || []) as Message[];
      setMessages(fetchedMessages);
      
      // Decrypt messages if encryption is enabled
      if (encryptionReady && fetchedMessages.length > 0) {
        decryptMessagesInBackground(fetchedMessages);
      }

      // Load reactions for visible messages
      if (fetchedMessages.length > 0) {
        const { data: reactions, error: reactionsError } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', fetchedMessages.map(m => m.id));
        
        if (!reactionsError && reactions) {
          const reactionsByMessage: Record<string, MessageReaction[]> = {};
          reactions.forEach(reaction => {
            if (!reactionsByMessage[reaction.message_id]) {
              reactionsByMessage[reaction.message_id] = [];
            }
            reactionsByMessage[reaction.message_id].push(reaction);
          });
          setMessageReactions(reactionsByMessage);
        }
      }

      // Mark unread messages as read (only visible messages)
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
  const decryptMessagesInBackground = async (messages: Message[]) => {
    const newDecrypted: Record<string, string> = {};
    
    for (const message of messages) {
      if (message.is_encrypted && message.message_type === 'text') {
        try {
          const decrypted = await decryptMessage(message.message_text);
          newDecrypted[message.id] = decrypted;
        } catch (error) {
          console.error('Failed to decrypt message:', message.id, error);
          newDecrypted[message.id] = '[Unable to decrypt]';
        }
      }
    }
    
    setDecryptedMessages(prev => ({ ...prev, ...newDecrypted }));
  };

  const sendMessage = async (text: string, type: 'text' | 'emoji' | 'sticker' | 'image' | 'video' = 'text') => {
    if (!text.trim() || !conversation?.id || !user?.id) return;
    
    // Encrypt the message if encryption is enabled and it's a text message
    let messageToSend = text.trim();
    let isEncrypted = false;
    
    if (encryptionEnabled && encryptionReady && type === 'text') {
      try {
        messageToSend = await encryptMessage(text.trim());
        isEncrypted = true;
      } catch (error) {
        console.error('Encryption failed, sending plain text:', error);
        toast.error('Encryption failed, message sent without encryption');
      }
    }

    // Create optimistic message for immediate UI update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}-${Math.random()}`,
      conversation_id: conversation.id,
      sender_id: user.id,
      message_text: isEncrypted ? text.trim() : messageToSend, // Show plain text in UI for own messages
      message_type: type,
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_encrypted: isEncrypted
    };
    
    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        message_text: messageToSend,
        message_type: type,
        is_read: false,
        is_encrypted: isEncrypted
      }).select().single();
      
      if (error) throw error;
      
      // Replace optimistic message with real message
      if (data) {
        const realMessage = data as Message;
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id ? realMessage : msg
        ));
        
        // Store decrypted version for own encrypted messages
        if (isEncrypted) {
          setDecryptedMessages(prev => ({ 
            ...prev, 
            [realMessage.id]: text.trim() 
          }));
        }
      }

      // Create a realtime notification for your partner
      if (partnerProfile?.user_id && partnerProfile.user_id !== user.id) {
        try {
          await supabase.rpc('create_notification', {
            p_target_user_id: partnerProfile.user_id,
            p_title: 'New message',
            p_body: type === 'text' ? text.trim() : `Sent a ${type}`,
            p_link_url: '/messages',
            p_type: 'message'
          });
        } catch (e) {
          console.warn('Notification RPC failed (non-blocking):', e);
        }

        // OS push notification
        try {
          await supabase.functions.invoke('send-push', {
            body: {
              target_user_id: partnerProfile.user_id,
              title: `New message`,
              body: type === 'text' ? text.trim() : `Sent a ${type}`,
              data: { route: '/messages' }
            }
          });
        } catch (e) {
          console.warn('send-push failed (non-blocking):', e);
        }
      }

      setNewMessage('');
      setShowEmojiPicker(false);
      setShowStickers(false);
      setShowAttachments(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
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
    if (!conversation?.id || !user?.id) return;
    try {
      // Record clear timestamp for this user only
      await supabase
        .from('user_conversation_clears')
        .upsert({
          user_id: user.id,
          conversation_id: conversation.id,
          cleared_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,conversation_id'
        });
      
      // Clear messages from local state immediately
      setMessages([]);
      setMessageReactions({});
      
      toast.success('Chat cleared for you only');
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
    
    try {
      const currentReactions = messageReactions[messageId] || [];
      const existingReaction = currentReactions.find(r => r.emoji === emoji && r.user_id === user.id);
      
      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Add reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji: emoji
          });
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast.error('Failed to update reaction');
    }
    
    setShowReactions(null);
  };

  const startCamera = async () => {
    try {
      // Request camera permission first
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permission.state === 'denied') {
        toast.error('Camera permission denied. Please allow camera access in your browser settings.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setCameraStream(stream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Camera access denied. Please allow camera permission and try again.');
        } else if (error.name === 'NotFoundError') {
          toast.error('No camera found on this device.');
        } else {
          toast.error('Failed to access camera. Please check your device settings.');
        }
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const switchCamera = async () => {
    if (!cameraStream) {
      toast.error('Camera not active');
      return;
    }

    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    
    // Stop current stream
    cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    
    try {
      // Start new stream with different facing mode
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setFacingMode(newFacingMode);
      setCameraStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      toast.error('Failed to switch camera');
      // Fallback to original camera
      setFacingMode(facingMode);
      startCamera();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) {
      toast.error('Camera not ready');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      toast.error('Failed to capture photo');
      return;
    }
    
    // Ensure video is ready
    if (video.readyState !== 4) {
      toast.error('Camera still loading, please wait');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFileUpload(file);
        stopCamera();
        toast.success('Photo captured!');
      } else {
        toast.error('Failed to capture photo');
      }
    }, 'image/jpeg', 0.8);
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

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
  return <div className="fixed inset-0 bg-background z-50 flex flex-col" style={{ height: '100dvh' }}>
      {/* Debug info */}
      <div className="hidden">Chat component mounted - input should be visible</div>
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-2 sm:p-3 flex items-center gap-2 sm:gap-3 shadow-lg flex-shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 8px), 8px)' }}>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 p-0 rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
          <AvatarImage src={partnerProfile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary-foreground text-primary text-sm">
            {getPartnerDisplayName().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base sm:text-lg truncate">{getPartnerDisplayName()}</h3>
          <div className="flex items-center gap-1 text-xs opacity-75">
            {encryptionEnabled && encryptionReady ? (
              <>
                <Shield className="h-3 w-3" />
                <span>End-to-end encrypted</span>
              </>
            ) : (
              <>
                <ShieldOff className="h-3 w-3" />
                <span>Not encrypted</span>
              </>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={() => setEncryptionEnabled(!encryptionEnabled)}
              className={encryptionEnabled ? "text-green-600" : "text-orange-600"}
            >
              {encryptionEnabled ? (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Encryption On
                </>
              ) : (
                <>
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Encryption Off
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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

      {/* Messages Container - Mobile optimized */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 pb-16 sm:pb-20">
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4 bg-gradient-to-b from-background to-muted/20">
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
          return <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in mb-1 sm:mb-1.5 relative`}>
                  <div className={`max-w-[75%] sm:max-w-[70%] rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-soft relative ${message.message_type === 'emoji' || message.message_type === 'sticker' ? 'text-lg sm:text-xl bg-transparent px-1 py-0.5' : isOwn ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' : 'bg-card'}`} onTouchStart={() => handleLongPressStart(message.id)} onTouchEnd={handleLongPressEnd} onMouseDown={() => handleLongPressStart(message.id)} onMouseUp={handleLongPressEnd} onMouseLeave={handleLongPressEnd}>
                      {message.message_type === 'image' ? <img src={message.message_text} alt="Shared image" className="max-w-full h-auto rounded-lg cursor-pointer" onClick={() => window.open(message.message_text, '_blank')} /> : message.message_type === 'video' ? <video src={message.message_text} controls className="max-w-full h-auto rounded-lg" style={{
                maxHeight: '300px'
              }} /> : <div className="text-sm leading-relaxed">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              {message.is_encrypted && message.message_type === 'text' ? 
                                decryptedMessages[message.id] || '🔓 Decrypting...' : 
                                message.message_text
                              }
                            </div>
                            {message.is_encrypted && (
                              <Shield className="h-3 w-3 opacity-60 flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                        </div>}
                      
                      {message.message_type !== 'emoji' && message.message_type !== 'sticker' && <div className="mt-1.5 text-[10px] opacity-60 text-right">
                          {new Date(message.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
                          {isOwn && <span className={`ml-1 text-[9px] ${message.is_read ? 'text-blue-400' : 'text-muted-foreground'}`}>
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
                          {Object.entries(
                            messageReactions[message.id].reduce((acc, reaction) => {
                              if (!acc[reaction.emoji]) {
                                acc[reaction.emoji] = 0;
                              }
                              acc[reaction.emoji]++;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([emoji, count]) => (
                            <span key={emoji} className="text-sm bg-background rounded-full border shadow-sm px-1">
                              {emoji}
                            </span>
                          ))}
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

      {/* Message Input - Mobile keyboard responsive */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 transition-all duration-300 ease-in-out"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          transform: 'translateY(calc(-1 * env(keyboard-inset-height, 0px)))'
        }}
      >
        <div className="w-full px-2 sm:px-3 py-2 sm:py-3">
          <div className="flex gap-1 sm:gap-2 items-center max-w-full">
            {/* Gallery Button */}
            <Button variant="ghost" size="sm" onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.accept = 'image/*,video/*';
              fileInputRef.current.click();
            }
          }} className="rounded-full h-8 w-8 p-0 flex-shrink-0">
              <Image className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 relative min-w-0">
              <Input ref={inputRef} placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} className="h-8 sm:h-9 rounded-full border focus:border-primary text-sm pl-9 sm:pl-10 pr-3" disabled={loading} />
              <Button variant="ghost" size="sm" onClick={startCamera} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full h-6 w-6 p-0">
                <Camera className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Love Stickers Button */}
            
            
            {/* Emoji Button */}
            
            
            {/* Send Button */}
            <Button onClick={() => sendMessage(newMessage)} disabled={loading || !newMessage.trim()} size="sm" className="rounded-full h-8 w-8 p-0 flex-shrink-0">
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

      {/* Camera Interface */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col">
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Camera Controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={stopCamera}
                className="bg-black/50 text-white hover:bg-black/70"
              >
                <X className="h-6 w-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={switchCamera}
                className="bg-black/50 text-white hover:bg-black/70"
              >
                <RotateCcw className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Capture Button */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <Button
                size="lg"
                onClick={capturePhoto}
                className="rounded-full w-16 h-16 bg-white hover:bg-gray-200 border-4 border-white"
              >
                <span className="text-2xl">💕</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>;
};