import { useState, useEffect } from 'react';

interface PermissionSettings {
  location: boolean;
  mediaLibrary: boolean;
  camera: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionSettings>({
    location: false,
    mediaLibrary: false,
    camera: false
  });

  const [showPermissionsFlow, setShowPermissionsFlow] = useState(false);

  useEffect(() => {
    loadPermissions();
    checkIfFirstLaunch();
    autoRequestLocationIfNeeded();
  }, []);

  const autoRequestLocationIfNeeded = async () => {
    const hasRequestedLocation = localStorage.getItem('location_auto_requested');
    if (!hasRequestedLocation && !permissions.location) {
      try {
        await requestPermission('location');
        localStorage.setItem('location_auto_requested', 'true');
      } catch (error) {
        console.log('Auto location request failed:', error);
      }
    }
  };

  const loadPermissions = () => {
    const savedPermissions = localStorage.getItem('app_permissions');
    if (savedPermissions) {
      setPermissions(JSON.parse(savedPermissions));
    }
  };

  const checkIfFirstLaunch = () => {
    const hasCompletedFlow = localStorage.getItem('permissions_flow_completed');
    if (!hasCompletedFlow) {
      setShowPermissionsFlow(true);
    }
  };

  const checkPermission = (type: keyof PermissionSettings): boolean => {
    return permissions[type];
  };

  const requestPermission = async (type: keyof PermissionSettings): Promise<boolean> => {
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
        const newPermissions = { ...permissions, [type]: true };
        setPermissions(newPermissions);
        localStorage.setItem('app_permissions', JSON.stringify(newPermissions));
      }

      return granted;
    } catch (error) {
      return false;
    }
  };

  const getPermissionWarning = (type: keyof PermissionSettings): string => {
    switch (type) {
      case 'location':
        return 'Please enable Location access to fetch nearby events and date suggestions.';
      case 'mediaLibrary':
        return 'Please re-enable Media Library access to upload photos from your gallery.';
      case 'camera':
        return 'Please re-enable Camera access to capture new photos for stories and memories.';
      default:
        return 'Permission required for this feature.';
    }
  };

  return {
    permissions,
    checkPermission,
    requestPermission,
    getPermissionWarning,
    showPermissionsFlow,
    setShowPermissionsFlow
  };
};