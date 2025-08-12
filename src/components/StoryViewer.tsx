import React, { useState, useEffect } from 'react';
import { X, Heart, Send, Camera, MessageCircle, Eye, Trash2, Smile } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { StoryUploader } from './StoryUploader';

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
  showUploadInterface?: boolean;
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
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [partnerStories, setPartnerStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [responses, setResponses] = useState<StoryResponse[]>([]);
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [progressTimer, setProgressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showQuickReactions, setShowQuickReactions] = useState(false);

  const quickEmojis = ['❤️', '😂', '😍', '🔥', '👏', '😢', '😮', '👍'];

  useEffect(() => {
    console.log('📖 [StoryViewer] useEffect triggered - START DEBUGGING');
    console.log('📖 [StoryViewer] Props received:', { 
      isOpen, 
      showUploadInterface, 
      isOwnStory, 
      targetUserId,
      coupleId 
    });
    
    if (isOpen) {
      console.log('📖 [StoryViewer] StoryViewer is opening...');
      setIsInitialLoad(true);
      
      // If showUploadInterface is true, immediately show create story interface
      if (showUploadInterface && isOwnStory) {
        console.log('📖 [StoryViewer] Upload interface requested - showing create story');
        setShowCreateStory(true);
        setIsInitialLoad(false);
        console.log('📖 [StoryViewer] Set showCreateStory to: true');
        // Don't fetch stories if we're in upload mode
        return;
      } else {
        console.log('📖 [StoryViewer] Normal story viewer mode - fetching stories');
        setShowCreateStory(false);
        fetchStories();
      }
    } else {
      console.log('📖 [StoryViewer] StoryViewer is closed');
    }
  }, [isOpen, targetUserId, showUploadInterface, isOwnStory]);

  // Get current stories array based on context
  const currentStories = isOwnStory ? userStories : partnerStories;

  useEffect(() => {
    if (currentStories.length > 0 && currentStoryIndex < currentStories.length) {
      fetchStoryResponses();
      if (!isOwnStory) {
        markStoryAsViewed();
      }
    }
  }, [currentStoryIndex, currentStories, isOwnStory]);

  const fetchStories = async () => {
    console.log('fetchStories called');
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

      // Separate user and partner stories
      if (isOwnStory) {
        setUserStories(storiesWithViewStatus);
        console.log('Set user stories:', storiesWithViewStatus.length);
      } else {
        setPartnerStories(storiesWithViewStatus);
        console.log('Set partner stories:', storiesWithViewStatus.length);
      }
      
      setIsInitialLoad(false);
      
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
        
        // Separate user and partner stories in fallback
        if (isOwnStory) {
          setUserStories(storiesWithFallbackStatus);
        } else {
          setPartnerStories(storiesWithFallbackStatus);
        }
        
        setIsInitialLoad(false);
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
        toast.error('Failed to load stories');
        setIsInitialLoad(false);
      }
    }
  };

  const fetchStoryResponses = async () => {
    if (!currentStories[currentStoryIndex]) return;

    try {
      const { data, error } = await supabase
        .from('story_responses')
        .select('*')
        .eq('story_id', currentStories[currentStoryIndex].id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching story responses:', error);
    }
  };

  const markStoryAsViewed = async () => {
    if (!user || !currentStories[currentStoryIndex]) return;

    try {
      await supabase
        .from('story_views')
        .insert({
          story_id: currentStories[currentStoryIndex].id,
          viewer_id: user.id
        });
    } catch (error) {
      console.log('Story view already recorded or error:', error);
    }
  };

  const handleSendResponse = async (text: string) => {
    if (!text.trim() || !user || !currentStories[currentStoryIndex]) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('story_responses')
        .insert({
          story_id: currentStories[currentStoryIndex].id,
          user_id: user.id,
          response_text: text.trim()
        });

      if (error) throw error;
      
      setResponseText('');
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

  const nextStory = () => {
    if (currentStoryIndex < currentStories.length - 1) {
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
      const storyToDelete = currentStories.find(s => s.id === storyId);
      if (storyToDelete?.image_url) {
        const urlParts = storyToDelete.image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${user?.id}/${fileName}`;
        
        // Delete from storage (non-blocking)
        supabase.storage
          .from('stories')
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
      const updatedStories = currentStories.filter(s => s.id !== storyId);
      if (isOwnStory) {
        setUserStories(updatedStories);
      } else {
        setPartnerStories(updatedStories);
      }
      
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
    console.log('📖 [StoryViewer] *** RENDERING STORYUPLOADER FROM STORYVIEWER ***');
    return (
      <StoryUploader
        isOpen={true}
        onClose={() => {
          console.log('📖 [StoryViewer] StoryUploader onClose called');
          setShowCreateStory(false);
          if (currentStories.length === 0) onClose();
        }}
        onSuccess={() => {
          console.log('📖 [StoryViewer] StoryUploader onSuccess called');
          setShowCreateStory(false); // Close the create story interface
          fetchStories(); // Fetch the new stories
          setIsInitialLoad(false); // Ensure we're not in loading state
        }}
        user={user}
      />
    );
  }

  // Show loading state while fetching stories (not upload mode)
  if (isInitialLoad && !showUploadInterface) {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="text-center text-white space-y-6 p-8">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Loading Stories...</h3>
            <p className="text-muted-foreground">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStories.length === 0 && !isInitialLoad) {
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

  const currentStory = currentStories[currentStoryIndex];

  // Safety check: if no current story, don't render story interface
  if (!currentStory) {
    console.log('📖 [StoryViewer] No current story available - showing empty state');
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="text-center text-white space-y-6 p-8">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
            <Camera className="h-12 w-12 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">No Stories Available</h3>
            <p className="text-muted-foreground">Please create a story first</p>
          </div>
          <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[110] animate-fade-in">
      <div className="relative w-full max-w-md h-full max-h-[80vh] bg-black rounded-lg overflow-hidden shadow-2xl animate-scale-in">
        {/* Story Progress Bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
          {currentStories.map((_, index) => (
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

          {/* Quick Emoji Reactions (for partner's stories) */}
          {!isOwnStory && showQuickReactions && (
            <div className="absolute bottom-24 left-4 right-4 z-20">
              <div className="flex gap-4 mb-3 justify-center bg-black/30 backdrop-blur-sm rounded-full px-4 py-3">
                {quickEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleEmojiResponse(emoji);
                      setShowQuickReactions(false);
                    }}
                    className="text-lg p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 hover:scale-110 active:scale-95"
                    disabled={loading}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Caption - positioned above quick reactions and response section */}
          {currentStory.caption && (
            <div className={`absolute left-4 right-4 text-white z-15 ${
              !isOwnStory ? 'bottom-20' : 'bottom-12'
            }`}>
              <p className="text-sm bg-black/60 backdrop-blur-sm p-3 rounded-lg leading-relaxed">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Story Reactions Display - positioned as rounded bubbles in bottom right */}
          {responses.length > 0 && (
            <div className={`absolute right-4 text-white z-15 ${
              !isOwnStory ? 'bottom-20' : 'bottom-16'
            }`}>
              <div className="flex flex-col gap-2 items-end max-w-[200px]">
                {(() => {
                  // Filter to show only the latest reaction from each user
                  const latestResponsesMap = new Map();
                  responses.forEach((response) => {
                    if (!latestResponsesMap.has(response.user_id) || 
                        new Date(response.created_at) > new Date(latestResponsesMap.get(response.user_id).created_at)) {
                      latestResponsesMap.set(response.user_id, response);
                    }
                  });
                  
                  return Array.from(latestResponsesMap.values()).map((response) => (
                    <div 
                      key={response.id} 
                      className="bg-black/70 backdrop-blur-sm rounded-full px-3 py-2 text-sm animate-fade-in"
                    >
                      <span className="text-base">{response.response_text}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Response Section (only for partner's stories) */}
        {!isOwnStory && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 z-30">
            
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
                variant="ghost"
                size="icon"
                onClick={() => setShowQuickReactions(!showQuickReactions)}
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