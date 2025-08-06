import React, { useState, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {!previewUrl ? (
        // Photo selection options
        <div className="grid grid-cols-2 gap-3">
          {/* Camera option */}
          <label className="cursor-pointer">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              disabled={isSubmitting}
            />
            <div className="p-4 bg-gradient-to-br from-primary/10 to-purple-100 rounded-lg text-center hover:from-primary/20 hover:to-purple-200 transition">
              <span className="text-4xl block mb-2">📷</span>
              <span className="text-sm font-medium text-primary">Take Photo</span>
            </div>
          </label>

          {/* Upload option */}
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              disabled={isSubmitting}
            />
            <div className="p-4 bg-gradient-to-br from-secondary/10 to-pink-100 rounded-lg text-center hover:from-secondary/20 hover:to-pink-200 transition">
              <span className="text-4xl block mb-2">🖼️</span>
              <span className="text-sm font-medium text-secondary">Upload Photo</span>
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