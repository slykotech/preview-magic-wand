import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventSuggestionCard } from "./EventSuggestionCard";
import { useEventSuggestions, EventSuggestion } from "@/hooks/useEventSuggestions";
import { useLocation } from "@/hooks/useLocation";
import { RefreshCw, Search, MapPin, Filter } from "lucide-react";
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
  { value: 'romantic', label: 'Romantic' }
];

export const EventSuggestionsSection = ({ onEventSelect, className = "" }: EventSuggestionsSectionProps) => {
  const { toast } = useToast();
  const { location, getCurrentLocation, setManualLocation } = useLocation();
  const { events, isLoading, fetchEvents, getEventsByCategory, searchEvents, trackEventInteraction } = useEventSuggestions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [locationInput, setLocationInput] = useState('');
  const [filteredEvents, setFilteredEvents] = useState<EventSuggestion[]>([]);

  // Apply filters whenever events, search, or category changes
  useEffect(() => {
    let filtered = events;
    
    if (selectedCategory !== 'all') {
      filtered = getEventsByCategory(selectedCategory);
    }
    
    if (searchQuery.trim()) {
      filtered = searchEvents(searchQuery);
    }
    
    setFilteredEvents(filtered);
  }, [events, selectedCategory, searchQuery, getEventsByCategory, searchEvents]);

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

  const handleLocationSet = () => {
    if (locationInput.trim()) {
      setManualLocation(locationInput.trim());
      setLocationInput('');
    }
  };

  const refreshEvents = () => {
    fetchEvents(true); // Force refresh
  };

  if (!location) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-8 space-y-4">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Discover Events Near You</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Set your location to find amazing events and activities for your next date
          </p>
          
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              placeholder="Enter city or location"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLocationSet()}
            />
            <Button onClick={handleLocationSet} disabled={!locationInput.trim()}>
              Set Location
            </Button>
          </div>
          
          <Button variant="outline" onClick={getCurrentLocation}>
            <MapPin className="w-4 h-4 mr-2" />
            Use Current Location
          </Button>
        </div>
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
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

      {/* Empty state */}
      {!isLoading && filteredEvents.length === 0 && events.length === 0 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No events found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We couldn't find any events in your area right now. Try refreshing or adjusting your location.
          </p>
          <Button onClick={refreshEvents} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
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
            Try adjusting your search or category filter to see more events.
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              variant="outline" 
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedCategory('all')}
            >
              Show All Categories
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};