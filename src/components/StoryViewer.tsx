import React, { useState, useEffect } from 'react';
import { X, Heart, Send, Camera, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  view_count: number;
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
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  isOpen,
  onClose,
  targetUserId,
  coupleId,
  isOwnStory
}) => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [responses, setResponses] = useState<StoryResponse[]>([]);
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStories();
    }
  }, [isOpen, targetUserId]);

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
        .select('*')
        .eq('user_id', targetUserId)
        .eq('couple_id', coupleId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
      
      if (isOwnStory && (!data || data.length === 0)) {
        setShowCreateStory(true);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      toast.error('Failed to load stories');
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

  const handleSendResponse = async () => {
    if (!responseText.trim() || !user || !stories[currentStoryIndex]) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('story_responses')
        .insert({
          story_id: stories[currentStoryIndex].id,
          user_id: user.id,
          response_text: responseText.trim()
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
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

  if (!isOpen) return null;

  if (showCreateStory || (isOwnStory && stories.length === 0)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Create Story</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowCreateStory(false);
                if (stories.length === 0) onClose();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!selectedFile ? (
            <div className="space-y-4">
              <label htmlFor="story-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Click to upload image</p>
                  <p className="text-sm text-gray-400">PNG, JPG up to 10MB</p>
                </div>
                <input
                  id="story-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // TODO: Implement camera capture
                  toast.info('Camera feature coming soon!');
                }}
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Story preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
              
              <Textarea
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
              />
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedFile(null)}
                >
                  Change Photo
                </Button>
                <Button
                  onClick={handleCreateStory}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? 'Creating...' : 'Share Story'}
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
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <p className="text-lg mb-4">No stories available</p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  const currentStory = stories[currentStoryIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
      <div className="relative w-full max-w-md h-full max-h-[80vh] bg-black rounded-lg overflow-hidden">
        {/* Story Progress Bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
          {stories.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full ${
                index <= currentStoryIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>

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
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Send a message..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendResponse()}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/60"
              />
              <Button
                onClick={handleSendResponse}
                disabled={loading || !responseText.trim()}
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
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
              className="rounded-full"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};