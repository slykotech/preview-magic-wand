import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/hooks/useLocation';

export interface EventSuggestion {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location_name: string;
  location_address: string;
  latitude: number;
  longitude: number;
  category: string;
  price_range: string;
  organizer: string;
  source_url: string;
  source_platform: string;
  image_url: string | null;
  tags: string[];
}

export const useEventSuggestions = () => {
  const { toast } = useToast();
  const { location } = useLocation();
  const [events, setEvents] = useState<EventSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchEvents = useCallback(async (forceRefresh = false) => {
    console.log('fetchEvents called with location:', location, 'forceRefresh:', forceRefresh);
    
    if (!location) {
      console.log('No location available, cannot fetch events');
      if (forceRefresh) {
        toast({
          title: "Location needed",
          description: "Please set your location to discover events nearby",
          variant: "destructive"
        });
      }
      return;
    }

    // Check if we have valid coordinates
    if (!location.latitude || !location.longitude || (location.latitude === 0 && location.longitude === 0)) {
      console.log('Invalid coordinates, waiting for geocoding to complete');
      // If we have a location but invalid coordinates, wait a bit for geocoding
      if (location.city && forceRefresh) {
        toast({
          title: "Getting location coordinates...",
          description: "Please wait while we find the exact location for your city",
        });
      }
      return;
    }

    // Don't fetch if we already have recent data (unless forced)
    if (!forceRefresh && lastFetched && Date.now() - lastFetched.getTime() < 3 * 60 * 1000) {
      console.log('Skipping fetch - recent data available');
      return;
    }

    setIsLoading(true);
    try {
      // Use location radius or default to 100km as requested
      const searchRadius = location.radius || 100;
      
      console.log('About to invoke fetch-events function with:', {
        latitude: location.latitude,
        longitude: location.longitude,
        radius: searchRadius
      });

      const { data, error } = await supabase.functions.invoke('fetch-events', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: searchRadius
        }
      });

      console.log('fetch-events response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      const fetchedEvents = data?.events || [];
      console.log('Events fetched:', fetchedEvents.length);
      
      setEvents(fetchedEvents);
      setLastFetched(new Date());

      if (forceRefresh) {
        if (fetchedEvents.length > 0) {
          toast({
            title: "Events loaded! 📍",
            description: `Found ${fetchedEvents.length} events within ${searchRadius}km`,
          });
        } else {
          toast({
            title: "No events found 🔍",
            description: `No events found within ${searchRadius}km. Try expanding your search area.`,
          });
        }
      }

    } catch (error) {
      console.error('Error fetching events:', error);
      
      // Enhanced fallback strategy
      try {
        console.log('Attempting enhanced fallback to cached events...');
        
        // Try to get events from broader area if specific location fails
        const { data: cachedEvents } = await supabase
          .from('events')
          .select('*')
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(50);

        let fallbackEvents = cachedEvents || [];
        
        // If we have location, try to sort by distance
        if (location.latitude && location.longitude && fallbackEvents.length > 0) {
          fallbackEvents = fallbackEvents
            .map(event => {
              const distance = event.latitude && event.longitude 
                ? calculateDistance(
                    location.latitude, location.longitude,
                    event.latitude, event.longitude
                  )
                : 999999;
              return { ...event, distance };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 20);
        }

        console.log('Fallback events:', fallbackEvents?.length || 0);
        setEvents(fallbackEvents);
        
        if (forceRefresh) {
          toast({
            title: "Showing cached events",
            description: `Found ${fallbackEvents.length} events from cache`,
          });
        }
      } catch (cacheError) {
        console.error('Failed to load cached events:', cacheError);
        if (forceRefresh) {
          toast({
            title: "Could not fetch events",
            description: "Please check your internet connection and try again",
            variant: "destructive"
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [location, toast, lastFetched]);

  // Helper function to calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getEventsByCategory = useCallback((category?: string) => {
    if (!category) return events;
    return events.filter(event => 
      event.category?.toLowerCase() === category.toLowerCase() ||
      event.tags?.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
    );
  }, [events]);

  const searchEvents = useCallback((query: string) => {
    if (!query.trim()) return events;
    
    const searchTerm = query.toLowerCase();
    return events.filter(event =>
      event.title.toLowerCase().includes(searchTerm) ||
      event.description.toLowerCase().includes(searchTerm) ||
      event.location_name.toLowerCase().includes(searchTerm) ||
      event.category.toLowerCase().includes(searchTerm)
    );
  }, [events]);

  // Track event interaction
  const trackEventInteraction = useCallback(async (eventId: string, interactionType: 'viewed' | 'saved' | 'shared' | 'planned') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_event_interactions')
        .insert({
          user_id: user.id,
          event_id: eventId,
          interaction_type: interactionType
        });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }, []);

  // Auto-fetch events when location changes and has valid coordinates
  useEffect(() => {
    const shouldFetch = location && 
                       location.latitude && 
                       location.longitude && 
                       location.latitude !== 0 && 
                       location.longitude !== 0;
    
    console.log('Location effect triggered:', { shouldFetch, location });
    
    if (shouldFetch) {
      console.log('Location changed with valid coordinates, fetching events');
      // Small delay to allow for any additional location updates
      const timer = setTimeout(() => {
        fetchEvents();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [location?.latitude, location?.longitude, location?.radius]); // Added radius to dependencies

  // Reset events when location is cleared
  useEffect(() => {
    if (!location) {
      console.log('Location cleared, resetting events');
      setEvents([]);
      setLastFetched(null);
    }
  }, [location]);

  // Auto-refresh every 30 minutes if user is active and has location
  useEffect(() => {
    if (!location?.latitude || !location?.longitude) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && lastFetched) {
        console.log('Auto-refreshing events...');
        fetchEvents();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [location?.latitude, location?.longitude, lastFetched]); // Removed fetchEvents from dependencies

  return {
    events,
    isLoading,
    fetchEvents,
    getEventsByCategory,
    searchEvents,
    trackEventInteraction,
    lastFetched
  };
};