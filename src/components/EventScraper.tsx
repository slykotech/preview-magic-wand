import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FirecrawlService } from '@/utils/FirecrawlService';
import { Globe, Calendar, MapPin, DollarSign, ExternalLink } from 'lucide-react';

interface ScrapedEvent {
  title: string;
  date?: string;
  location?: string;
  price?: string;
  description?: string;
  category?: string;
  url?: string;
}

const EVENT_SITES = [
  'https://www.eventbrite.com/d/india--mumbai/events/',
  'https://in.bookmyshow.com/explore/events-mumbai',
  'https://paytminsider.com/events/mumbai',
  'https://www.meetup.com/find/?location=mumbai--in',
];

export const EventScraper = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(!!FirecrawlService.getApiKey());
  const [customUrl, setCustomUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapedEvents, setScrapedEvents] = useState<ScrapedEvent[]>([]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Firecrawl API key",
        variant: "destructive",
      });
      return;
    }

    try {
      const isValid = await FirecrawlService.testApiKey(apiKey);
      if (isValid) {
        FirecrawlService.saveApiKey(apiKey);
        setIsApiKeySet(true);
        toast({
          title: "Success",
          description: "API key saved and validated successfully",
        });
      } else {
        toast({
          title: "Error", 
          description: "Invalid API key. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate API key",
        variant: "destructive",
      });
    }
  };

  const handleScrapeEventSites = async () => {
    setIsLoading(true);
    setProgress(0);
    setScrapedEvents([]);

    try {
      const result = await FirecrawlService.scrapeEventSites(EVENT_SITES);
      
      if (result.success && result.data) {
        const allEvents: ScrapedEvent[] = [];
        
        result.data.forEach((siteResult: any) => {
          if (siteResult.success && siteResult.data) {
            // Extract events from the scraped data
            try {
              const events = Array.isArray(siteResult.data) ? siteResult.data : [siteResult.data];
              allEvents.push(...events);
            } catch (error) {
              console.error('Error parsing events from site:', siteResult.url, error);
            }
          }
        });

        setScrapedEvents(allEvents);
        
        toast({
          title: "Success",
          description: `Scraped ${allEvents.length} events from event sites`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to scrape event sites",
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

  const handleScrapeCustomUrl = async () => {
    if (!customUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a URL to scrape",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const result = await FirecrawlService.scrapeEventSites([customUrl]);
      
      if (result.success && result.data) {
        const events = result.data[0]?.data || [];
        setScrapedEvents(Array.isArray(events) ? events : [events]);
        
        toast({
          title: "Success",
          description: `Scraped events from ${customUrl}`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to scrape URL",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error scraping custom URL:', error);
      toast({
        title: "Error",
        description: "Failed to scrape URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  if (!isApiKeySet) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Setup Firecrawl
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your Firecrawl API key to start scraping events from websites.
          </p>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Firecrawl API Key"
          />
          <Button onClick={handleSaveApiKey} className="w-full">
            Save API Key
          </Button>
          <p className="text-xs text-muted-foreground">
            Get your API key from{' '}
            <a 
              href="https://firecrawl.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              firecrawl.dev
            </a>
          </p>
        </CardContent>
      </Card>
    );
  }

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
            <Button 
              onClick={handleScrapeEventSites}
              disabled={isLoading}
              className="h-12"
            >
              {isLoading ? "Scraping..." : "Scrape Major Event Sites"}
            </Button>
            
            <div className="flex gap-2">
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Enter custom URL to scrape"
                className="flex-1"
              />
              <Button 
                onClick={handleScrapeCustomUrl}
                disabled={isLoading || !customUrl.trim()}
                variant="outline"
              >
                Scrape
              </Button>
            </div>
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
            <p>No events scraped yet. Click "Scrape Major Event Sites" to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};