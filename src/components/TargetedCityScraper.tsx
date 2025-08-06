import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, MapPin, Calendar, Users, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface TargetCity {
  name: string;
  country: string;
  flag: string;
}

interface ScrapingResult {
  success: boolean;
  totalEvents: number;
  citiesProcessed: number;
  citiesFailed: number;
  events: Array<{
    title: string;
    city_name: string;
    source: string;
    start_date: string;
    category: string;
  }>;
  summary: string;
  error?: string;
}

const TARGET_CITIES: TargetCity[] = [
  // United States
  { name: "New York", country: "United States", flag: "🇺🇸" },
  { name: "Los Angeles", country: "United States", flag: "🇺🇸" },
  { name: "Chicago", country: "United States", flag: "🇺🇸" },
  { name: "Houston", country: "United States", flag: "🇺🇸" },
  { name: "Miami", country: "United States", flag: "🇺🇸" },
  { name: "San Francisco", country: "United States", flag: "🇺🇸" },
  { name: "Boston", country: "United States", flag: "🇺🇸" },
  { name: "Seattle", country: "United States", flag: "🇺🇸" },
  
  // United Kingdom
  { name: "London", country: "United Kingdom", flag: "🇬🇧" },
  { name: "Manchester", country: "United Kingdom", flag: "🇬🇧" },
  { name: "Birmingham", country: "United Kingdom", flag: "🇬🇧" },
  { name: "Edinburgh", country: "United Kingdom", flag: "🇬🇧" },
  { name: "Glasgow", country: "United Kingdom", flag: "🇬🇧" },
  { name: "Bristol", country: "United Kingdom", flag: "🇬🇧" },
  
  // India
  { name: "Mumbai", country: "India", flag: "🇮🇳" },
  { name: "Delhi", country: "India", flag: "🇮🇳" },
  { name: "Bangalore", country: "India", flag: "🇮🇳" },
  { name: "Hyderabad", country: "India", flag: "🇮🇳" },
  { name: "Chennai", country: "India", flag: "🇮🇳" },
  { name: "Kolkata", country: "India", flag: "🇮🇳" },
  { name: "Pune", country: "India", flag: "🇮🇳" },
  
  // Canada
  { name: "Toronto", country: "Canada", flag: "🇨🇦" },
  { name: "Vancouver", country: "Canada", flag: "🇨🇦" },
  { name: "Montreal", country: "Canada", flag: "🇨🇦" },
  { name: "Calgary", country: "Canada", flag: "🇨🇦" },
  { name: "Ottawa", country: "Canada", flag: "🇨🇦" },
  { name: "Edmonton", country: "Canada", flag: "🇨🇦" },
];

export const TargetedCityScraper: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [result, setResult] = useState<ScrapingResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleCityToggle = (cityName: string) => {
    setSelectedCities(prev => 
      prev.includes(cityName) 
        ? prev.filter(c => c !== cityName)
        : [...prev, cityName]
    );
  };

  const selectAllFromCountry = (country: string) => {
    const citiesFromCountry = TARGET_CITIES
      .filter(city => city.country === country)
      .map(city => city.name);
    
    setSelectedCities(prev => {
      const otherCities = prev.filter(cityName => 
        !TARGET_CITIES.find(c => c.name === cityName && c.country === country)
      );
      return [...otherCities, ...citiesFromCountry];
    });
  };

  const startScraping = async (forceRefresh = false) => {
    if (selectedCities.length === 0) {
      toast({
        title: "No cities selected",
        description: "Please select at least one city to scrape events from.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      const { data, error } = await supabase.functions.invoke('scrape-targeted-cities', {
        body: {
          cities: selectedCities,
          forceRefresh
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setResult(data);
      
      toast({
        title: "Scraping completed!",
        description: data.success 
          ? `Found ${data.totalEvents} events from ${data.citiesProcessed} cities`
          : "Scraping failed - check the results below",
        variant: data.success ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Scraping error:', error);
      setResult({
        success: false,
        totalEvents: 0,
        citiesProcessed: 0,
        citiesFailed: selectedCities.length,
        events: [],
        summary: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      toast({
        title: "Scraping failed",
        description: "An error occurred while scraping events. Check the console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const groupedCities = TARGET_CITIES.reduce((acc, city) => {
    if (!acc[city.country]) {
      acc[city.country] = [];
    }
    acc[city.country].push(city);
    return acc;
  }, {} as Record<string, TargetCity[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Targeted City Event Scraper
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Scrape events from major cities across US, UK, India, and Canada
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Country Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Select Cities by Country</h3>
            {Object.entries(groupedCities).map(([country, cities]) => (
              <div key={country} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    {cities[0].flag} {country}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllFromCountry(country)}
                  >
                    Select All ({cities.length})
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {cities.map(city => (
                    <Button
                      key={city.name}
                      variant={selectedCities.includes(city.name) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCityToggle(city.name)}
                      className="justify-start"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      {city.name}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Selected Cities Summary */}
          {selectedCities.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">
                Selected Cities ({selectedCities.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedCities.map(cityName => {
                  const city = TARGET_CITIES.find(c => c.name === cityName);
                  return (
                    <Badge key={cityName} variant="secondary" className="text-xs">
                      {city?.flag} {cityName}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Scraping events...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => startScraping(false)}
              disabled={isLoading || selectedCities.length === 0}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Start Scraping
                </>
              )}
            </Button>
            <Button
              onClick={() => startScraping(true)}
              disabled={isLoading || selectedCities.length === 0}
              variant="outline"
            >
              Force Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Scraping Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.totalEvents}</div>
                    <div className="text-sm text-muted-foreground">Total Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.citiesProcessed}</div>
                    <div className="text-sm text-muted-foreground">Cities Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{result.citiesFailed}</div>
                    <div className="text-sm text-muted-foreground">Cities Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{result.events.length}</div>
                    <div className="text-sm text-muted-foreground">Sample Events</div>
                  </div>
                </div>

                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {result.summary}
                  </p>
                </div>

                {/* Sample Events */}
                {result.events.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Sample Events:</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {result.events.map((event, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{event.title}</h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {event.city_name}
                                <Calendar className="h-3 w-3" />
                                {new Date(event.start_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">
                                {event.source}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {event.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {result.error || 'Scraping failed for unknown reasons'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};