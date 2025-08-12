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
  ai_generated?: boolean;
  generation_batch_id?: string;
  city_name?: string;
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
  const [lastFetchSource, setLastFetchSource] = useState<'database' | 'ai_fresh' | 'ai_cache' | 'sample' | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Auto-fetch location and events on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Auto-search events when location changes
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      searchEvents();
    }
  }, [location]);

  const searchEventsByLocation = useCallback(async (cityQuery?: string) => {
    if (!location?.latitude || !location?.longitude) {
      toast({
        title: "Location required",
        description: "Please set your location to find events.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    console.log(`Searching events for: ${cityQuery || location.city} at ${location.latitude}, ${location.longitude}`);

    try {
      // Step 1: Query database first using new intelligent search function
      const { data: dbEvents, error: dbError } = await supabase.rpc('search_events_by_location', {
        p_lat: location.latitude,
        p_lng: location.longitude,
        p_radius_km: location.searchRadius || 50,
        p_city_name: cityQuery || location.city,
        p_limit: 20
      });

      if (dbError) {
        console.error('Database search error:', dbError);
      }

      console.log(`Found ${dbEvents?.length || 0} events in database`);

      // Step 2: Filter out AI-generated events to show only real scraped events
      const realEvents = dbEvents?.filter(e => !e.ai_generated) || [];
      
      console.log(`Found ${realEvents.length} real events (filtered out ${(dbEvents?.length || 0) - realEvents.length} AI events)`);

      // Step 3: Show available real events or sample events
      console.log(`Using ${realEvents.length} real events from database`);

      // Step 4: Use real events if we have any, or show sample events
      if (realEvents && realEvents.length > 0) {
        setEvents(realEvents.map(event => ({
          ...event,
          distance_km: event.distance_km
        })));
        setLastFetchSource('database');
        toast({
          title: `Found ${realEvents.length} real events`,
          description: `Showing verified events from ${realEvents.map(e => e.source).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`,
        });
      } else {
        // Fallback to sample events
        console.log('No events found, showing sample events');
        const sampleEvents = [
          {
            id: `sample-1-${Date.now()}`,
            title: "Local Coffee Shop Music Night",
            start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            location_name: location.city || "Your City",
            price: "Free",
            category: "music",
            description: "Enjoy live acoustic music at your local coffee shop",
            source: "sample",
            organizer: "Community Events",
            ai_generated: false
          },
          {
            id: `sample-2-${Date.now()}`,
            title: "Weekend Farmers Market",
            start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            location_name: location.city || "Your City",
            price: "Free", 
            category: "food",
            description: "Fresh local produce and artisan goods",
            source: "sample",
            organizer: "Local Farmers",
            ai_generated: false
          }
        ];
        
        setEvents(sampleEvents);
        setLastFetchSource('sample');
        toast({
          title: "No events found",
          description: "Showing sample events for your area",
          duration: 3000,
        });
      }

    } catch (error) {
      console.error('Error in intelligent event search:', error);
      toast({
        title: "Error searching events",
        description: "Please try again later.",
        variant: "destructive"
      });
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [location, toast]);

  const searchEvents = useCallback(() => {
    searchEventsByLocation();
  }, [searchEventsByLocation]);

  const handleCitySearch = useCallback((cityQuery: string) => {
    setSearchQuery(cityQuery);
    if (cityQuery.trim()) {
      searchEventsByLocation(cityQuery.trim());
    }
  }, [searchEventsByLocation]);

  const handleLocationSet = useCallback((cityName: string, coordinates: {lat: number, lng: number, displayName: string}) => {
    // Extract country from displayName if available (format: "City, State, Country" or "City, Country")
    const parts = coordinates.displayName.split(', ');
    const country = parts.length > 1 ? parts[parts.length - 1] : undefined;
    
    setManualLocation(cityName, country);
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
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={
                lastFetchSource === 'ai_fresh' ? 'default' : 
                lastFetchSource === 'database' ? 'default' :
                'secondary'
              }>
                {lastFetchSource === 'ai_fresh' ? 'Fresh AI Events' : 
                 lastFetchSource === 'ai_cache' ? 'Cached AI Events' :
                 lastFetchSource === 'database' ? 'Database Events' :
                 'Sample Events'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {filteredEvents.length} of {events.length} events
              </span>
              {searchQuery && (
                <Badge variant="outline" className="text-xs">
                  Search: {searchQuery}
                </Badge>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Search by City</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter city name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCitySearch(searchQuery)}
                className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
              />
              <Button 
                onClick={() => handleCitySearch(searchQuery)}
                disabled={isLoading || !searchQuery.trim()}
                size="sm"
              >
                Search
              </Button>
            </div>
          </div>
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