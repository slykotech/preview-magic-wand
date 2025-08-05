import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  displayName: string;
}

export const useLocation = () => {
  const { toast } = useToast();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Please enter your location manually",
        variant: "destructive"
      });
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          city: 'Current Location',
          displayName: 'Your Current Location'
        };
        
        setLocation(locationData);
        setIsGettingLocation(false);
        
        toast({
          title: "Location obtained! 📍",
          description: "Searching for events near you...",
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsGettingLocation(false);
        
        let errorMessage = "Please enable location access or enter manually";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location access denied. Please enable in browser settings";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location information unavailable";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out";
        }
        
        toast({
          title: "Location access failed",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [toast]);

  const setManualLocation = useCallback((cityName: string) => {
    if (!cityName.trim()) {
      toast({
        title: "Invalid location",
        description: "Please enter a valid city or location name",
        variant: "destructive"
      });
      return;
    }

    const locationData: LocationData = {
      latitude: 0, // Will be geocoded by backend
      longitude: 0, // Will be geocoded by backend
      city: cityName.trim(),
      displayName: cityName.trim()
    };

    setLocation(locationData);
    
    toast({
      title: "Location set! 📍",
      description: `Looking for events near ${cityName}`,
    });
  }, [toast]);

  const clearLocation = useCallback(() => {
    setLocation(null);
  }, []);

  const updateLocationCoordinates = useCallback((lat: number, lng: number, resolvedName?: string) => {
    setLocation(prev => prev ? {
      ...prev,
      latitude: lat,
      longitude: lng,
      displayName: resolvedName || prev.displayName
    } : null);
  }, []);

  return {
    location,
    isGettingLocation,
    getCurrentLocation,
    setManualLocation,
    clearLocation,
    updateLocationCoordinates
  };
};