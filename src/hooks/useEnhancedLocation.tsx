import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface EnhancedLocationData {
  latitude: number;
  longitude: number;
  city: string;
  state?: string;
  country?: string;
  displayName: string;
  searchRadius?: number;
}

export const useEnhancedLocation = () => {
  const { toast } = useToast();
  const [location, setLocation] = useState<EnhancedLocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive"
      });
      return;
    }

    setIsGettingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Enhanced reverse geocoding to get city, state, country
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        
        if (response.ok) {
          const data = await response.json();
          const enhancedLocation: EnhancedLocationData = {
            latitude,
            longitude,
            city: data.city || data.locality || 'Unknown City',
            state: data.principalSubdivision || data.region || '',
            country: data.countryName || 'Unknown Country',
            displayName: `${data.city || data.locality}, ${data.principalSubdivision || data.region}`,
            searchRadius: 25
          };
          
          setLocation(enhancedLocation);
          
          toast({
            title: "Location found! 📍",
            description: `Using ${enhancedLocation.displayName}`,
          });
        } else {
          throw new Error('Geocoding failed');
        }
      } catch (geocodeError) {
        // Fallback with basic coordinates
        const basicLocation: EnhancedLocationData = {
          latitude,
          longitude,
          city: 'Your Location',
          displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          searchRadius: 25
        };
        
        setLocation(basicLocation);
        
        toast({
          title: "Location found! 📍",
          description: "Using your current coordinates",
        });
      }
      
    } catch (error) {
      console.error('Geolocation error:', error);
      toast({
        title: "Location access denied",
        description: "Please enable location access or search for a city manually",
        variant: "destructive"
      });
    } finally {
      setIsGettingLocation(false);
    }
  }, [toast]);

  const setManualLocation = useCallback(async (cityName: string, country?: string) => {
    if (!cityName.trim()) return;

    setIsGettingLocation(true);
    
    try {
      // Enhanced geocoding with country support
      const searchQuery = country ? `${cityName}, ${country}` : cityName;
      const response = await fetch(
        `https://api.bigdatacloud.net/data/forward-geocode-client?query=${encodeURIComponent(searchQuery)}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const enhancedLocation: EnhancedLocationData = {
            latitude: result.latitude,
            longitude: result.longitude,
            city: result.city || result.locality || cityName,
            state: result.adminArea1 || result.region || '',
            country: result.countryName || country || '',
            displayName: `${result.city || result.locality}, ${result.adminArea1 || result.region}`,
            searchRadius: 50
          };
          
          setLocation(enhancedLocation);
          
          toast({
            title: "Location set! 📍",
            description: `Using ${enhancedLocation.displayName}`,
          });
        } else {
          // Fallback with basic data
          const fallbackLocation: EnhancedLocationData = {
            latitude: 0,
            longitude: 0,
            city: cityName,
            country: country || '',
            displayName: country ? `${cityName}, ${country}` : cityName,
            searchRadius: 100
          };
          
          setLocation(fallbackLocation);
          
          toast({
            title: "Location set! 📍", 
            description: `Using ${fallbackLocation.displayName} (manual search)`,
          });
        }
      } else {
        throw new Error('Geocoding service unavailable');
      }
    } catch (error) {
      console.error('Manual location error:', error);
      
      // Fallback location
      const fallbackLocation: EnhancedLocationData = {
        latitude: 0,
        longitude: 0,
        city: cityName,
        country: country || '',
        displayName: country ? `${cityName}, ${country}` : cityName,
        searchRadius: 100
      };
      
      setLocation(fallbackLocation);
      
      toast({
        title: "Location set! 📍",
        description: `Using ${fallbackLocation.displayName} (manual)`,
      });
    } finally {
      setIsGettingLocation(false);
    }
  }, [toast]);

  const clearLocation = useCallback(() => {
    setLocation(null);
  }, []);

  const updateLocationCoordinates = useCallback((lat: number, lng: number, resolvedName?: string, state?: string, country?: string) => {
    if (location) {
      setLocation({
        ...location,
        latitude: lat,
        longitude: lng,
        displayName: resolvedName || location.displayName,
        state: state || location.state,
        country: country || location.country
      });
    }
  }, [location]);

  const searchNearbyEvents = useCallback((radius: number = 25) => {
    if (location) {
      setLocation({
        ...location,
        searchRadius: radius
      });
    }
  }, [location]);

  return {
    location,
    isGettingLocation,
    getCurrentLocation,
    setManualLocation,
    clearLocation,
    updateLocationCoordinates,
    searchNearbyEvents
  };
};