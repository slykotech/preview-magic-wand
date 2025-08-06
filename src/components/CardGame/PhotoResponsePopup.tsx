import React from 'react';
import { Button } from '@/components/ui/button';

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
      <div className="fixed inset-0 bg-black/60 z-40" />
      
      {/* Popup */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-primary to-secondary">
            <h3 className="text-primary-foreground font-semibold text-lg flex items-center gap-2">
              <span className="text-2xl">📸</span>
              {authorName}'s Photo Response
            </h3>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Photo */}
            <div className="mb-4 rounded-lg overflow-hidden bg-muted">
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
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-foreground italic">"{caption}"</p>
              </div>
            )}
            
            {/* Timestamp */}
            <p className="text-sm text-muted-foreground text-center">
              {new Date(timestamp).toLocaleTimeString()}
            </p>
          </div>
          
          {/* Dismiss Button */}
          <div className="p-4 border-t border-border">
            <Button
              onClick={onDismiss}
              className="w-full"
              size="lg"
            >
              Got it! Let me play my turn
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};