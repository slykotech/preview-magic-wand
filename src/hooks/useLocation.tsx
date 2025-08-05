import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  displayName: string;
  radius?: number;
  accuracy?: number;
}

export const useLocation = () => {
  const { toast } = useToast();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);

  // Auto-detect location on hook initialization if no location is set
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        // Check if saved location is recent (within 24 hours)
        const savedTime = new Date(parsed.timestamp || 0);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          setLocation(parsed.location);
          setLastLocationUpdate(savedTime);
          return;
        }
      } catch (error) {
        console.log('Failed to parse saved location:', error);
      }
    }
    
    // Auto-detect location if none saved or expired
    autoDetectLocation();
  }, []);

  const autoDetectLocation = useCallback(async () => {
    if (isGettingLocation || location) return;
    
    console.log('Starting auto location detection...');
    
    // First try browser geolocation
    if (navigator.geolocation) {
      setIsGettingLocation(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Auto geolocation success:', position.coords);
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: 'Current Location',
            displayName: 'Your Current Location',
            radius: 100, // 100km default radius
            accuracy: position.coords.accuracy
          };
          
          setLocation(locationData);
          setLastLocationUpdate(new Date());
          saveLocationToStorage(locationData);
          setIsGettingLocation(false);
          
          // Reverse geocode to get city name
          reverseGeocode(position.coords.latitude, position.coords.longitude);
        },
        async (error) => {
          console.log('Auto geolocation failed:', error);
          setIsGettingLocation(false);
          
          // Fallback to IP-based location
          await tryIPBasedLocation();
        },
        {
          enableHighAccuracy: false, // Faster for auto-detection
          timeout: 5000,
          maximumAge: 600000 // 10 minutes
        }
      );
    } else {
      // Browser doesn't support geolocation, try IP-based
      await tryIPBasedLocation();
    }
  }, [isGettingLocation, location]);

  const tryIPBasedLocation = useCallback(async () => {
    console.log('Trying IP-based location detection...');
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        if (data.latitude && data.longitude) {
          const locationData: LocationData = {
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city || 'Unknown City',
            displayName: `${data.city || 'Unknown'}, ${data.region || ''} ${data.country_name || ''}`.trim(),
            radius: 100,
            accuracy: 10000 // Lower accuracy for IP-based
          };
          
          console.log('IP-based location detected:', locationData);
          setLocation(locationData);
          setLastLocationUpdate(new Date());
          saveLocationToStorage(locationData);
          
          toast({
            title: "Location detected! 📍",
            description: `Found events near ${locationData.city}`,
          });
        }
      }
    } catch (error) {
      console.error('IP-based location failed:', error);
    }
  }, [toast]);

  const saveLocationToStorage = (locationData: LocationData) => {
    try {
      localStorage.setItem('userLocation', JSON.stringify({
        location: locationData,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to save location to storage:', error);
    }
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown City';
        const state = data.address?.state || data.address?.region || '';
        const country = data.address?.country || '';
        
        const displayName = `${city}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`;
        
        setLocation(prev => prev ? {
          ...prev,
          city,
          displayName
        } : null);
        
        console.log('Reverse geocoding successful:', { city, displayName });
      }
    } catch (error) {
      console.log('Reverse geocoding failed:', error);
    }
  }, []);

  const getCurrentLocation = useCallback(() => {
    console.log('getCurrentLocation called, checking geolocation support...');
    
    if (!navigator.geolocation) {
      console.log('Geolocation not supported by this browser');
      toast({
        title: "Geolocation not supported",
        description: "Please enter your location manually",
        variant: "destructive"
      });
      return;
    }

    console.log('Starting manual geolocation request...');
    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Manual geolocation success:', position.coords);
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          city: 'Current Location',
          displayName: 'Your Current Location',
          radius: 100,
          accuracy: position.coords.accuracy
        };
        
        console.log('Setting location data:', locationData);
        setLocation(locationData);
        setLastLocationUpdate(new Date());
        saveLocationToStorage(locationData);
        setIsGettingLocation(false);
        
        toast({
          title: "Location obtained! 📍",
          description: "Searching for events near you...",
        });
        
        // Get proper city name
        reverseGeocode(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Manual geolocation error:', error);
        setIsGettingLocation(false);
        
        let errorMessage = "Please enable location access or enter manually";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location access denied. Please enable in browser settings";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location information unavailable. Trying alternative method...";
          // Try IP-based as fallback
          tryIPBasedLocation();
          return;
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out. Trying alternative method...";
          // Try IP-based as fallback
          tryIPBasedLocation();
          return;
        }
        
        toast({
          title: "Location access failed",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [toast, reverseGeocode, tryIPBasedLocation]);

  const setManualLocation = useCallback(async (cityName: string) => {
    if (!cityName.trim()) {
      toast({
        title: "Invalid location",
        description: "Please enter a valid city or location name",
        variant: "destructive"
      });
      return;
    }

    console.log('Setting manual location:', cityName.trim());
    setIsGettingLocation(true);
    
    try {
      console.log('Starting geocoding for:', cityName);
      // Enhanced geocoding with multiple attempts
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=3&addressdetails=1`
      );
      
      if (geocodeResponse.ok) {
        const results = await geocodeResponse.json();
        console.log('Geocoding results:', results);
        
        if (results && results.length > 0) {
          const result = results[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const city = result.address?.city || result.address?.town || result.address?.village || cityName.trim();
            const state = result.address?.state || result.address?.region || '';
            const country = result.address?.country || '';
            
            const displayName = `${city}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`;
            
            const locationData: LocationData = {
              latitude: lat,
              longitude: lng,
              city,
              displayName,
              radius: 100,
              accuracy: 1000 // Manual geocoding accuracy
            };
            
            console.log('Setting geocoded location:', locationData);
            setLocation(locationData);
            setLastLocationUpdate(new Date());
            saveLocationToStorage(locationData);
            
            toast({
              title: "Location set! 📍",
              description: `Found events near ${city}`,
            });
            
            setIsGettingLocation(false);
            return;
          }
        }
      }
      
      // Fallback to coordinates database
      const fallbackCoordinates = getFallbackCoordinates(cityName);
      if (fallbackCoordinates) {
        console.log('Using fallback coordinates:', fallbackCoordinates);
        const locationData: LocationData = {
          latitude: fallbackCoordinates.lat,
          longitude: fallbackCoordinates.lng,
          city: cityName.trim(),
          displayName: cityName.trim(),
          radius: 100,
          accuracy: 5000
        };
        
        setLocation(locationData);
        setLastLocationUpdate(new Date());
        saveLocationToStorage(locationData);
        
        toast({
          title: "Location set! 📍",
          description: `Using ${cityName} coordinates`,
        });
      } else {
        throw new Error('Location not found');
      }
    } catch (error) {
      console.log('Manual location setting failed:', error);
      toast({
        title: "Location not found",
        description: "Please try a different city name or use current location",
        variant: "destructive"
      });
    } finally {
      setIsGettingLocation(false);
    }
  }, [toast, saveLocationToStorage]);

  // Enhanced fallback coordinates for major cities worldwide
  const getFallbackCoordinates = (cityName: string) => {
    const coordinates: { [key: string]: { lat: number; lng: number } } = {
      // Indian cities
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
      'vadodara': { lat: 22.3072, lng: 73.1812 },
      // International cities
      'new york': { lat: 40.7128, lng: -74.0060 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'paris': { lat: 48.8566, lng: 2.3522 },
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'sydney': { lat: -33.8688, lng: 151.2093 },
      'toronto': { lat: 43.6532, lng: -79.3832 },
      'berlin': { lat: 52.5200, lng: 13.4050 },
      'singapore': { lat: 1.3521, lng: 103.8198 },
      'dubai': { lat: 25.2048, lng: 55.2708 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'miami': { lat: 25.7617, lng: -80.1918 },
      'vancouver': { lat: 49.2827, lng: -123.1207 },
      'amsterdam': { lat: 52.3676, lng: 4.9041 },
      'barcelona': { lat: 41.3851, lng: 2.1734 },
      'rome': { lat: 41.9028, lng: 12.4964 },
      'moscow': { lat: 55.7558, lng: 37.6176 },
      'beijing': { lat: 39.9042, lng: 116.4074 },
      'shanghai': { lat: 31.2304, lng: 121.4737 }
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
    updateLocationCoordinates,
    autoDetectLocation,
    lastLocationUpdate
  };
};