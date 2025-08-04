import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SavedEvent {
  id: string;
  external_id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  location_lat: number;
  location_lng: number;
  location_name: string;
  price: string;
  event_date: string;
  event_time: string;
  source: string;
  image_url?: string;
  booking_url?: string;
  created_at: string;
  expires_at: string;
}

export const useSavedEvents = () => {
  const { toast } = useToast();
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedEvents = useCallback(async (latitude?: number, longitude?: number, radius = 50) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('events')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('event_date', { ascending: true });

      // Filter by location if coordinates provided
      if (latitude !== undefined && longitude !== undefined) {
        // Using a simple bounding box filter for performance
        const latOffset = radius / 111; // roughly 1 degree = 111 km
        const lngOffset = radius / (111 * Math.cos(latitude * Math.PI / 180));
        
        query = query
          .gte('location_lat', latitude - latOffset)
          .lte('location_lat', latitude + latOffset)
          .gte('location_lng', longitude - lngOffset)
          .lte('location_lng', longitude + lngOffset);
      }

      const { data, error: fetchError } = await query.limit(100);

      if (fetchError) {
        console.error('Database error:', fetchError);
        throw new Error('Failed to fetch events from database');
      }

      setSavedEvents(data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching saved events:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveEventForUser = useCallback(async (eventId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('user_saved_events')
        .insert({
          user_id: userId,
          event_id: eventId
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already saved",
            description: "This event is already in your saved events.",
            variant: "destructive"
          });
          return false;
        }
        throw error;
      }

      toast({
        title: "Event saved! ⭐",
        description: "Added to your saved events"
      });
      return true;
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error saving event",
        description: "Please try again",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const unsaveEventForUser = useCallback(async (eventId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('user_saved_events')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

      if (error) throw error;

      toast({
        title: "Event removed",
        description: "Removed from your saved events"
      });
      return true;
    } catch (error) {
      console.error('Error unsaving event:', error);
      toast({
        title: "Error removing event",
        description: "Please try again",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const getUserSavedEvents = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_saved_events')
        .select(`
          event_id,
          saved_at,
          events (*)
        `)
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (fetchError) throw fetchError;

      const userSavedEvents = data?.map(item => ({
        ...item.events,
        saved_at: item.saved_at
      })) || [];

      setSavedEvents(userSavedEvents);
      setError(null);
    } catch (error) {
      console.error('Error fetching user saved events:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    savedEvents,
    isLoading,
    error,
    fetchSavedEvents,
    saveEventForUser,
    unsaveEventForUser,
    getUserSavedEvents
  };
};