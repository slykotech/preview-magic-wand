import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Star, Send, MessageSquare, Bug, Lightbulb, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'rating' | 'feedback';
}

export const FeedbackModal = ({ isOpen, onClose, initialType = 'feedback' }: FeedbackModalProps) => {
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState<'rating' | 'general' | 'bug_report' | 'feature_request'>(
    initialType === 'rating' ? 'rating' : 'general'
  );
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (feedbackType === 'rating' && rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting",
        variant: "destructive"
      });
      return;
    }

    if (feedbackType !== 'rating' && !message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter your feedback message",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-feedback-email', {
        body: {
          feedback_type: feedbackType,
          rating: feedbackType === 'rating' ? rating : undefined,
          message: message.trim() || undefined
        }
      });

      if (error) throw error;

      toast({
        title: "Feedback Sent! 💕",
        description: "Thank you for your feedback. We'll review it soon!",
      });

      // Reset form
      setRating(0);
      setMessage("");
      setFeedbackType(initialType === 'rating' ? 'rating' : 'general');
      onClose();
    } catch (error) {
      console.error('Error sending feedback:', error);
      toast({
        title: "Error",
        description: "Failed to send feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setMessage("");
    setFeedbackType(initialType === 'rating' ? 'rating' : 'general');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="text-primary" size={20} />
            {initialType === 'rating' ? 'Rate LoveStory' : 'Send Feedback'}
          </DialogTitle>
          <DialogDescription>
            {initialType === 'rating' 
              ? 'How would you rate your experience with LoveStory?'
              : 'Help us improve LoveStory with your feedback'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {initialType !== 'rating' && (
            <div>
              <Label className="text-sm font-medium">Feedback Type</Label>
              <RadioGroup 
                value={feedbackType} 
                onValueChange={(value) => setFeedbackType(value as any)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="general" id="general" />
                  <Label htmlFor="general" className="flex items-center gap-2 cursor-pointer">
                    <MessageSquare size={16} />
                    General Feedback
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bug_report" id="bug_report" />
                  <Label htmlFor="bug_report" className="flex items-center gap-2 cursor-pointer">
                    <Bug size={16} />
                    Bug Report
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="feature_request" id="feature_request" />
                  <Label htmlFor="feature_request" className="flex items-center gap-2 cursor-pointer">
                    <Lightbulb size={16} />
                    Feature Request
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rating" id="rating" />
                  <Label htmlFor="rating" className="flex items-center gap-2 cursor-pointer">
                    <Star size={16} />
                    Rating & Review
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {feedbackType === 'rating' && (
            <div>
              <Label className="text-sm font-medium">Your Rating</Label>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1"
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      size={32}
                      className={`transition-colors ${
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {rating === 1 && "We're sorry to hear that. Please tell us how we can improve."}
                  {rating === 2 && "We'd love to know how we can do better."}
                  {rating === 3 && "Thanks for the feedback! How can we make it better?"}
                  {rating === 4 && "Great! What would make it a 5-star experience?"}
                  {rating === 5 && "Wonderful! We're so happy you love LoveStory! ❤️"}
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="message" className="text-sm font-medium">
              {feedbackType === 'rating' ? 'Additional Comments (Optional)' : 'Your Message'}
            </Label>
            <Textarea
              id="message"
              placeholder={
                feedbackType === 'bug_report' 
                  ? "Please describe the bug you encountered..."
                  : feedbackType === 'feature_request'
                  ? "What feature would you like to see added?"
                  : feedbackType === 'rating'
                  ? "Tell us more about your experience..."
                  : "Share your thoughts with us..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 min-h-[100px]"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/1000 characters
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-primary hover:opacity-90 text-white"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Send size={16} className="mr-2" />
              )}
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};