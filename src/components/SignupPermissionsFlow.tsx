import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Camera, Image, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SignupPermissionsFlowProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const SignupPermissionsFlow = ({ isOpen, onComplete }: SignupPermissionsFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [permissions, setPermissions] = useState({
    location: false,
    mediaLibrary: false,
    camera: false
  });
  const { toast } = useToast();

  const permissionSteps = [
    {
      type: 'location' as const,
      title: 'Location Access',
      description: 'Enable location access to get personalized date suggestions near you.',
      icon: MapPin,
      detail: 'We use your location to suggest nearby restaurants, activities, and events for your date plans.'
    },
    {
      type: 'mediaLibrary' as const,
      title: 'Media Library Access',
      description: 'Access your photo library to upload memories and create stories.',
      icon: Image,
      detail: 'Upload photos from your gallery to create beautiful memories in your Memory Vault and share stories with your partner.'
    },
    {
      type: 'camera' as const,
      title: 'Camera Access',
      description: 'Use your camera to capture new moments and create stories.',
      icon: Camera,
      detail: 'Take new photos directly in the app to capture spontaneous moments and share them instantly with your partner.'
    }
  ];

  const requestPermission = async (type: 'location' | 'mediaLibrary' | 'camera') => {
    try {
      let granted = false;
      
      switch (type) {
        case 'location':
          if ('geolocation' in navigator) {
            await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            granted = true;
          }
          break;
        case 'mediaLibrary':
        case 'camera':
          if ('mediaDevices' in navigator) {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: type === 'camera', 
              audio: false 
            });
            granted = true;
            stream.getTracks().forEach(track => track.stop());
          }
          break;
      }

      if (granted) {
        setPermissions(prev => ({ ...prev, [type]: true }));
        toast({
          title: "Permission granted ✅",
          description: `${type} access has been enabled`
        });
      }
    } catch (error) {
      // Permission denied, but we'll continue
      toast({
        title: "Permission skipped",
        description: "You can enable this later in settings.",
        variant: "default"
      });
    }
  };

  const handleNext = () => {
    if (currentStep < permissionSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save permissions and complete
      localStorage.setItem('app_permissions', JSON.stringify(permissions));
      localStorage.setItem('permissions_flow_completed', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleEnable = async () => {
    await requestPermission(permissionSteps[currentStep].type);
    handleNext();
  };

  const currentPermission = permissionSteps[currentStep];
  const IconComponent = currentPermission.icon;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Enable App Permissions
          </DialogTitle>
        </DialogHeader>
        
        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <IconComponent className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-lg">{currentPermission.title}</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              {currentPermission.description}
            </p>
            
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {currentPermission.detail}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={handleEnable} className="w-full">
                <Check className="w-4 h-4 mr-2" />
                Enable {currentPermission.title}
              </Button>
              
              <Button variant="outline" onClick={handleSkip} className="w-full">
                <X className="w-4 h-4 mr-2" />
                Skip for now
              </Button>
            </div>

            <div className="flex justify-center gap-2 pt-4">
              {permissionSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-primary'
                      : index < currentStep
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};