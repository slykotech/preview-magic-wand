import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Sparkles } from 'lucide-react';

interface LoveGrantWinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (requestText: string) => void;
  winnerName: string;
  isSubmitting: boolean;
}

const PRESET_GRANTS = [
  "Plan our next date night and surprise me with dessert",
  "Send me one romantic message every day this week",
  "Cook my favorite meal this weekend",
  "Surprise me with something special this week",
  "Ask me a secret question you've always wanted to know"
];

export const LoveGrantWinModal: React.FC<LoveGrantWinModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  winnerName,
  isSubmitting
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');

  const handleSubmit = () => {
    const requestText = selectedPreset || customText;
    if (requestText.trim()) {
      onSubmit(requestText.trim());
    }
  };

  const handlePresetClick = (preset: string) => {
    setSelectedPreset(preset);
    setCustomText('');
  };

  const handleCustomChange = (value: string) => {
    setCustomText(value);
    setSelectedPreset('');
  };

  const canSubmit = (selectedPreset || customText.trim()) && !isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            You won! Make your Love Grant
            <Heart className="w-5 h-5 text-red-500" />
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-center text-muted-foreground">
            Choose a preset or create your own romantic request
          </p>
          
          <div className="space-y-2">
            <h4 className="font-medium">Quick presets:</h4>
            {PRESET_GRANTS.map((preset, index) => (
              <Card 
                key={index} 
                className={`cursor-pointer transition-colors ${
                  selectedPreset === preset 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handlePresetClick(preset)}
              >
                <CardContent className="p-3">
                  <p className="text-sm">{preset}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Or write your own:</h4>
            <Textarea
              placeholder="Enter your romantic request... (max 200 characters)"
              value={customText}
              onChange={(e) => handleCustomChange(e.target.value)}
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {customText.length}/200
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Skip for now
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1"
            >
              {isSubmitting ? 'Sending...' : 'Send Grant'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};