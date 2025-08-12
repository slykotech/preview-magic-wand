import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Database, Globe, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GradientHeader } from "@/components/GradientHeader";

interface Event {
  id: string;
  title: string;
  source: string;
  ai_generated: boolean;
  created_at: string;
  city_name?: string;
  start_date: string;
  location_name?: string;
  price?: string;
  category?: string;
}

export default function EventMonitoring() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState<string>('');

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, source, ai_generated, created_at, city_name, start_date, location_name, price, category')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error fetching events",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testGooglePlaces = async () => {
    setIsLoading(true);
    setScrapingStatus('Testing Google Places API...');
    
    try {
      const { data, error } = await supabase.functions.invoke('test-google-places', {
        body: {}
      });
      
      if (error) {
        setScrapingStatus(`Google Places test failed: ${error.message}`);
        toast({
          title: "Test Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (data?.success) {
        setScrapingStatus(`Google Places test successful! API is working`);
        toast({
          title: "Test Successful",
          description: "Google Places API is configured correctly",
        });
      } else {
        setScrapingStatus('Google Places test completed with issues');
        toast({
          title: "Test Issues",
          description: "Google Places API may have configuration issues",
        });
      }
    } catch (error) {
      console.error('Google Places test error:', error);
      setScrapingStatus(`Google Places test error: ${error}`);
      toast({
        title: "Test Error",
        description: "Failed to test Google Places API",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const realEvents = events.filter(e => !e.ai_generated);
  const aiEvents = events.filter(e => e.ai_generated);
  
  const eventsBySource = events.reduce((acc, event) => {
    const source = event.source || 'unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <GradientHeader 
        title="Event Monitoring"
        subtitle="Monitor scraped events and data sources"
        icon={<Database className="w-6 h-6" />}
      />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{events.length}</p>
                </div>
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Real Events</p>
                  <p className="text-2xl font-bold">{realEvents.length}</p>
                </div>
                <Globe className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Events</p>
                  <p className="text-2xl font-bold">{aiEvents.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sources</p>
                  <p className="text-2xl font-bold">{Object.keys(eventsBySource).length}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={fetchEvents}
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Events
          </Button>
          
          <Button
            onClick={testGooglePlaces}
            disabled={isLoading}
          >
            <Globe className="h-4 w-4 mr-2" />
            Test Google Places API
          </Button>
        </div>

        {scrapingStatus && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm">{scrapingStatus}</p>
            </CardContent>
          </Card>
        )}

        {/* Sources Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Events by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eventsBySource).map(([source, count]) => (
                <Badge 
                  key={source} 
                  variant={source === 'ai_generated' ? 'destructive' : 'default'}
                  className="text-xs"
                >
                  {source}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading events...</span>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-3">
                {events.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <Badge 
                          variant={event.ai_generated ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {event.source}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>City: {event.city_name || 'Unknown'}</p>
                        <p>Location: {event.location_name || 'Not specified'}</p>
                        <p>Price: {event.price || 'Not specified'}</p>
                        <p>Category: {event.category || 'Not specified'}</p>
                        <p>Created: {new Date(event.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No events found. Try testing the scraper first.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}