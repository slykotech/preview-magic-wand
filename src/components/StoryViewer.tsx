import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, Camera, Upload, Smile, MessageCircle, Eye, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  view_count: number;
  has_partner_viewed?: boolean;
}

interface StoryResponse {
  id: string;
  user_id: string;
  response_text: string;
  created_at: string;
}

interface StoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  coupleId: string;
  isOwnStory: boolean;
  showUploadInterface?: boolean; // New prop to control upload interface
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  isOpen,
  onClose,
  targetUserId,
  coupleId,
  isOwnStory,
  showUploadInterface = false
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [responses, setResponses] = useState<StoryResponse[]>([]);
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [progressTimer, setProgressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);

  const quickEmojis = ['❤️', '😂', '😍', '🔥', '👏', '😢', '😮', '👍'];

  useEffect(() => {
    if (isOpen) {
      // If showUploadInterface is true, immediately show create story interface
      if (showUploadInterface && isOwnStory) {
        setShowCreateStory(true);
      } else {
        fetchStories();
      }
    }
  }, [isOpen, targetUserId, showUploadInterface, isOwnStory]);

  // Only show create story interface when no existing stories AND not explicitly from avatar click
  useEffect(() => {
    if (isOpen && isOwnStory && showUploadInterface && stories.length === 0) {
      setShowCreateStory(true);
    } else if (isOpen && !showUploadInterface) {
      setShowCreateStory(false); // Ensure upload interface is hidden for avatar clicks
    }
  }, [isOpen, isOwnStory, showUploadInterface, stories.length]);

  useEffect(() => {
    if (stories.length > 0 && currentStoryIndex < stories.length) {
      fetchStoryResponses();
      if (!isOwnStory) {
        markStoryAsViewed();
      }
    }
  }, [currentStoryIndex, stories]);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          story_views(viewer_id)
        `)
        .eq('user_id', targetUserId)
        .eq('couple_id', coupleId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process stories with view status
      const storiesWithViewStatus = (data || []).map(story => ({
        ...story,
        has_partner_viewed: story.story_views?.some((view: any) => view.viewer_id !== story.user_id) || false
      }));

      setStories(storiesWithViewStatus);
      
    } catch (error) {
      console.error('Error fetching stories:', error);
      
      // Fallback: fetch stories without view status if join fails
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('stories')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('couple_id', coupleId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        
        const storiesWithFallbackStatus = (fallbackData || []).map(story => ({
          ...story,
          has_partner_viewed: false
        }));
        
        setStories(storiesWithFallbackStatus);
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
        toast.error('Failed to load stories');
      }
    }
  };

  const fetchStoryResponses = async () => {
    if (!stories[currentStoryIndex]) return;

    try {
      const { data, error } = await supabase
        .from('story_responses')
        .select('*')
        .eq('story_id', stories[currentStoryIndex].id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching story responses:', error);
    }
  };

  const markStoryAsViewed = async () => {
    if (!user || !stories[currentStoryIndex]) return;

    try {
      await supabase
        .from('story_views')
        .insert({
          story_id: stories[currentStoryIndex].id,
          viewer_id: user.id
        });
    } catch (error) {
      console.log('Story view already recorded or error:', error);
    }
  };

  const handleSendResponse = async (text: string) => {
    if (!text.trim() || !user || !stories[currentStoryIndex]) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('story_responses')
        .insert({
          story_id: stories[currentStoryIndex].id,
          user_id: user.id,
          response_text: text.trim()
        });

      if (error) throw error;
      
      setResponseText('');
      setShowEmojiPicker(false);
      fetchStoryResponses();
      toast.success('Response sent!');
    } catch (error) {
      console.error('Error sending response:', error);
      toast.error('Failed to send response');
    } finally {
      setLoading(false);
    }
  };

  const handleEmojiResponse = (emoji: string) => {
    handleSendResponse(emoji);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowCamera(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Camera access denied');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const handleCreateStory = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      // Upload image to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('story-images')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('story-images')
        .getPublicUrl(fileName);

      // Create story record
      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          couple_id: coupleId,
          user_id: user.id,
          image_url: publicUrl,
          caption: caption.trim() || null
        });

      if (storyError) throw storyError;

      toast.success('Story created successfully!');
      setSelectedFile(null);
      setCaption('');
      setShowCreateStory(false);
      fetchStories();
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error('Failed to create story');
    } finally {
      setUploading(false);
    }
  };

  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      // First delete the image from storage
      const storyToDelete = stories.find(s => s.id === storyId);
      if (storyToDelete?.image_url) {
        const urlParts = storyToDelete.image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${user?.id}/${fileName}`;
        
        // Delete from storage (non-blocking)
        supabase.storage
          .from('story-images')
          .remove([filePath])
          .then(({ error: storageError }) => {
            if (storageError) console.log('Storage deletion warning:', storageError);
          });
      }

      // Delete story from database
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', user?.id); // Ensure user can only delete their own stories

      if (error) throw error;

      toast.success('Story deleted');
      setShowDeleteConfirm(false);
      setStoryToDelete(null);
      
      // Update stories list
      const updatedStories = stories.filter(s => s.id !== storyId);
      setStories(updatedStories);
      
      // Handle navigation after deletion
      if (updatedStories.length === 0) {
        onClose();
      } else if (currentStoryIndex >= updatedStories.length) {
        setCurrentStoryIndex(Math.max(0, updatedStories.length - 1));
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      toast.error('Failed to delete story');
      setShowDeleteConfirm(false);
      setStoryToDelete(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (!isOpen) return null;

  if (showCreateStory) {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-gradient-to-br from-background via-background to-background/95 border border-border/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Create Story
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Share a moment with your partner</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowCreateStory(false);
                if (stories.length === 0) onClose();
              }}
              className="rounded-full hover:bg-muted/50"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {showCamera ? (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-xl border border-border/20">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-72 object-cover bg-gradient-to-br from-muted to-muted/50"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={stopCamera}
                  className="flex-1 hover:bg-muted/50 border-border/50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          ) : !selectedFile ? (
            <div className="space-y-6">
              <label htmlFor="story-upload" className="cursor-pointer group">
                <div className="border-2 border-dashed border-border/40 rounded-xl p-10 text-center hover:border-primary/50 transition-all duration-300 bg-gradient-to-br from-muted/20 to-background group-hover:from-primary/5 group-hover:to-primary/10">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Upload className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-foreground font-medium mb-2">Click to upload image</p>
                  <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                </div>
                <input
                  id="story-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={startCamera}
                  className="bg-gradient-to-br from-background to-muted/20 hover:from-muted/20 hover:to-muted/40 border-border/50 hover:border-primary/50 transition-all duration-300"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-br from-background to-muted/20 hover:from-muted/20 hover:to-muted/40 border-border/50 hover:border-primary/50 transition-all duration-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Gallery
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-xl border border-border/20">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Story preview"
                  className="w-full h-72 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              
              <Textarea
                placeholder="Add a caption to your story..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="bg-gradient-to-br from-background to-muted/20 border-border/50 focus:border-primary/50 resize-none"
              />
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedFile(null)}
                  className="hover:bg-muted/50 border-border/50"
                >
                  Change Photo
                </Button>
                <Button
                  onClick={handleCreateStory}
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Share Story'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="text-center text-white space-y-6 p-8">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
            <Camera className="h-12 w-12 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              {isOwnStory ? 'No Stories Yet' : 'No Stories Available'}
            </h3>
            <p className="text-muted-foreground">
              {isOwnStory 
                ? 'Share your first moment with your partner'
                : 'Your partner hasn\'t shared any stories yet'
              }
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            {isOwnStory && (
              <Button 
                onClick={() => setShowCreateStory(true)}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
              >
                <Camera className="h-4 w-4 mr-2" />
                Create Story
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentStory = stories[currentStoryIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 animate-fade-in">
      <div className="relative w-full max-w-md h-full max-h-[80vh] bg-black rounded-lg overflow-hidden shadow-2xl animate-scale-in">
        {/* Story Progress Bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
          {stories.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index < currentStoryIndex 
                  ? 'bg-gradient-to-r from-pink-400 to-purple-500' 
                  : index === currentStoryIndex 
                    ? 'bg-gradient-to-r from-white to-white/60 animate-pulse' 
                    : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Header with story info */}
        <div className="absolute top-12 left-4 right-4 z-20 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="text-sm">
              <div className="font-medium">{isOwnStory ? 'Your Story' : 'Partner\'s Story'}</div>
              <div className="text-xs opacity-75">{formatTimeAgo(currentStory.created_at)}</div>
            </div>
            {isOwnStory && (
              <div className="flex items-center gap-1 text-xs">
                <Eye className="h-3 w-3" />
                <span className={currentStory.has_partner_viewed ? 'text-green-400' : 'text-gray-400'}>
                  {currentStory.has_partner_viewed ? 'Seen' : 'Not seen'}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isOwnStory && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setStoryToDelete(currentStory.id);
                  setShowDeleteConfirm(true);
                }}
                className="text-white hover:bg-red-500/20 z-30"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-white hover:bg-white/20 z-30"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Story Image */}
        <div 
          className="relative w-full h-full cursor-pointer"
          onClick={nextStory}
        >
          <img
            src={currentStory.image_url}
            alt="Story"
            className="w-full h-full object-cover"
          />
          
          {/* Navigation Areas */}
          <div 
            className="absolute left-0 top-0 w-1/3 h-full z-10"
            onClick={(e) => {
              e.stopPropagation();
              prevStory();
            }}
          />
          <div 
            className="absolute right-0 top-0 w-1/3 h-full z-10"
            onClick={(e) => {
              e.stopPropagation();
              nextStory();
            }}
          />

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-20 left-4 right-4 text-white">
              <p className="text-sm bg-black/50 p-2 rounded">{currentStory.caption}</p>
            </div>
          )}
        </div>

        {/* Response Section (only for partner's stories) */}
        {!isOwnStory && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            {/* Quick Emoji Reactions */}
            <div className="flex gap-2 mb-3 justify-center">
              {quickEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiResponse(emoji)}
                  className="text-2xl p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 hover:scale-110 active:scale-95"
                  disabled={loading}
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            {/* Text Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Send a message..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendResponse(responseText)}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/60 rounded-full"
              />
              <Button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 rounded-full"
              >
                <Smile className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleSendResponse(responseText)}
                disabled={loading || !responseText.trim()}
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Add Story Button for own stories */}
        {isOwnStory && (
          <div className="absolute bottom-4 right-4">
            <Button
              onClick={() => setShowCreateStory(true)}
              size="icon"
              className="rounded-full bg-primary hover:bg-primary/90 shadow-lg"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Story?</h3>
            <p className="text-gray-600 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setStoryToDelete(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => storyToDelete && handleDeleteStory(storyToDelete)}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};