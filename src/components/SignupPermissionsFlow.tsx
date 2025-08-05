import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check } from "lucide-react";

interface SignupPermissionsFlowProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const SignupPermissionsFlow = ({ isOpen, onComplete }: SignupPermissionsFlowProps) => {
  useEffect(() => {
    if (isOpen) {
      // Complete immediately without permission flow
      localStorage.setItem('permissions_flow_completed', 'true');
      onComplete();
    }
  }, [isOpen, onComplete]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Setting up your account...
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-center py-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-primary" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};