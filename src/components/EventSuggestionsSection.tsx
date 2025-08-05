import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEventSuggestions, EventSuggestion } from "@/hooks/useEventSuggestions";
import { useLocation } from "@/hooks/useLocation";
import { WorldwideLocationSearch } from "./WorldwideLocationSearch";
import { EventDisplay } from "./EventDisplay";
import { RefreshCw, Search, MapPin, Filter, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

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
  const { location, getCurrentLocation, setManualLocation, isGettingLocation } = useLocation();
  const { requestPermission } = usePermissions();
  const { events, isLoading, fetchEvents, getEventsByCategory, searchEvents, trackEventInteraction } = useEventSuggestions();
  
  console.log('EventSuggestionsSection render - location:', location, 'events count:', events.length, 'isLoading:', isLoading);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<EventSuggestion[]>([]);

  // Auto-detect location on component mount - removed since it's now handled by useLocation hook
  useEffect(() => {
    console.log('EventSuggestionsSection mount effect - location:', location, 'isGettingLocation:', isGettingLocation);
    // Location auto-detection is now handled automatically by the useLocation hook
    // This ensures consistent behavior across the app
  }, [location, isGettingLocation]);

  const handleAutoLocationDetection = async () => {
    console.log('Starting auto location detection...');
    try {
      const locationGranted = await requestPermission('location');
      console.log('Location permission granted:', locationGranted);
      if (locationGranted) {
        getCurrentLocation();
      } else {
        console.log('Location permission denied, showing manual search');
        // If permission denied, show location search after a brief delay
        setTimeout(() => {
          console.log('Setting showLocationSearch to true');
          setShowLocationSearch(true);
        }, 1000);
      }
    } catch (error) {
      console.log('Auto location detection failed:', error);
      setShowLocationSearch(true);
    }
  };

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

  const handleLocationSelect = (cityName: string) => {
    setManualLocation(cityName);
    setShowLocationSearch(false);
  };

  const handleCurrentLocationClick = async () => {
    try {
      const locationGranted = await requestPermission('location');
      if (locationGranted) {
        getCurrentLocation();
      } else {
        toast({
          title: "Location access denied",
          description: "Please enable location permissions in your browser settings to use this feature.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Location access failed",
        description: "Unable to access your location. Please try again or search manually.",
        variant: "destructive"
      });
    }
  };

  const refreshEvents = () => {
    fetchEvents(true); // Force refresh
  };

  if (!location) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-8 space-y-6">
          {isGettingLocation ? (
            <>
              <Navigation className="w-12 h-12 mx-auto text-primary animate-pulse" />
              <h3 className="text-lg font-semibold">Detecting your location...</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We're finding events near you. This will just take a moment.
              </p>
            </>
          ) : (
            <>
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">Discover Events Near You</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {showLocationSearch 
                  ? "Search for your city to find amazing events and activities"
                  : "We'll automatically detect your location to show relevant events"
                }
              </p>
              
              {showLocationSearch && (
                <div className="max-w-md mx-auto space-y-3">
                  <WorldwideLocationSearch
                    onLocationSelect={handleLocationSelect}
                    placeholder="Search for any city worldwide..."
                  />
                  <div className="text-sm text-muted-foreground">or</div>
                </div>
              )}
              
              <Button 
                variant={showLocationSearch ? "outline" : "default"} 
                onClick={handleCurrentLocationClick}
                disabled={isGettingLocation}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Use Current Location
              </Button>
              
              {!showLocationSearch && (
                <Button 
                  variant="ghost" 
                  onClick={() => setShowLocationSearch(true)}
                  className="text-sm"
                >
                  Or search for a city manually
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with location and refresh */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Event Suggestions</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>Events within {location.radius || 100}km of {location.city}</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowLocationSearch(!showLocationSearch)}
              className="text-xs h-6 px-2"
            >
              Change Location
            </Button>
          </div>
          
          {showLocationSearch && (
            <div className="mt-3 max-w-md">
              <WorldwideLocationSearch
                onLocationSelect={handleLocationSelect}
                placeholder="Search for any city worldwide..."
              />
            </div>
          )}
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

      <EventDisplay
        events={filteredEvents}
        isLoading={isLoading}
        onEventSelect={handleEventSave}
        onRefresh={refreshEvents}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
      />
    </div>
  );
};