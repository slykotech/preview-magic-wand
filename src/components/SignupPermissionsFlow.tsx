import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "@/hooks/useLocation";

interface SignupPermissionsFlowProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const SignupPermissionsFlow = ({ isOpen, onComplete }: SignupPermissionsFlowProps) => {
  const { requestPermission } = usePermissions();
  const { getCurrentLocation } = useLocation();

  useEffect(() => {
    if (isOpen) {
      handleAutoLocationRequest();
    }
  }, [isOpen, onComplete]);

  const handleAutoLocationRequest = async () => {
    try {
      // Automatically request location permission and get current location
      const locationGranted = await requestPermission('location');
      if (locationGranted) {
        getCurrentLocation();
      }
    } catch (error) {
      console.log('Auto location request failed:', error);
    } finally {
      // Complete the flow regardless of permission result
      localStorage.setItem('permissions_flow_completed', 'true');
      onComplete();
    }
  };

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