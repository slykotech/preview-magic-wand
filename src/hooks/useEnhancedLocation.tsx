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
      // Try multiple geocoding services for better reliability
      const searchQuery = country ? `${cityName}, ${country}` : cityName;
      let enhancedLocation: EnhancedLocationData | null = null;
      
      // First try: OpenStreetMap Nominatim (free and reliable)
      try {
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
        );
        
        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          
          if (nominatimData && nominatimData.length > 0) {
            const result = nominatimData[0];
            const address = result.address || {};
            
            enhancedLocation = {
              latitude: parseFloat(result.lat),
              longitude: parseFloat(result.lon),
              city: address.city || address.town || address.village || address.municipality || cityName,
              state: address.state || address.region || '',
              country: address.country || country || '',
              displayName: result.display_name,
              searchRadius: 50
            };
          }
        }
      } catch (nominatimError) {
        console.log('Nominatim geocoding failed, trying fallback:', nominatimError);
      }
      
      // Fallback: BigDataCloud
      if (!enhancedLocation) {
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/forward-geocode-client?query=${encodeURIComponent(searchQuery)}&localityLanguage=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              const result = data.results[0];
              enhancedLocation = {
                latitude: result.latitude,
                longitude: result.longitude,
                city: result.city || result.locality || cityName,
                state: result.adminArea1 || result.region || '',
                country: result.countryName || country || '',
                displayName: `${result.city || result.locality}, ${result.adminArea1 || result.region}`,
                searchRadius: 50
              };
            }
          }
        } catch (bigDataError) {
          console.log('BigDataCloud geocoding failed:', bigDataError);
        }
      }
      
      if (enhancedLocation) {
        setLocation(enhancedLocation);
        
        toast({
          title: "Location set! 📍",
          description: `Using ${enhancedLocation.displayName}`,
        });
      } else {
        // No results found from any service
        toast({
          title: "Location not found",
          description: "Could not find this location. Please try a more specific city name.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Manual location error:', error);
      
      // Show error and don't set location with invalid coordinates
      toast({
        title: "Location error",
        description: "Could not find coordinates for this location. Please try a different city name.",
        variant: "destructive"
      });
      return;
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