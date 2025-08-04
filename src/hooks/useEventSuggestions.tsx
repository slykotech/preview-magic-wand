import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface EventSuggestion {
  id: string;
  title: string;
  description?: string;
  category?: string;
  venue?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  event_date?: string;
  event_time?: string;
  price?: string;
  image_url?: string;
  booking_url?: string;
  source: string;
  city?: string;
  country?: string;
  state?: string;
  distance_km?: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  displayName: string;
  searchRadius?: number;
}

export const useEventSuggestions = () => {
  const [events, setEvents] = useState<EventSuggestion[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();

  // Get user's current location
  const getCurrentLocation = async (): Promise<void> => {
    setIsGettingLocation(true);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocode to get address
      try {
        const response = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY&limit=1`
        );
        
        if (response.ok) {
          const data = await response.json();
          const result = data.results[0];
          
          if (result) {
            const locationData: LocationData = {
              latitude,
              longitude,
              city: result.components.city || result.components.town || result.components.village,
              state: result.components.state,
              country: result.components.country,
              displayName: result.formatted,
              searchRadius: 25
            };
            
            setLocation(locationData);
            
            // Cache user location
            await supabase.from('user_location_cache').upsert({
              user_id: (await supabase.auth.getUser()).data.user?.id,
              latitude,
              longitude,
              city: locationData.city,
              state: locationData.state,
              country: locationData.country,
              display_name: locationData.displayName,
              is_current: true,
              search_radius: 25
            });
            
            return;
          }
        }
      } catch (geocodeError) {
        console.warn('Geocoding failed, using coordinates only:', geocodeError);
      }
      
      // Fallback to coordinates only
      const locationData: LocationData = {
        latitude,
        longitude,
        displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        searchRadius: 25
      };
      
      setLocation(locationData);
      
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        title: "Location Access Denied",
        description: "Please allow location access or set your location manually to see nearby events.",
        variant: "destructive"
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Set manual location
  const setManualLocation = async (cityName: string, country?: string): Promise<void> => {
    setIsGettingLocation(true);
    
    try {
      // For demo purposes, set some default coordinates
      // In production, you'd geocode the city name
      const locationData: LocationData = {
        latitude: 40.7128, // Default to NYC coordinates
        longitude: -74.0060,
        city: cityName,
        country: country || 'Unknown',
        displayName: country ? `${cityName}, ${country}` : cityName,
        searchRadius: 25
      };
      
      setLocation(locationData);
      
      // Cache user location
      await supabase.from('user_location_cache').upsert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        city: locationData.city,
        country: locationData.country,
        display_name: locationData.displayName,
        is_current: false,
        search_radius: 25
      });
      
    } catch (error) {
      console.error('Error setting manual location:', error);
      toast({
        title: "Error",
        description: "Failed to set location. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Fetch events for current location
  const fetchEventsForLocation = async (locationData?: LocationData): Promise<void> => {
    const targetLocation = locationData || location;
    if (!targetLocation) return;
    
    setIsLoading(true);
    
    try {
      // Check cache first
      const locationKey = `${targetLocation.latitude},${targetLocation.longitude},${targetLocation.searchRadius || 25}`;
      
      const { data: cachedData } = await supabase
        .from('event_suggestions_cache')
        .select('*')
        .eq('location_key', locationKey)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (cachedData && cachedData.cached_events) {
        setEvents((cachedData.cached_events as any) as EventSuggestion[]);
        return;
      }
      
      // Fetch from database using the enhanced location function
      const { data: eventsData, error } = await supabase.rpc('get_events_by_location_enhanced', {
        user_lat: targetLocation.latitude,
        user_lng: targetLocation.longitude,
        radius_km: targetLocation.searchRadius || 25,
        max_events: 50
      });
      
      if (error) {
        throw error;
      }
      
      const formattedEvents: EventSuggestion[] = (eventsData || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category,
        venue: event.venue,
        location_name: event.location_name,
        location_lat: event.location_lat,
        location_lng: event.location_lng,
        event_date: event.event_date,
        event_time: event.event_time,
        price: event.price,
        image_url: event.image_url,
        booking_url: event.booking_url,
        source: event.source,
        city: event.city,
        country: event.country,
        state: event.state,
        distance_km: event.distance_km
      }));
      
      setEvents(formattedEvents);
      
      // Cache the results
      await supabase.from('event_suggestions_cache').upsert({
        location_key: locationKey,
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
        radius_km: targetLocation.searchRadius || 25,
        cached_events: formattedEvents as any,
        events_count: formattedEvents.length,
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
      });
      
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update search radius
  const updateSearchRadius = (radius: number) => {
    if (location) {
      const updatedLocation = { ...location, searchRadius: radius };
      setLocation(updatedLocation);
      fetchEventsForLocation(updatedLocation);
    }
  };

  // Load cached location on mount
  useEffect(() => {
    const loadCachedLocation = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;
        
        const { data: cachedLocation } = await supabase
          .from('user_location_cache')
          .select('*')
          .eq('user_id', user.user.id)
          .eq('is_current', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (cachedLocation) {
          const locationData: LocationData = {
            latitude: cachedLocation.latitude,
            longitude: cachedLocation.longitude,
            city: cachedLocation.city,
            state: cachedLocation.state,
            country: cachedLocation.country,
            displayName: cachedLocation.display_name,
            searchRadius: cachedLocation.search_radius
          };
          
          setLocation(locationData);
          fetchEventsForLocation(locationData);
        }
      } catch (error) {
        console.error('Error loading cached location:', error);
      }
    };
    
    loadCachedLocation();
  }, []);

  return {
    events,
    location,
    isLoading,
    isGettingLocation,
    getCurrentLocation,
    setManualLocation,
    fetchEventsForLocation,
    updateSearchRadius
  };
};