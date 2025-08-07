import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PhotoInputProps {
  onPhotoSelected: (url: string, caption?: string) => void;
  isSubmitting: boolean;
}

export const PhotoInput: React.FC<PhotoInputProps> = ({ onPhotoSelected, isSubmitting }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload' | null>(null);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkDevice = () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                      window.innerWidth < 768;
      setDeviceType(isMobile ? 'mobile' : 'desktop');
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const handleFileSelect = (file: File, mode: 'camera' | 'upload') => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setCaptureMode(mode);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = () => {
    if (deviceType === 'mobile' && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else {
      // On desktop, try webcam or fallback
      if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        openWebcam();
      } else {
        alert('Camera not available on this device. Please upload a photo instead.');
      }
    }
  };

  const openWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-4 max-w-2xl w-full">
          <div class="relative">
            <video id="webcam-video" class="w-full rounded" autoplay></video>
            <div class="mt-4 flex gap-3 justify-center">
              <button id="capture-btn" class="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold">
                📸 Capture
              </button>
              <button id="close-btn" class="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const modalVideo = modal.querySelector('#webcam-video') as HTMLVideoElement;
      modalVideo.srcObject = stream;
      
      const captureBtn = modal.querySelector('#capture-btn');
      captureBtn?.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = modalVideo.videoWidth;
        canvas.height = modalVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(modalVideo, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleFileSelect(file, 'camera');
          }
        }, 'image/jpeg', 0.9);
        
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
      });
      
      const closeBtn = modal.querySelector('#close-btn');
      closeBtn?.addEventListener('click', () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
      });
      
    } catch (error) {
      console.error('Webcam error:', error);
      alert('Unable to access camera. Please check permissions or use upload instead.');
    }
  };

  const uploadPhoto = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Create unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `card-responses/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('game-photos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('game-photos')
        .getPublicUrl(filePath);

      console.log('Photo uploaded:', publicUrl);
      onPhotoSelected(publicUrl, caption.trim());

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setCaptureMode(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {!previewUrl ? (
        // Photo selection options
        <div className="grid grid-cols-2 gap-3">
          {/* Camera option */}
          <div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, 'camera');
              }}
              className="hidden"
              disabled={isSubmitting}
            />
            <button
              onClick={handleCameraClick}
              disabled={isSubmitting}
              className="w-full p-4 bg-gradient-to-br from-card to-muted/50 border border-border rounded-xl text-center hover:bg-gradient-to-br hover:from-muted hover:to-muted/80 transition-all duration-300 shadow-md hover:shadow-xl group cursor-pointer"
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
                  <span className="text-xl">📷</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-foreground block">Take Photo</span>
                  <span className="text-xs text-muted-foreground">Use camera</span>
                </div>
              </div>
            </button>
          </div>

          {/* Upload option */}
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, 'upload');
              }}
              className="hidden"
              disabled={isSubmitting}
            />
            <div className="w-full p-4 bg-gradient-to-br from-card to-muted/50 border border-border rounded-xl text-center hover:bg-gradient-to-br hover:from-muted hover:to-muted/80 transition-all duration-300 shadow-md hover:shadow-xl group cursor-pointer">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full group-hover:from-accent/30 group-hover:to-accent/20 transition-all duration-300">
                  <span className="text-xl">🖼️</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-foreground block">Upload Photo</span>
                  <span className="text-xs text-muted-foreground">From your gallery</span>
                </div>
              </div>
            </div>
          </label>
        </div>
      ) : (
        // Preview and caption
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-64 object-contain"
            />
            <button
              onClick={resetSelection}
              className="absolute top-2 right-2 p-2 bg-background/80 rounded-full shadow-lg hover:bg-background"
              disabled={isUploading}
            >
              ✕
            </button>
            
            {/* Show capture mode */}
            <div className="absolute top-2 left-2 px-3 py-1 bg-background/80 rounded-full text-xs font-medium">
              {captureMode === 'camera' ? '📷 Camera' : '🖼️ Uploaded'}
            </div>
          </div>

          {/* Optional caption */}
          <div>
            <label className="text-sm text-muted-foreground">Add a caption (optional):</label>
            <Input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's special about this photo?"
              className="mt-1"
              maxLength={200}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground mt-1">{caption.length}/200</p>
          </div>

          {/* Submit button */}
          <Button
            onClick={uploadPhoto}
            disabled={isUploading || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isUploading ? 'Uploading...' : 'Submit Photo'}
          </Button>
        </div>
      )}
    </div>
  );
};