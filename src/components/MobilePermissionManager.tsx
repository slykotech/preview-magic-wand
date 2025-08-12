import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Camera, MapPin, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PermissionStatus {
  notifications: 'granted' | 'denied' | 'prompt' | 'unknown';
  location: 'granted' | 'denied' | 'prompt' | 'unknown';
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export const MobilePermissionManager = () => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    notifications: 'unknown',
    location: 'unknown',
    camera: 'unknown'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const checkPermissions = async () => {
    setIsLoading(true);
    
    try {
      const newPermissions: PermissionStatus = {
        notifications: 'unknown',
        location: 'unknown',
        camera: 'unknown'
      };

      // Check notification permissions (Firebase)
      if (Capacitor.isNativePlatform()) {
        try {
          const notifPerm = await FirebaseMessaging.checkPermissions();
          newPermissions.notifications = notifPerm.receive === 'granted' ? 'granted' : 'denied';
        } catch (error) {
          console.warn('Could not check notification permissions:', error);
        }
      }

      // Check location permissions
      if ('geolocation' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          newPermissions.location = result.state;
        } catch (error) {
          console.warn('Could not check location permissions:', error);
        }
      }

      // Check camera permissions
      if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          newPermissions.camera = result.state;
        } catch (error) {
          console.warn('Could not check camera permissions:', error);
        }
      }

      setPermissions(newPermissions);
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "Desktop App",
        description: "Notification permissions are handled automatically on web.",
      });
      return;
    }

    try {
      const result = await FirebaseMessaging.requestPermissions();
      
      if (result.receive === 'granted') {
        setPermissions(prev => ({ ...prev, notifications: 'granted' }));
        toast({
          title: "Notifications Enabled ✅",
          description: "You'll receive real-time updates from your partner.",
        });
      } else {
        setPermissions(prev => ({ ...prev, notifications: 'denied' }));
        toast({
          title: "Notifications Disabled",
          description: "You can enable them later in your device settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Permission Error",
        description: "Could not request notification permission.",
        variant: "destructive"
      });
    }
  };

  const requestLocationPermission = async () => {
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      setPermissions(prev => ({ ...prev, location: 'granted' }));
      toast({
        title: "Location Access Granted ✅",
        description: "We can now help you find nearby date ideas.",
      });
    } catch (error) {
      setPermissions(prev => ({ ...prev, location: 'denied' }));
      toast({
        title: "Location Access Denied",
        description: "You can enable it later in settings to find nearby places.",
        variant: "destructive"
      });
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      
      setPermissions(prev => ({ ...prev, camera: 'granted' }));
      toast({
        title: "Camera Access Granted ✅",
        description: "You can now take photos and videos to share.",
      });
    } catch (error) {
      setPermissions(prev => ({ ...prev, camera: 'denied' }));
      toast({
        title: "Camera Access Denied",
        description: "You can enable it later to share photos and videos.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'granted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'denied':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'granted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  if (!Capacitor.isNativePlatform()) {
    return null; // Don't show on web
  }

  return (
    <Card className="mx-4 my-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          App Permissions
        </CardTitle>
        <CardDescription>
          Manage permissions to enhance your LoveSync experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notifications */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">Get real-time updates from your partner</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(permissions.notifications)}
            {getStatusBadge(permissions.notifications)}
            {permissions.notifications !== 'granted' && (
              <Button size="sm" onClick={requestNotificationPermission}>
                Enable
              </Button>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Location Access</p>
              <p className="text-sm text-muted-foreground">Find nearby date ideas and places</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(permissions.location)}
            {getStatusBadge(permissions.location)}
            {permissions.location !== 'granted' && (
              <Button size="sm" onClick={requestLocationPermission}>
                Enable
              </Button>
            )}
          </div>
        </div>

        {/* Camera */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Camera Access</p>
              <p className="text-sm text-muted-foreground">Take photos and videos to share</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(permissions.camera)}
            {getStatusBadge(permissions.camera)}
            {permissions.camera !== 'granted' && (
              <Button size="sm" onClick={requestCameraPermission}>
                Enable
              </Button>
            )}
          </div>
        </div>

        <Button 
          onClick={checkPermissions} 
          disabled={isLoading}
          variant="outline" 
          className="w-full"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
};