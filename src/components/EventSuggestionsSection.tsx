import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventSuggestionCard } from "./EventSuggestionCard";
import { EventScrapingTrigger } from "./EventScrapingTrigger";
import { GooglePlacesApiTest } from "./GooglePlacesApiTest";
import { CitySearchInput } from "./CitySearchInput";
import { useEventSuggestions, EventSuggestion } from "@/hooks/useEventSuggestions";
import { useLocation } from "@/hooks/useLocation";
import { RefreshCw, MapPin, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EventSuggestionsSectionProps {
  onEventSelect: (event: EventSuggestion) => void;
  className?: string;
}

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'music', label: 'Music & Concerts' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'sports', label: 'Sports & Fitness' },
  { value: 'cultural', label: 'Arts & Culture' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'technology', label: 'Tech & Networking' },
  { value: 'networking', label: 'Professional' }
];

const radiusOptions = [
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' }
];

export const EventSuggestionsSection = ({ onEventSelect, className = "" }: EventSuggestionsSectionProps) => {
  const { toast } = useToast();
  const { location, getCurrentLocation, setManualLocation } = useLocation();
  const { events, isLoading, fetchEvents, getEventsByCategory, trackEventInteraction } = useEventSuggestions();
  
  console.log('EventSuggestionsSection render - location:', location, 'events count:', events.length, 'isLoading:', isLoading);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRadius, setSelectedRadius] = useState(100);
  const [filteredEvents, setFilteredEvents] = useState<EventSuggestion[]>([]);

  // Apply filters whenever events or category changes
  useEffect(() => {
    let filtered = events;
    
    if (selectedCategory !== 'all') {
      filtered = getEventsByCategory(selectedCategory);
    }
    
    setFilteredEvents(filtered);
  }, [events, selectedCategory, getEventsByCategory]);

  // Fetch events when radius changes
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      fetchEvents(false, selectedRadius);
    }
  }, [selectedRadius, location?.latitude, location?.longitude, fetchEvents]);

  const handleEventSave = async (event: EventSuggestion) => {
    await trackEventInteraction(event.id, 'saved');
    onEventSelect(event);
    
    toast({
      title: "Event added! 🎉",
      description: `${event.title} has been added to your date planner`,
    });
  };

  const handleEventView = async (event: EventSuggestion) => {
    await trackEventInteraction(event.id, 'viewed');
    // Could open a modal or navigate to detail view
  };

  const handleLocationSet = (cityName: string, coordinates: { lat: number; lng: number; displayName: string }) => {
    setManualLocation(cityName, coordinates);
  };

  const refreshEvents = () => {
    fetchEvents(true, selectedRadius); // Force refresh with current radius
  };

  if (!location) {
    return (
      <div className={`space-y-4 ${className}`}>
        <CitySearchInput 
          onLocationSet={handleLocationSet}
          onCurrentLocation={getCurrentLocation}
          className="py-8"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with location and refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Suggestions</h2>
          <p className="text-muted-foreground">
            Events near {location.displayName}
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshEvents}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-64">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Radius Filter */}
        <Select value={selectedRadius.toString()} onValueChange={(value) => setSelectedRadius(parseInt(value))}>
          <SelectTrigger className="w-full sm:w-48">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {radiusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                Within {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Change Location Button */}
        <Button 
          variant="outline" 
          onClick={() => setManualLocation('')}
        >
          <MapPin className="w-4 h-4 mr-2" />
          Change Location
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Finding amazing events for you...</p>
        </div>
      )}

      {/* Events grid */}
      {!isLoading && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <EventSuggestionCard
              key={event.id}
              event={event}
              onSaveToPlanner={handleEventSave}
              onViewDetails={handleEventView}
            />
          ))}
        </div>
      )}

      {/* Empty state with scraping trigger */}
      {!isLoading && filteredEvents.length === 0 && events.length === 0 && (
        <div className="text-center py-8 space-y-6">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No events found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              The database may need to be populated with events for your area. Try triggering the scraping process below.
            </p>
          </div>
          
          <GooglePlacesApiTest />
          
          <Button onClick={refreshEvents} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Again
          </Button>
        </div>
      )}

      {/* No results for filters */}
      {!isLoading && filteredEvents.length === 0 && events.length > 0 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No matching events</h3>
          <p className="text-muted-foreground">
            Try adjusting your category filter to see more events.
          </p>
          <Button 
            variant="outline" 
            onClick={() => setSelectedCategory('all')}
          >
            Show All Categories
          </Button>
        </div>
      )}
    </div>
  );
};