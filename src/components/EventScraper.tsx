import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Calendar, MapPin, DollarSign, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ScrapedEvent {
  title: string;
  date?: string;
  location?: string;
  price?: string;
  description?: string;
  category?: string;
  url?: string;
}

export const EventScraper = () => {
  const { toast } = useToast();
  const [customUrl, setCustomUrl] = useState('');
  const [city, setCity] = useState('mumbai');
  const [country, setCountry] = useState('india');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapedEvents, setScrapedEvents] = useState<ScrapedEvent[]>([]);

  const handleScrapeEventSites = async () => {
    setIsLoading(true);
    setProgress(0);
    setScrapedEvents([]);

    try {
      // Use Google Places to search for venues instead of web scraping
      const { data, error } = await supabase.functions.invoke('search-nearby-places', {
        body: { 
          latitude: 0, // Default coordinates - you may want to get user's location
          longitude: 0,
          category: 'event_venues',
          cityName: city.toLowerCase()
        }
      });

      if (error) {
        console.error('Places search error:', error);
        toast({
          title: "Search failed",
          description: error.message || "Failed to search for venues",
          variant: "destructive",
        });
        return;
      }

      if (data?.places?.length > 0) {
        // Convert places to event-like format
        const eventLikeResults = data.places.map((place: any, index: number) => ({
          id: `place-${index}`,
          title: place.name,
          location: place.vicinity || place.formatted_address,
          description: `Venue: ${place.name}`,
          category: 'venue',
          source: 'Google Places'
        }));
        
        setScrapedEvents(eventLikeResults);
        toast({
          title: "Venues found!",
          description: `Found ${data.places.length} potential event venues`,
        });
      } else {
        toast({
          title: "No venues found",
          description: "No venues were found for the specified location.",
        });
      }
    } catch (error) {
      console.error('Error during venue search:', error);
      toast({
        title: "Search failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  const handleScrapeCustomUrls = async () => {
    toast({
      title: "Feature removed",
      description: "Custom URL scraping is no longer available. Use Google Places venue search instead.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Event Scraper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (e.g., mumbai, delhi, bangalore)"
              className="flex-1"
            />
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country (e.g., india, usa, uk)"
              className="flex-1"
            />
          </div>
          
          <Button 
            onClick={handleScrapeEventSites}
            disabled={isLoading}
            className="w-full h-12"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Scraping Events...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Search Event Venues (Google Places)
              </>
            )}
          </Button>
          
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Custom URLs (one per line):</h3>
            <textarea
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder={`Enter custom event site URLs to scrape:
https://example-events.com/city-events
https://local-venue.com/upcoming-shows`}
              className="w-full h-24 p-3 border rounded-md resize-none"
            />
            <Button 
              onClick={handleScrapeCustomUrls}
              disabled={isLoading || !customUrl.trim()}
              variant="outline"
              className="mt-2 w-full"
            >
              Scrape Custom URLs
            </Button>
          </div>
          
          {isLoading && (
            <Progress value={progress} className="w-full" />
          )}
        </CardContent>
      </Card>

      {scrapedEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scrapedEvents.map((event, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg line-clamp-2">
                  {event.title || 'Untitled Event'}
                </CardTitle>
                {event.category && (
                  <Badge variant="secondary" className="w-fit">
                    {event.category}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {event.date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {event.date}
                  </div>
                )}
                
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                )}
                
                {event.price && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    {event.price}
                  </div>
                )}
                
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {event.description}
                  </p>
                )}
                
                {event.url && (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a 
                      href={event.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Event
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {scrapedEvents.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No venues found yet. Select a city and click "Search Event Venues" to get started.</p>
            <p className="text-xs mt-2">Powered by Google Places API to find event venues and locations</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};