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
      const { data, error } = await supabase.functions.invoke('firecrawl-scraper', {
        body: { 
          city: city.toLowerCase(),
          country: country.toLowerCase()
        }
      });

      if (error) {
        throw error;
      }
      
      if (data?.success && data?.events) {
        setScrapedEvents(data.events);
        
        toast({
          title: "Success",
          description: `Scraped ${data.events.length} events from major event sites`,
        });
      } else {
        toast({
          title: "Error",
          description: data?.error || "Failed to scrape event sites",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error scraping event sites:', error);
      toast({
        title: "Error",
        description: "Failed to scrape event sites",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  const handleScrapeCustomUrls = async () => {
    if (!customUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter URLs to scrape",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const urls = customUrl.split('\n').map(url => url.trim()).filter(Boolean);
      
      const { data, error } = await supabase.functions.invoke('firecrawl-scraper', {
        body: { 
          urls,
          city: city.toLowerCase(),
          country: country.toLowerCase()
        }
      });

      if (error) {
        throw error;
      }
      
      if (data?.success && data?.events) {
        setScrapedEvents(data.events);
        
        toast({
          title: "Success",
          description: `Scraped ${data.events.length} events from custom URLs`,
        });
      } else {
        toast({
          title: "Error",
          description: data?.error || "Failed to scrape custom URLs",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error scraping custom URLs:', error);
      toast({
        title: "Error",
        description: "Failed to scrape custom URLs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
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
                Scrape Events from Major Sites
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
            <p>No events scraped yet. Select a city and click "Scrape Events" to get started.</p>
            <p className="text-xs mt-2">Supports: Eventbrite, BookMyShow, Paytm Insider, Meetup, and custom URLs</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};