import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Camera } from 'lucide-react';

interface PhotoResponsePopupProps {
  isOpen: boolean;
  photoUrl: string;
  caption?: string;
  authorName: string;
  timestamp: string;
  onDismiss: () => void;
}

export const PhotoResponsePopup: React.FC<PhotoResponsePopupProps> = ({ 
  isOpen, 
  photoUrl, 
  caption, 
  authorName, 
  timestamp, 
  onDismiss 
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - blocks all interaction */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      
      {/* Popup */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {authorName}'s Photo Response
                </h3>
                <p className="text-sm opacity-90">
                  {new Date(timestamp).toLocaleString()}
                </p>
              </div>
              <Heart className="h-5 w-5 ml-auto opacity-80" />
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Photo */}
            <div className="mb-6 rounded-xl overflow-hidden bg-muted border border-border shadow-inner">
              <img 
                src={photoUrl} 
                alt="Response" 
                className="w-full h-auto max-h-96 object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </div>
            
            {/* Caption if provided */}
            {caption && (
              <div className="mb-4 p-4 bg-muted/50 border border-border rounded-xl">
                <p className="text-foreground text-lg leading-relaxed">
                  "{caption}"
                </p>
              </div>
            )}
          </div>
          
          {/* Dismiss Button */}
          <div className="p-6 pt-0">
            <Button
              onClick={onDismiss}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold py-3 h-auto shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
            >
              Got it! Let me play my turn ✨
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};