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

  const setManualLocation = useCallback(async (cityName: string) => {
    if (!cityName.trim()) {
      toast({
        title: "Invalid location",
        description: "Please enter a valid city or location name",
        variant: "destructive"
      });
      return;
    }

    setIsGettingLocation(true);
    
    try {
      // Use OpenStreetMap Nominatim API for geocoding (free and no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName.trim())}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const results = await response.json();
      
      if (!results || results.length === 0) {
        throw new Error('Location not found');
      }
      
      const result = results[0];
      const latitude = parseFloat(result.lat);
      const longitude = parseFloat(result.lon);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates received');
      }

      const locationData: LocationData = {
        latitude,
        longitude,
        city: cityName.trim(),
        displayName: result.display_name || cityName.trim()
      };

      setLocation(locationData);
      
      toast({
        title: "Location set! 📍",
        description: `Found ${result.display_name || cityName}`,
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "Location not found",
        description: "Could not find the specified location. Please try a different city name.",
        variant: "destructive"
      });
    } finally {
      setIsGettingLocation(false);
    }
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