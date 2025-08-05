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

    // First set the location with placeholder coordinates
    const locationData: LocationData = {
      latitude: 0, // Will be geocoded
      longitude: 0, // Will be geocoded  
      city: cityName.trim(),
      displayName: cityName.trim()
    };

    setLocation(locationData);
    
    toast({
      title: "Location set! 📍",
      description: `Looking for events near ${cityName}`,
    });

    // Try to geocode the location to get actual coordinates
    try {
      // Use a simple geocoding approach - you can enhance this with a proper geocoding service
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`
      );
      
      if (geocodeResponse.ok) {
        const results = await geocodeResponse.json();
        if (results && results.length > 0) {
          const result = results[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            // Update location with actual coordinates
            setLocation(prev => prev ? {
              ...prev,
              latitude: lat,
              longitude: lng,
              displayName: result.display_name || cityName.trim()
            } : null);
            
            console.log(`Geocoded ${cityName} to coordinates:`, lat, lng);
          }
        }
      }
    } catch (error) {
      console.log('Geocoding failed, using fallback coordinates:', error);
      // Use fallback coordinates for major Indian cities
      const fallbackCoordinates = getFallbackCoordinates(cityName);
      if (fallbackCoordinates) {
        setLocation(prev => prev ? {
          ...prev,
          latitude: fallbackCoordinates.lat,
          longitude: fallbackCoordinates.lng
        } : null);
      }
    }
  }, [toast]);

  // Fallback coordinates for major Indian cities
  const getFallbackCoordinates = (cityName: string) => {
    const coordinates: { [key: string]: { lat: number; lng: number } } = {
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'delhi': { lat: 28.7041, lng: 77.1025 },
      'bangalore': { lat: 12.9716, lng: 77.5946 },
      'bengaluru': { lat: 12.9716, lng: 77.5946 },
      'hyderabad': { lat: 17.3850, lng: 78.4867 },
      'chennai': { lat: 13.0827, lng: 80.2707 },
      'kolkata': { lat: 22.5726, lng: 88.3639 },
      'pune': { lat: 18.5204, lng: 73.8567 },
      'ahmedabad': { lat: 23.0225, lng: 72.5714 },
      'jaipur': { lat: 26.9124, lng: 75.7873 },
      'surat': { lat: 21.1702, lng: 72.8311 },
      'lucknow': { lat: 26.8467, lng: 80.9462 },
      'kanpur': { lat: 26.4499, lng: 80.3319 },
      'nagpur': { lat: 21.1458, lng: 79.0882 },
      'indore': { lat: 22.7196, lng: 75.8577 },
      'thane': { lat: 19.2183, lng: 72.9781 },
      'bhopal': { lat: 23.2599, lng: 77.4126 },
      'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
      'patna': { lat: 25.5941, lng: 85.1376 },
      'vadodara': { lat: 22.3072, lng: 73.1812 }
    };
    
    const searchKey = cityName.toLowerCase().split(',')[0].trim();
    return coordinates[searchKey] || null;
  };

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