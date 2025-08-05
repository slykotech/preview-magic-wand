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

  const fetchEvents = useCallback(async (forceRefresh = false, radius = 100) => {
    console.log('fetchEvents called with location:', location, 'forceRefresh:', forceRefresh, 'radius:', radius);
    
    if (!location?.latitude || !location?.longitude) {
      console.log('No location available, cannot fetch events');
      // Don't show error toast for auto-fetch attempts, only for manual refresh
      if (forceRefresh) {
        toast({
          title: "Location needed",
          description: "Please set your location to discover events nearby",
          variant: "destructive"
        });
      }
      return;
    }

    // Don't fetch if we already have recent data (unless forced)
    if (!forceRefresh && lastFetched && Date.now() - lastFetched.getTime() < 5 * 60 * 1000) {
      console.log('Skipping fetch - recent data available');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Fetching events for location: ${location.displayName} (${location.latitude}, ${location.longitude}) within ${radius}km`);

      const { data, error } = await supabase.functions.invoke('fetch-events', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: radius // Use provided radius
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Fetch events response:', data);
      const fetchedEvents = data?.events || [];
      setEvents(fetchedEvents);
      setLastFetched(new Date());

      // Show appropriate success message
      if (forceRefresh) {
        toast({
          title: "Events refreshed! 🎉",
          description: `Found ${fetchedEvents.length} events within ${radius}km of ${location.displayName}`,
        });
      } else if (fetchedEvents.length > 0) {
        toast({
          title: "Events loaded 📍",
          description: `Found ${fetchedEvents.length} events in your area`,
        });
      }

    } catch (error) {
      console.error('Error fetching events:', error);
      
      // More specific error handling
      const errorMessage = error.message || 'Unknown error occurred';
      console.error('Detailed error:', errorMessage);
      
      toast({
        title: "Could not fetch events",
        description: `Error: ${errorMessage}. Trying cached events...`,
        variant: "destructive"
      });

      // Fallback to cached events from database with location filtering
      try {
        console.log('Attempting to load cached events from database...');
        const { data: cachedEvents, error: cacheError } = await supabase
          .from('events')
          .select('*')
          .gte('event_date', new Date().toISOString().split('T')[0])
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('event_date', { ascending: true })
          .limit(100);

        if (cacheError) {
          console.error('Cache error:', cacheError);
          throw cacheError;
        }

        // Filter cached events by distance
        const filteredCachedEvents = (cachedEvents || []).filter(event => {
          if (!event.latitude || !event.longitude) return false;
          
          // Calculate distance using Haversine formula
          const R = 6371; // Earth's radius in kilometers
          const dLat = (event.latitude - location.latitude) * Math.PI / 180;
          const dLng = (event.longitude - location.longitude) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(location.latitude * Math.PI / 180) * Math.cos(event.latitude * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          return distance <= radius;
        });

        console.log(`Loaded ${filteredCachedEvents.length} cached events within ${radius}km`);
        setEvents(filteredCachedEvents);
        
        if (filteredCachedEvents.length > 0) {
          toast({
            title: "Cached events loaded",
            description: `Found ${filteredCachedEvents.length} cached events in your area`,
          });
        }
      } catch (cacheError) {
        console.error('Failed to load cached events:', cacheError);
        toast({
          title: "No events available",
          description: "Unable to load events. Please check your connection and try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [location, toast, lastFetched]);

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

  // Auto-fetch when location changes or component mounts
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      // Only fetch if we don't have recent data or location changed significantly
      const shouldFetch = !lastFetched || 
                         Date.now() - lastFetched.getTime() > 15 * 60 * 1000; // 15 minutes
      
      if (shouldFetch) {
        fetchEvents();
      }
    }
    // Reset events when location is cleared
    else if (location === null) {
      setEvents([]);
    }
  }, [location?.latitude, location?.longitude, location, fetchEvents]);

  // Auto-refresh every 30 minutes if user is active and has location
  useEffect(() => {
    if (!location?.latitude || !location?.longitude) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && lastFetched) {
        fetchEvents();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [location?.latitude, location?.longitude, lastFetched, fetchEvents]);

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