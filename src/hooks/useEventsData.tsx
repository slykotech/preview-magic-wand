import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LocationData } from './useLocation';

export interface EventData {
  id: string;
  title: string;
  distance: string;
  timing: string;
  description: string;
  category: string;
  venue?: string;
  city?: string;
  price?: string;
  image?: string;
  bookingUrl?: string;
  date?: string;
  time?: string;
  source?: string;
}

export const useEventsData = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchLocation, setLastFetchLocation] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [cacheExpiry] = useState<number>(15 * 60 * 1000); // 15 minutes cache

  const getMockEvents = useCallback((): EventData[] => [
    {
      id: 'mock-1',
      title: 'Jazz Under the Stars 🎷',
      distance: '3 km away',
      timing: 'Friday, 8:30 PM',
      description: 'Feel the rhythm of love as you sway under moonlight and melody.',
      category: 'Music',
      venue: 'Central Park',
      price: 'From $25',
      source: 'mock'
    },
    {
      id: 'mock-2', 
      title: 'Candlelit Wine Tasting 🍷',
      distance: '1.2 km away',
      timing: 'Saturday, 7:00 PM',
      description: 'Discover new flavors together in an intimate candlelit setting.',
      category: 'Food & Drink',
      venue: 'Wine & Dine',
      price: 'From $45',
      source: 'mock'
    },
    {
      id: 'mock-3',
      title: 'Moonlight Art Gallery 🎨',
      distance: '5 km away', 
      timing: 'Sunday, 6:00 PM',
      description: 'Explore beautiful art pieces while sharing whispered conversations.',
      category: 'Culture',
      venue: 'Modern Art Museum',
      price: 'From $15',
      source: 'mock'
    }
  ], []);

  const fetchEvents = useCallback(async (location: LocationData, updateLocationCallback?: (lat: number, lng: number, resolvedName?: string) => void) => {
    if (!location) {
      setError('No location provided');
      return;
    }

    // Check if this is a forced refresh or new location
    const locationKey = location.latitude !== 0 ? 
      `${location.latitude},${location.longitude}` : 
      location.city;
    
    const now = Date.now();
    const isCacheValid = now - lastFetchTime < cacheExpiry;
    
    // Don't skip if this is the same location but cache is expired 
    if (lastFetchLocation === locationKey && events.length > 0 && isCacheValid) {
      console.log('Skipping fetch, using cached events (cache valid for', Math.round((cacheExpiry - (now - lastFetchTime)) / 1000), 'seconds)');
      return;
    }

    console.log('Fetching fresh events for location:', location.displayName);
    setIsLoading(true);
    setError(null);
    setLastFetchLocation(locationKey);
    setLastFetchTime(now);

    try {
      // Prepare request body based on location type
      const requestBody = location.latitude !== 0 ? 
        {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 50,
          size: 20
        } : 
        {
          locationName: location.city,
          radius: 50,
          size: 20
        };

      console.log('Fetching events with request:', requestBody);

      const { data, error: apiError } = await supabase.functions.invoke('fetch-events', {
        body: requestBody
      });

      if (apiError) {
        console.error('API Error:', apiError);
        throw new Error(apiError.message || 'Failed to fetch events');
      }

      if (!data) {
        throw new Error('No data received from API');
      }

      // Handle successful response
      if (data.events && Array.isArray(data.events) && data.events.length > 0) {
        setEvents(data.events);
        setError(null);
        
        console.log(`Successfully loaded ${data.events.length} events`);
        
        // Update location coordinates if geocoded by backend
        if (data.coordinates && updateLocationCallback) {
          const { lat, lng } = data.coordinates;
          if (lat && lng) {
            updateLocationCallback(lat, lng, data.location);
          }
        }

        const cacheStatus = data.cached ? ' (cached)' : '';
        
        toast({
          title: `Events loaded! 🎉${cacheStatus}`,
          description: `Found ${data.events.length} events within 50km`,
        });
        
        // Check for quota warnings  
        if (data.quota_info) {
          const quota = data.quota_info;
          if (quota.daily_remaining <= 2) {
            toast({
              title: "API quota warning",
              description: `Only ${quota.daily_remaining} requests remaining today`,
              variant: "destructive"
            });
          }
          if (quota.monthly_cost_remaining <= 1) {
            toast({
              title: "Cost limit warning", 
              description: `$${quota.monthly_cost_remaining.toFixed(2)} remaining this month`,
              variant: "destructive"
            });
          }
        }
      } else {
        // No events found, but API call was successful
        setEvents([]);
        setError(`No events found near ${location.displayName}`);
        
        toast({
          title: "No events found",
          description: `No events found near ${location.displayName}. Try a different location or check back later.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      
      // Handle quota exceeded error specifically
      if (error.message && error.message.includes('quota exceeded')) {
        setEvents([]);
        setError('API quota exceeded. Please try again tomorrow or upgrade your plan.');
        
        toast({
          title: "API quota exceeded",
          description: "You've reached your daily API limit. Please try again tomorrow.",
          variant: "destructive"
        });
        return;
      }
      
      // Fallback to mock events on error
      const mockEvents = getMockEvents();
      setEvents(mockEvents);
      setError(null);
      
      toast({
        title: "Using sample events",
        description: "Couldn't fetch live events, showing sample data instead",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [events.length, lastFetchLocation, getMockEvents, toast]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setError(null);
    setLastFetchLocation(null);
  }, []);

  const refreshEvents = useCallback((location: LocationData, updateLocationCallback?: (lat: number, lng: number, resolvedName?: string) => void) => {
    console.log('Force refreshing events for:', location.displayName);
    setLastFetchLocation(null); // Force refetch
    setLastFetchTime(0); // Reset cache timestamp
    setEvents([]); // Clear existing events
    fetchEvents(location, updateLocationCallback);
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    fetchEvents,
    clearEvents,
    refreshEvents
  };
};