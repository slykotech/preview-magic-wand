import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Clock, User } from 'lucide-react';

interface LoveGrantReceivedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: (reason?: string) => void;
  grant: {
    request_text: string;
    winner_name: string;
    winner_symbol: string;
    expires_at: string;
  };
  isProcessing: boolean;
}

export const LoveGrantReceivedModal: React.FC<LoveGrantReceivedModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  grant,
  isProcessing
}) => {
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const handleDecline = () => {
    if (showDeclineReason) {
      onDecline(declineReason.trim() || undefined);
      setDeclineReason('');
      setShowDeclineReason(false);
    } else {
      setShowDeclineReason(true);
    }
  };

  const handleAccept = () => {
    onAccept();
  };

  const expiresAt = new Date(grant.expires_at);
  const timeLeft = Math.max(0, expiresAt.getTime() - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

  return (
    <Dialog open={isOpen} onOpenChange={() => !isProcessing && onClose()}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Love Grant Received
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <User className="w-4 h-4" />
              <span className="font-medium">{grant.winner_name} {grant.winner_symbol}</span>
              <span className="text-muted-foreground">asks:</span>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-lg font-medium">{grant.request_text}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Expires in {hoursLeft} hours</span>
          </div>

          {showDeclineReason && (
            <div className="space-y-2">
              <h4 className="font-medium">Why are you declining? (optional)</h4>
              <Textarea
                placeholder="I can't this weekend, but I could do Sunday morning..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleDecline}
              disabled={isProcessing}
              className="flex-1"
            >
              {showDeclineReason ? 'Send Decline' : 'Decline'}
            </Button>
            <Button 
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : 'Accept'}
            </Button>
          </div>
          
          {showDeclineReason && (
            <Button
              variant="ghost"
              onClick={() => setShowDeclineReason(false)}
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};