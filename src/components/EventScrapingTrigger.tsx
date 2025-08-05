import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Database, MapPin } from 'lucide-react';

interface ScrapingStatus {
  isRunning: boolean;
  message: string;
  citiesProcessed?: number;
  totalCities?: number;
}

export const EventScrapingTrigger = () => {
  const { toast } = useToast();
  const [scrapingStatus, setScrapingStatus] = useState<ScrapingStatus>({
    isRunning: false,
    message: 'Ready to scrape India events'
  });

  const triggerAllScrapers = async () => {
    setScrapingStatus({
      isRunning: true,
      message: 'Starting comprehensive scraping for all India cities...'
    });

    try {
      console.log('🚀 Triggering comprehensive India event scraping...');

      const { data, error } = await supabase.functions.invoke('trigger-all-scrapers', {
        body: { trigger: 'manual' }
      });

      if (error) {
        throw error;
      }

      console.log('Scraping trigger response:', data);

      setScrapingStatus({
        isRunning: false,
        message: `✅ Scraping initiated for ${data.cities?.length || 7} cities. Check logs for progress.`
      });

      toast({
        title: "Event Scraping Started! 🎯",
        description: `Scraping events for ${data.cities?.length || 7} Indian cities including Hyderabad. Events will appear as scraping completes.`,
      });

      // Auto-refresh events in a few seconds
      setTimeout(() => {
        window.location.reload();
      }, 5000);

    } catch (error) {
      console.error('Error triggering scrapers:', error);
      
      setScrapingStatus({
        isRunning: false,
        message: `❌ Error: ${error.message}`
      });

      toast({
        title: "Scraping Failed",
        description: `Failed to start scraping: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Event Database Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Populate the database with events from:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>🏙️ <strong>India Events</strong> (Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad, Pune)</li>
            <li>📍 <strong>Google Places</strong> (Local venues & businesses)</li>
            <li>🎫 <strong>Ticketmaster</strong> (International events)</li>
            <li>🎪 <strong>Eventbrite</strong> (Community events)</li>
          </ul>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4" />
            <span className="font-medium">Status:</span>
          </div>
          <p className="text-sm mt-1">{scrapingStatus.message}</p>
        </div>

        <Button 
          onClick={triggerAllScrapers}
          disabled={scrapingStatus.isRunning}
          className="w-full"
        >
          {scrapingStatus.isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Scraping in Progress...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Populate Event Database
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>⏱️ This process may take 2-3 minutes to complete.</p>
          <p>📊 Events will appear automatically as scraping finishes.</p>
        </div>
      </CardContent>
    </Card>
  );
};