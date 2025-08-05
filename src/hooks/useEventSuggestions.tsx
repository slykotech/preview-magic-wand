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
    if (!location?.latitude || !location?.longitude) {
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
      return;
    }

    setIsLoading(true);
    try {
      console.log('Fetching events for location:', location);

      const { data, error } = await supabase.functions.invoke('fetch-events', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 25 // 25km radius
        }
      });

      if (error) {
        throw error;
      }

      const fetchedEvents = data?.events || [];
      setEvents(fetchedEvents);
      setLastFetched(new Date());

      if (data?.newEvents > 0) {
        toast({
          title: "Events updated! 🎉",
          description: `Found ${data.newEvents} new events near you`,
        });
      } else if (data?.cached) {
        toast({
          title: "Events loaded 📍",
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
        const { data: cachedEvents } = await supabase
          .from('events')
          .select('*')
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(20);

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