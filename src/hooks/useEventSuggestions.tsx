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
    if (!forceRefresh && lastFetched && Date.now() - lastFetched.getTime() < 5 * 60 * 1000) {
      console.log('Skipping fetch - recent data available');
      return;
    }

    setIsLoading(true);
    try {
      console.log('About to invoke fetch-events function with:', {
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 25
      });

      const { data, error } = await supabase.functions.invoke('fetch-events', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 25 // 25km radius
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

      if (forceRefresh && fetchedEvents.length > 0) {
        toast({
          title: "Events loaded! 📍",
          description: `Found ${fetchedEvents.length} events in your area`,
        });
      }

    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Could not fetch events",
        description: "We'll try to load cached events instead",
        variant: "destructive"
      });

      // Fallback to cached events from database
      try {
        console.log('Attempting fallback to cached events...');
        const { data: cachedEvents } = await supabase
          .from('events')
          .select('*')
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(20);

        console.log('Cached events:', cachedEvents?.length || 0);
        setEvents(cachedEvents || []);
      } catch (cacheError) {
        console.error('Failed to load cached events:', cacheError);
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

  // Auto-fetch events when location changes and has valid coordinates
  useEffect(() => {
    if (location && location.latitude && location.longitude && location.latitude !== 0 && location.longitude !== 0) {
      console.log('Location changed with valid coordinates, fetching events');
      fetchEvents();
    }
  }, [location?.latitude, location?.longitude, fetchEvents]);

  // Reset events when location is cleared
  useEffect(() => {
    if (!location) {
      setEvents([]);
      setLastFetched(null);
    }
  }, [location]);

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