import { useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProfileImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  className?: string;
}

export const ProfileImageUpload = ({ 
  currentImageUrl, 
  onImageUploaded, 
  className = "" 
}: ProfileImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadImage = async (file: File) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to upload images",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      onImageUploaded(publicUrl);
      
      toast({
        title: "Profile picture updated! 📸",
        description: "Your new avatar looks amazing!",
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload your image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Avatar Display */}
      <div className="relative w-16 h-16 rounded-full overflow-hidden shadow-lg border-4 border-white">
        <img 
          src={currentImageUrl || '/placeholder.svg'} 
          alt="Profile Avatar" 
          className="w-full h-full object-cover"
        />
        
        {/* Upload Overlay */}
        <div 
          className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
            uploading ? 'opacity-100' : 'opacity-0 hover:opacity-100'
          } cursor-pointer`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
          ) : (
            <label htmlFor="avatar-upload" className="cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>

      {/* Upload Button (Mobile/Fallback) */}
      <div className="absolute -bottom-2 -right-2">
        <label htmlFor="avatar-upload-btn">
          <Button
            variant="default"
            size="icon"
            className="w-8 h-8 rounded-full bg-gradient-primary hover:opacity-90 border-2 border-white shadow-lg"
            disabled={uploading}
            asChild
          >
            <div>
              <Camera className="w-4 h-4 text-white" />
              <input
                id="avatar-upload-btn"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </Button>
        </label>
      </div>
    </div>
  );
};