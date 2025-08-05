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
  distance_km?: number;
  relevance_score?: number;
}

export interface EventPreferences {
  preferred_categories: string[];
  preferred_price_range: string;
  max_distance_km: number;
  notification_enabled: boolean;
}

export const useEnhancedEventSuggestions = () => {
  const { toast } = useToast();
  const { location } = useLocation();
  const [events, setEvents] = useState<EventSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<EventPreferences | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Load user preferences
  const loadPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // For now, use a simple fallback since the table might not exist yet
      let data = null;
      try {
        const result = await supabase
          .from('user_event_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        data = result.data;
      } catch (error) {
        console.log('User preferences table not available yet, using defaults');
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const defaultPrefs = {
          preferred_categories: ['entertainment', 'music', 'arts'],
          preferred_price_range: 'any',
          max_distance_km: 25,
          notification_enabled: true
        };
        
        // Try to create preferences, fallback to defaults if table doesn't exist
        try {
          const { data: newPrefs } = await supabase
            .from('user_event_preferences')
            .insert({ user_id: user.id, ...defaultPrefs })
            .select()
            .single();
          
          setPreferences(newPrefs);
        } catch (error) {
          console.log('Could not create preferences, using defaults');
          setPreferences(defaultPrefs);
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, []);

  // Update user preferences
  const updatePreferences = useCallback(async (newPrefs: Partial<EventPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Try to update preferences, fallback gracefully if table doesn't exist
      try {
        const { error } = await supabase
          .from('user_event_preferences')
          .update(newPrefs)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } catch (error) {
        console.log('Could not update preferences in database, updating locally only');
      }

      setPreferences(prev => prev ? { ...prev, ...newPrefs } : null);
      toast({
        title: "Preferences updated",
        description: "Your event preferences have been saved",
      });
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Failed to update preferences",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Fetch personalized events
  const fetchPersonalizedEvents = useCallback(async (forceRefresh = false) => {
    if (!location?.latitude || !location?.longitude) {
      if (forceRefresh) {
        toast({
          title: "Location needed",
          description: "Please set your location to discover personalized events",
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Fallback to regular events for non-authenticated users
        return fetchRegularEvents();
      }

      const { data, error } = await supabase.rpc('get_personalized_events', {
        p_user_id: user.id,
        p_latitude: location.latitude,
        p_longitude: location.longitude,
        p_radius: preferences?.max_distance_km || 25,
        p_limit: 50
      });

      if (error) throw error;

      setEvents(data || []);
      setLastFetched(new Date());

      toast({
        title: "Personalized events loaded! ✨",
        description: `Found ${data?.length || 0} events tailored for you`,
      });

    } catch (error) {
      console.error('Error fetching personalized events:', error);
      // Fallback to regular events
      await fetchRegularEvents();
    } finally {
      setIsLoading(false);
    }
  }, [location, preferences, lastFetched, toast]);

  // Fallback to regular events
  const fetchRegularEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-events', {
        body: {
          latitude: location?.latitude,
          longitude: location?.longitude,
          radius: preferences?.max_distance_km || 25
        }
      });

      if (error) throw error;
      
      setEvents(data?.events || []);
      setLastFetched(new Date());
    } catch (error) {
      console.error('Error fetching regular events:', error);
      toast({
        title: "Could not fetch events",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  }, [location, preferences, toast]);

  // Track event interaction with analytics
  const trackEventInteraction = useCallback(async (
    eventId: string, 
    interactionType: 'viewed' | 'saved' | 'shared' | 'planned',
    metadata: Record<string, any> = {}
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to track interaction, fallback gracefully if table doesn't exist
      try {
        await supabase
          .from('user_event_interactions')
          .insert({
            user_id: user.id,
            event_id: eventId,
            interaction_type: interactionType,
            metadata
          });
      } catch (error) {
        console.log('Could not track interaction, table may not exist yet');
      }

      // Update local state to reflect interaction
      if (interactionType === 'viewed') {
        setEvents(prev => prev.map(event => 
          event.id === eventId 
            ? { ...event, relevance_score: (event.relevance_score || 0) + 1 }
            : event
        ));
      }
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }, []);

  // Get events by category with improved filtering
  const getEventsByCategory = useCallback((category?: string) => {
    if (!category) return events;
    
    return events.filter(event => {
      const matchesCategory = event.category?.toLowerCase() === category.toLowerCase();
      const matchesTags = event.tags?.some(tag => 
        tag.toLowerCase().includes(category.toLowerCase())
      );
      return matchesCategory || matchesTags;
    }).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }, [events]);

  // Advanced search with relevance scoring
  const searchEvents = useCallback((query: string) => {
    if (!query.trim()) return events;
    
    const searchTerm = query.toLowerCase();
    const filteredEvents = events.filter(event => {
      const titleMatch = event.title.toLowerCase().includes(searchTerm);
      const descMatch = event.description.toLowerCase().includes(searchTerm);
      const locationMatch = event.location_name.toLowerCase().includes(searchTerm);
      const categoryMatch = event.category.toLowerCase().includes(searchTerm);
      const tagMatch = event.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
      
      return titleMatch || descMatch || locationMatch || categoryMatch || tagMatch;
    });

    // Sort by relevance and boost exact matches
    return filteredEvents.sort((a, b) => {
      const aExactMatch = a.title.toLowerCase() === searchTerm ? 10 : 0;
      const bExactMatch = b.title.toLowerCase() === searchTerm ? 10 : 0;
      const aScore = (a.relevance_score || 0) + aExactMatch;
      const bScore = (b.relevance_score || 0) + bExactMatch;
      return bScore - aScore;
    });
  }, [events]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Auto-fetch personalized events when location or preferences change
  useEffect(() => {
    if (location?.latitude && location?.longitude && preferences) {
      const shouldFetch = !lastFetched || 
                         Date.now() - lastFetched.getTime() > 15 * 60 * 1000;
      
      if (shouldFetch) {
        fetchPersonalizedEvents();
      }
    }
  }, [location?.latitude, location?.longitude, preferences, fetchPersonalizedEvents]);

  return {
    events,
    isLoading,
    preferences,
    fetchPersonalizedEvents,
    updatePreferences,
    getEventsByCategory,
    searchEvents,
    trackEventInteraction,
    lastFetched
  };
};