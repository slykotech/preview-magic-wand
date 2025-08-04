import { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedEventSearch } from '@/components/EnhancedEventSearch';
import { useEnhancedLocation } from '@/hooks/useEnhancedLocation';
import { useEventsData, EventData } from '@/hooks/useEventsData';
import { useToast } from '@/hooks/use-toast';

const UpcomingEvents = () => {
  const { location, isGettingLocation, getCurrentLocation, setManualLocation, searchNearbyEvents } = useEnhancedLocation();
  const { events, isLoading, error, fetchEvents, refreshEvents } = useEventsData();
  const { toast } = useToast();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-fetch events when location is available
  useEffect(() => {
    if (location && location.latitude !== 0) {
      // Convert to old location format for compatibility
      const oldLocationFormat = {
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
        displayName: location.displayName
      };
      fetchEvents(oldLocationFormat);
    }
  }, [location, fetchEvents]);

  const handleLocationSearch = (cityName: string, country?: string) => {
    setManualLocation(cityName, country);
  };

  const handleNearbySearch = (radius: number) => {
    searchNearbyEvents(radius);
  };

  const handleRefresh = () => {
    if (location) {
      const oldLocationFormat = {
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
        displayName: location.displayName
      };
      refreshEvents(oldLocationFormat);
    }
  };

  // Filter events based on search criteria
  const filteredEvents = events.filter(event => {
    const matchesCategory = selectedCategory === 'all' || event.category?.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch = searchQuery === '' || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesPrice = true;
    if (priceRange !== 'all' && event.price) {
      const priceText = event.price.toLowerCase();
      switch(priceRange) {
        case 'free':
          matchesPrice = priceText.includes('free');
          break;
        case 'low':
          matchesPrice = priceText.includes('₹') && !priceText.includes('₹1') && !priceText.includes('₹2');
          break;
        case 'medium':
          matchesPrice = priceText.includes('₹1') || priceText.includes('₹2');
          break;
        case 'high':
          matchesPrice = priceText.includes('₹3') || priceText.includes('₹4') || priceText.includes('₹5');
          break;
      }
    }
    
    return matchesCategory && matchesSearch && matchesPrice;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(events.map(event => event.category).filter(Boolean)));

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Upcoming Events
        </h1>
        <p className="text-muted-foreground">
          Discover amazing experiences near you
        </p>
      </div>

      {/* Enhanced Search Section */}
      <EnhancedEventSearch
        onLocationSearch={handleLocationSearch}
        onNearbySearch={handleNearbySearch}
        currentLocation={location}
        isLoading={isLoading || isGettingLocation}
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className="h-8"
        >
          <MapPin className="h-3 w-3 mr-1" />
          {isGettingLocation ? 'Getting...' : 'Use My Location'}
        </Button>
        
        {location && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8"
          >
            {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Calendar className="h-3 w-3 mr-1" />}
            Refresh Events
          </Button>
        )}
      </div>

      {/* Filters */}
      {events.length > 0 && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
              
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category || ''}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Price Range Filter */}
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="low">Under ₹1000</SelectItem>
                  <SelectItem value="medium">₹1000 - ₹3000</SelectItem>
                  <SelectItem value="high">Above ₹3000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Active Filters */}
            <div className="flex flex-wrap gap-2">
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCategory('all')}>
                  Category: {selectedCategory} ×
                </Badge>
              )}
              {priceRange !== 'all' && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setPriceRange('all')}>
                  Price: {priceRange} ×
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery('')}>
                  Search: {searchQuery} ×
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Events List */}
      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        )}

        {error && !isLoading && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={getCurrentLocation} disabled={isGettingLocation}>
              <MapPin className="h-4 w-4 mr-2" />
              Try My Location
            </Button>
          </Card>
        )}

        {!isLoading && !error && filteredEvents.length === 0 && events.length > 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No events match your filters. Try adjusting your search criteria.</p>
          </Card>
        )}

        {!isLoading && !error && events.length === 0 && (
          <Card className="p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No events found. Search for a city or use your current location to find events.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={getCurrentLocation} disabled={isGettingLocation}>
                <MapPin className="h-4 w-4 mr-2" />
                Use My Location
              </Button>
            </div>
          </Card>
        )}

        {/* Events Grid */}
        {filteredEvents.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredEvents.length} of {events.length} events
                {location && ` near ${location.displayName}`}
              </p>
            </div>
            
            <div className="grid gap-4">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Event Card Component
const EventCard = ({ event }: { event: EventData }) => {
  const { toast } = useToast();

  const handleBooking = () => {
    if (event.bookingUrl) {
      window.open(event.bookingUrl, '_blank');
    } else {
      toast({
        title: "Booking info",
        description: "Visit the venue or check local listings for tickets",
      });
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="md:flex">
        {/* Image */}
        {event.image && (
          <div className="md:w-48 h-48 md:h-auto">
            <img 
              src={event.image} 
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                <CardDescription className="flex items-center gap-4 text-xs">
                  {event.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.venue}
                    </span>
                  )}
                  {event.distance && (
                    <span>{event.distance}</span>
                  )}
                </CardDescription>
              </div>
              
              <div className="text-right">
                {event.category && (
                  <Badge variant="secondary" className="text-xs">
                    {event.category}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Description */}
              {event.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {event.description}
                </p>
              )}
              
              {/* Event Details */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {event.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(event.date).toLocaleDateString()}
                  </span>
                )}
                {event.time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {event.time}
                  </span>
                )}
                {event.city && event.state && (
                  <span>{event.city}, {event.state}</span>
                )}
              </div>
              
              {/* Price and Action */}
              <div className="flex items-center justify-between">
                <div>
                  {event.price && (
                    <span className="font-medium text-sm">{event.price}</span>
                  )}
                  {event.source && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {event.source}
                    </Badge>
                  )}
                </div>
                
                <Button size="sm" onClick={handleBooking} className="h-8">
                  Book Now
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};

export default UpcomingEvents;