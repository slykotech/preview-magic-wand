import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, MapPin, Camera, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PermissionBannerProps {
  type: 'location' | 'camera' | 'mediaLibrary';
  message: string;
  onDismiss?: () => void;
}

export const PermissionBanner = ({ type, message, onDismiss }: PermissionBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  const getIcon = () => {
    switch (type) {
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'camera':
        return <Camera className="h-4 w-4" />;
      case 'mediaLibrary':
        return <Image className="h-4 w-4" />;
    }
  };

  const requestPermission = async () => {
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
        case 'camera':
        case 'mediaLibrary':
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
        // Update localStorage
        const savedPermissions = localStorage.getItem('app_permissions');
        const permissions = savedPermissions ? JSON.parse(savedPermissions) : {};
        permissions[type] = true;
        localStorage.setItem('app_permissions', JSON.stringify(permissions));
        
        toast({
          title: "Permission granted ✅",
          description: `${type} access has been enabled`
        });
        setIsVisible(false);
        onDismiss?.();
      }
    } catch (error) {
      toast({
        title: "Permission denied",
        description: `Could not enable ${type} access. Please check your browser settings.`,
        variant: "destructive"
      });
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <Alert className="mb-4 border-warning bg-warning/10">
      <div className="flex items-center gap-2">
        {getIcon()}
        <AlertDescription className="flex-1">
          {message}
        </AlertDescription>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={requestPermission}
            className="h-8"
          >
            Enable Now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
};