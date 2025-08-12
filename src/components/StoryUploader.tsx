import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Camera, Upload, Image, Smile, RotateCcw, SwitchCamera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

interface StoryUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

export const StoryUploader: React.FC<StoryUploaderProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user
}) => {
  console.log('🎥 [StoryUploader] Component rendered with props:', {
    isOpen,
    user: user ? { id: user.id, email: user.email } : null
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(true); // Start with camera options visible
  const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>('user'); // front camera by default
  
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFileInputRef = useRef<HTMLInputElement>(null);

  const checkCameraSupport = () => {
    const hasMediaDevices = !!navigator.mediaDevices;
    const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
    const isSecureContext = window.isSecureContext;
    
    console.log('Camera support check:', {
      hasMediaDevices,
      hasGetUserMedia,
      isSecureContext,
      protocol: location.protocol,
      hostname: location.hostname
    });
    
    if (!hasMediaDevices || !hasGetUserMedia) {
      toast({
        title: "Camera not supported",
        description: "Camera not supported on this device or browser",
        variant: "destructive"
      });
      return false;
    }
    
    if (!isSecureContext && location.hostname !== 'localhost') {
      toast({
        title: "HTTPS required",
        description: "Camera requires HTTPS connection",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const startCamera = async (facingMode: 'user' | 'environment' = currentCamera) => {
    console.log(`[StoryUploader] Starting camera with facing mode: ${facingMode}`);
    
    try {
      console.log('=== CAMERA ACCESS ATTEMPT ===');
      
      // Step 1: Check basic camera support
      if (!checkCameraSupport()) {
        console.log('Camera support check failed');
        return;
      }
      console.log('Camera support check passed');

      console.log('About to request camera stream...');
      
      // Step 2: Request camera access with facing mode constraint
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 }
        },
        audio: false 
      });
      
      console.log('✅ Camera stream obtained successfully!', stream);
      console.log('Stream active:', stream.active);
      console.log('Video tracks:', stream.getVideoTracks().length);
      
      // Update current camera state
      setCurrentCamera(facingMode);
      
      // Step 3: Show camera UI after we have the stream
      console.log('Setting showCamera to true...');
      setShowCamera(true);
      setShowCameraOptions(false); // Hide options modal
      
      // Step 4: Wait for video element to be rendered
      console.log('Waiting for video element...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('Video ref current:', !!videoRef.current);
      if (videoRef.current) {
        console.log('📹 Connecting stream to video element...');
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('muted', 'true');
        
        console.log('Starting video playback...');
        await videoRef.current.play();
        console.log('✅ Video playing successfully!');
        
        toast({
          title: "Camera ready! 📸",
          description: "Camera is working!"
        });
      } else {
        console.error('❌ Video element not found after waiting!');
        // Clean up the stream if video element failed
        stream.getTracks().forEach(track => track.stop());
        setShowCamera(false);
        toast({
          title: "Video element missing",
          description: "Could not find video element",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ Camera access error:', error);
      setShowCamera(false); // Ensure camera UI is hidden on any error
      
      // Enhanced error handling with specific solutions
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Camera access denied",
          description: "Please allow camera permissions and try again.",
          variant: "destructive"
        });
      } else if (error.name === 'NotFoundError') {
        toast({
          title: "No camera found",
          description: "No camera found on this device.",
          variant: "destructive"
        });
      } else if (error.name === 'NotReadableError') {
        toast({
          title: "Camera busy",
          description: "Camera is already in use by another application.",
          variant: "destructive"
        });
      } else if (error.name === 'OverconstrainedError') {
        console.log('Camera constraints too strict, trying with basic settings...');
        await startBasicCamera();
      } else if (error.name === 'SecurityError') {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
          toast({
            title: "HTTPS required",
            description: "Camera requires HTTPS. Please use a secure connection.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Security error",
            description: "Camera access blocked by security policy.",
            variant: "destructive"
          });
        }
      } else {
        console.log('Unknown camera error, trying basic camera...');
        await startBasicCamera();
      }
    }
  };

  const switchCamera = async () => {
    console.log('Switching camera from', currentCamera, 'to', currentCamera === 'user' ? 'environment' : 'user');
    const newFacingMode = currentCamera === 'user' ? 'environment' : 'user';
    
    // Stop current camera
    stopCamera();
    
    // Start camera with new facing mode
    await startCamera(newFacingMode);
  };

  // Fallback camera access with minimal constraints
  const startBasicCamera = async () => {
    try {
      console.log('Attempting basic camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Only show camera UI after getting the stream
      setShowCamera(true);
      
      // Wait for video element to be rendered
      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        try { videoRef.current.setAttribute('muted', 'true'); } catch {}
        await videoRef.current.play();
        toast({
          title: "Camera ready! 📸",
          description: "Camera is ready with basic settings!"
        });
      } else {
        // Clean up stream if video element not available
        stream.getTracks().forEach(track => track.stop());
        setShowCamera(false);
        toast({
          title: "Camera setup failed",
          description: "Video element not available",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Basic camera access also failed:', error);
      setShowCamera(false);
      toast({
        title: "Camera unavailable",
        description: "Unable to access camera. Please check your device and browser.",
        variant: "destructive"
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Camera not ready",
        description: "Camera not ready for capture",
        variant: "destructive"
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      toast({
        title: "Canvas not supported",
        description: "Canvas not supported",
        variant: "destructive"
      });
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `story-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        stopCamera();
        toast({
          title: "Photo captured! 📸",
          description: "Add a caption and share your story."
        });
      } else {
        toast({
          title: "Capture failed",
          description: "Failed to capture photo",
          variant: "destructive"
        });
      }
    }, 'image/jpeg', 0.8);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[StoryUploader] File input triggered');
    const file = event.target.files?.[0];
    if (file) {
      console.log('[StoryUploader] File selected:', file.name, file.type, file.size);
      setSelectedFile(file);
      setShowCamera(false);
      toast({
        title: "Photo selected! 📷",
        description: "Add a caption and share your story."
      });
    } else {
      console.log('[StoryUploader] No file selected');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      // Upload image to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `story-${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      // Get the user's couple_id from couples table
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single();

      if (coupleError || !coupleData?.id) {
        throw new Error('User must be in a couple to share stories');
      }

      // Save story to database
      const { error: dbError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          couple_id: coupleData.id,
          image_url: publicUrl,
          caption: caption.trim() || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });

      if (dbError) throw dbError;

      toast({
        title: "Story shared! ✨",
        description: "Your story has been shared successfully!"
      });
      
      // Reset form
      setSelectedFile(null);
      setCaption('');
      setShowCamera(false);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to share story. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setCaption(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  if (!isOpen) {
    console.log('🎥 [StoryUploader] Component not open, returning null');
    return null;
  }

  console.log('🎥 [StoryUploader] Rendering component with states:', {
    showCamera,
    showCameraOptions,
    selectedFile: !!selectedFile,
    isOpen
  });

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden animate-scale-in">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Share Your Story
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                stopCamera();
                setSelectedFile(null);
                setCaption('');
                onClose();
              }}
              className="rounded-full hover:bg-muted/50 transition-all duration-300 hover:scale-110"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Camera Options Modal */}
          {showCameraOptions && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-4">Choose Camera Option</h3>
                <div className="grid grid-cols-1 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCameraOptions(false);
                      fileInputRef.current?.click();
                    }}
                    className="bg-gradient-to-br from-background to-muted/20 hover:from-muted/20 hover:to-muted/40 border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 py-6"
                  >
                    <Image className="h-6 w-6 mr-3" />
                    Choose from Gallery
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => startCamera('user')}
                    className="bg-gradient-to-br from-background to-muted/20 hover:from-muted/20 hover:to-muted/40 border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 py-6"
                  >
                    <Camera className="h-6 w-6 mr-3" />
                    Take Photo (Front Camera)
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => startCamera('environment')}
                    className="bg-gradient-to-br from-background to-muted/20 hover:from-muted/20 hover:to-muted/40 border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 py-6"
                  >
                    <Camera className="h-6 w-6 mr-3" />
                    Take Photo (Rear Camera)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showCamera ? (
            <div className="space-y-6 animate-fade-in">
              <div className="relative overflow-hidden rounded-xl border border-border/20 animate-scale-in" style={{ animationDelay: '200ms' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-72 object-cover bg-gradient-to-br from-muted to-muted/50 transition-all duration-500"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                
                {/* Camera controls overlay */}
                <div className="absolute top-4 right-4 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={switchCamera}
                    className="bg-black/20 text-white hover:bg-black/40 rounded-full"
                  >
                    <SwitchCamera className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Camera overlay with smooth pulse animation */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="absolute top-4 left-4 w-3 h-3 bg-red-500/50 rounded-full animate-ping"></div>
                  <div className="absolute top-8 left-4 text-xs text-white bg-black/50 px-2 py-1 rounded">
                    {currentCamera === 'user' ? 'Front Camera' : 'Rear Camera'}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 animate-fade-in" style={{ animationDelay: '400ms' }}>
                <Button
                  variant="outline"
                  onClick={stopCamera}
                  className="flex-1 hover:bg-muted/50 border-border/50 transition-all duration-300 hover:scale-105"
                >
                  Cancel
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          ) : !selectedFile ? (
            <div className="space-y-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <label htmlFor="story-upload" className="cursor-pointer group">
                <div className="border-2 border-dashed border-border/40 rounded-xl p-10 text-center hover:border-primary/50 transition-all duration-300 bg-gradient-to-br from-muted/20 to-background group-hover:from-primary/5 group-hover:to-primary/10 animate-scale-in" style={{ animationDelay: '300ms' }}>
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
                <input
                  id="story-camera"
                  ref={cameraFileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  onClick={(e) => {
                    console.log('[StoryUploader] Camera file input clicked');
                    // Reset the input value to allow selecting the same file again
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              
              <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '500ms' }}>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    console.log('[StoryUploader] Choose Photo button clicked');
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }}
                  className="bg-gradient-to-br from-background to-muted/20 hover:from-muted/20 hover:to-muted/40 border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                >
                  <Image className="h-4 w-4 mr-2" />
                  Choose Photo
                </Button>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    console.log('[StoryUploader] Camera button clicked - showing options');
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCameraOptions(true);
                  }}
                  className="bg-gradient-to-br from-background to-muted/20 hover:from-muted/20 hover:to-muted/40 border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="relative overflow-hidden rounded-xl border border-border/20 animate-scale-in" style={{ animationDelay: '200ms' }}>
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Selected story"
                  className="w-full h-72 object-cover transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: '400ms' }}>
                <div className="relative">
                  <Textarea
                    placeholder="Add a caption... (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="min-h-20 resize-none pr-12 bg-muted/30 border-border/50 focus:border-primary/50 transition-all duration-300"
                    maxLength={500}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute bottom-2 right-2 h-8 w-8 hover:bg-primary/10 transition-all duration-300"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                
                {showEmojiPicker && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/20 animate-fade-in">
                    {['❤️', '😍', '🥰', '😘', '💕', '🌹', '✨', '🎉', '🔥', '💫', '🌈', '💖'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="text-xl hover:bg-primary/10 rounded p-1 transition-all duration-200 hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground text-right">
                  {caption.length}/500
                </div>
              </div>
              
              <div className="flex gap-3 animate-fade-in" style={{ animationDelay: '600ms' }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setCaption('');
                  }}
                  className="flex-1 hover:bg-muted/50 border-border/50 transition-all duration-300 hover:scale-105"
                >
                  Choose Different
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50"
                >
                  {uploading ? 'Sharing...' : 'Share Story'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};