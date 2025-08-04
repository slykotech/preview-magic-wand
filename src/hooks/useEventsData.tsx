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
  state?: string;
  country?: string;
  price?: string;
  image?: string;
  bookingUrl?: string;
  date?: string;
  time?: string;
  source?: string;
}

interface DataSourceInfo {
  real_time_sources: string[];
  fallback_used: boolean;
  firecrawl_status: 'available' | 'failed' | 'not_configured';
  cache_status: 'hit' | 'miss' | 'expired';
  last_updated: string;
}

export const useEventsData = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchLocation, setLastFetchLocation] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [cacheExpiry] = useState<number>(15 * 60 * 1000); // 15 minutes cache
  const [dataSourceInfo, setDataSourceInfo] = useState<DataSourceInfo | null>(null);
  const [quota, setQuota] = useState<any>(null);

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
      console.log('Using cached events (cache valid for', Math.round((cacheExpiry - (now - lastFetchTime)) / 1000), 'seconds)');
      return;
    }

    console.log('Fetching events from database for location:', location.displayName);
    setIsLoading(true);
    setError(null);
    setLastFetchLocation(locationKey);
    setLastFetchTime(now);

    try {
      let dbEvents = [];
      let isRuralFallback = false;
      let nearestCity = '';

      // Try to get events from database using the new function
      if (location.latitude !== 0 && location.longitude !== 0) {
        console.log('Querying database for events near coordinates:', location.latitude, location.longitude);
        
        // Use the unlimited database function for smart location-based querying
        const { data, error: dbError } = await supabase.rpc('get_events_by_location_unlimited', {
          user_lat: location.latitude,
          user_lng: location.longitude,
          radius_km: 25,
          max_events: 100
        });

        if (dbError) {
          console.error('Database query error:', dbError);
          throw new Error(dbError.message);
        }

        dbEvents = data || [];
        
        // If we got events from a distant city, it's a rural fallback
        if (dbEvents.length > 0) {
          const minDistance = Math.min(...dbEvents.map(e => e.distance_km));
          if (minDistance > 50) {
            isRuralFallback = true;
            nearestCity = dbEvents[0]?.city || 'nearby city';
          }
        }
      } else if (location.city) {
        // Search by city name using the new city function
        console.log('Querying database for events in city:', location.city);
        
        const { data, error: dbError } = await supabase.rpc('get_events_by_city_unlimited', {
          city_name: location.city,
          max_events: 100
        });

        if (dbError) {
          console.error('Database query error:', dbError);
          throw new Error(dbError.message);
        }

        dbEvents = data || [];
      }

      // Transform database events to match expected format with enhanced location data
      const transformedEvents = dbEvents.map(event => ({
        id: event.id,
        title: event.title,
        distance: `${event.distance_km?.toFixed(1) || '0'} km away`,
        timing: event.event_time || 'Time TBD',
        description: event.description || '',
        category: event.category || 'Entertainment',
        venue: event.venue,
        city: event.city,
        state: event.state,
        country: event.country,
        price: event.price,
        image: event.image_url,
        bookingUrl: event.booking_url,
        date: event.event_date,
        time: event.event_time,
        source: event.source || 'database'
      }));

      if (transformedEvents.length > 0) {
        setEvents(transformedEvents);
        setError(null);
        
        console.log(`✅ Loaded ${transformedEvents.length} events from database`);
        
        const titleSuffix = isRuralFallback ? ` in ${nearestCity}` : '';
        const descriptionSuffix = isRuralFallback 
          ? ` Events from ${nearestCity} (nearest city with events)`
          : '';
        
        toast({
          title: `Events loaded! 🎉${titleSuffix}`,
          description: `Found ${transformedEvents.length} events${descriptionSuffix}`,
        });
      } else {
        // No events found in database, show message with helpful info
        setEvents([]);
        
        const noEventsMessage = location.latitude !== 0 
          ? `No events found within 200km of your location. Events are automatically updated every 3 hours.`
          : `No events found for ${location.city}. Try a nearby major city or check back later.`;
        
        setError(noEventsMessage);
        
        toast({
          title: "No events found",
          description: noEventsMessage,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error fetching events from database:', error);
      
      // Fallback to mock events on error
      const mockEvents = getMockEvents();
      setEvents(mockEvents);
      setError(null);
      
      toast({
        title: "Using sample events",
        description: "Database temporarily unavailable, showing sample events",
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
    refreshEvents,
    setEvents, // Expose setEvents for direct updates
    dataSourceInfo,
    quota
  };
};