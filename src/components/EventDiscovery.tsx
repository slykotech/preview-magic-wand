import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedLocation } from "@/hooks/useEnhancedLocation";
import { CitySearchInput } from "@/components/CitySearchInput";
import { EventCard } from "@/components/EventCard";

interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  price?: string;
  organizer?: string;
  category?: string;
  website_url?: string;
  image_url?: string;
  source: string;
  distance_km?: number;
}

interface EventDiscoveryProps {
  coupleId: string;
  userId: string;
  onAddToDatePlan?: (eventData: any) => void;
}

export const EventDiscovery: React.FC<EventDiscoveryProps> = ({ 
  coupleId, 
  userId, 
  onAddToDatePlan 
}) => {
  const { toast } = useToast();
  const { location, isGettingLocation, getCurrentLocation, setManualLocation } = useEnhancedLocation();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState("this_week");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lastFetchSource, setLastFetchSource] = useState<'cache' | 'fresh' | null>(null);

  // Automatically get location and fetch events on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      searchEvents();
    }
  }, [location]);

  const searchEvents = useCallback(async () => {
    if (!location?.latitude || !location?.longitude) {
      toast({
        title: "Location required",
        description: "Please set your location to find events.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-events', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm: location.searchRadius || 25,
          city: location.city,
          sources: ['eventbrite', 'meetup']
        }
      });

      if (error) throw error;

      if (data?.success) {
        setEvents(data.events || []);
        setLastFetchSource(data.source);
        toast({
          title: `Found ${data.events?.length || 0} events`,
          description: data.source === 'cache' 
            ? "Showing cached events" 
            : `Fetched ${data.newEventsFetched || 0} new events`,
        });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error fetching events",
        description: "Please try again later.",
        variant: "destructive"
      });
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [location, toast]);

  const handleLocationSet = useCallback((cityName: string, coordinates: {lat: number, lng: number, displayName: string}) => {
    setManualLocation(cityName, coordinates);
  }, [setManualLocation]);

  const handleSaveEvent = useCallback(async (event: Event) => {
    try {
      const { error } = await supabase
        .from('user_saved_events')
        .insert({
          user_id: userId,
          event_id: event.id,
          couple_id: coupleId
        });
      
      if (error) throw error;
      
      toast({
        title: "Event saved!",
        description: `${event.title} has been saved to your favorites.`,
      });
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error saving event",
        description: "Please try again later.",
        variant: "destructive"
      });
      throw error;
    }
  }, [userId, coupleId, toast]);

  const handleAddToDatePlan = useCallback((event: Event) => {
    if (!onAddToDatePlan) return;

    const dateData = {
      title: event.title,
      description: event.description,
      location: event.location_name,
      category: event.category || 'event',
      scheduled_date: new Date(event.start_date).toISOString().split('T')[0],
      scheduled_time: new Date(event.start_date).toTimeString().split(' ')[0],
      estimated_cost: event.price,
      website_url: event.website_url,
      notes: `Event by ${event.organizer || 'Unknown organizer'}\nSource: ${event.source}`
    };

    onAddToDatePlan(dateData);
    toast({
      title: "Added to date plan!",
      description: `${event.title} has been added to your date ideas.`,
    });
  }, [onAddToDatePlan, toast]);

  // Filter events based on selected criteria
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.start_date);
    const now = new Date();
    
    // Time frame filter
    let timeMatch = true;
    switch (selectedTimeFrame) {
      case 'today':
        timeMatch = eventDate.toDateString() === now.toDateString();
        break;
      case 'this_week':
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        timeMatch = eventDate >= now && eventDate <= weekFromNow;
        break;
      case 'this_month':
        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        timeMatch = eventDate >= now && eventDate <= monthFromNow;
        break;
      default:
        timeMatch = eventDate >= now;
    }

    // Category filter
    const categoryMatch = selectedCategory === 'all' || 
      event.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      event.title.toLowerCase().includes(selectedCategory.toLowerCase());

    return timeMatch && categoryMatch;
  });

  return (
    <div className="space-y-6">
      {/* Location Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Event Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CitySearchInput 
            onLocationSet={handleLocationSet}
            onCurrentLocation={getCurrentLocation}
            className="w-full"
          />
          {location && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location.displayName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={searchEvents}
                disabled={isLoading}
                className="ml-auto"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Frame</label>
              <Select value={selectedTimeFrame} onValueChange={setSelectedTimeFrame}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="all">All Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="music">Music & Concerts</SelectItem>
                  <SelectItem value="food">Food & Dining</SelectItem>
                  <SelectItem value="art">Arts & Culture</SelectItem>
                  <SelectItem value="sports">Sports & Fitness</SelectItem>
                  <SelectItem value="social">Social & Networking</SelectItem>
                  <SelectItem value="outdoor">Outdoor & Adventure</SelectItem>
                  <SelectItem value="learning">Learning & Education</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {lastFetchSource && (
            <div className="flex items-center gap-2">
              <Badge variant={lastFetchSource === 'fresh' ? 'default' : 'secondary'}>
                {lastFetchSource === 'fresh' ? 'Fresh Events' : 'Cached Events'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {filteredEvents.length} of {events.length} events
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {location && (
        <div>
          {isLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Finding events in your area...</span>
                </div>
              </CardContent>
            </Card>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map((event) => (
                <div key={event.id} className="space-y-2">
                  <EventCard 
                    event={event} 
                    onSave={handleSaveEvent}
                  />
                  {onAddToDatePlan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddToDatePlan(event)}
                      className="w-full"
                    >
                      Add to Date Plan
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : events.length > 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No events match your filters</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your time frame or category filters.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTimeFrame("all");
                    setSelectedCategory("all");
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No events found</h3>
                <p className="text-muted-foreground mb-4">
                  We couldn't find any events in your area. Try searching for a different location.
                </p>
                <Button onClick={searchEvents} disabled={isLoading}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};