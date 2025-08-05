import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Globe, 
  Download, 
  MapPin, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";

interface ScrapingResult {
  region: string;
  city: string;
  success: boolean;
  eventsCollected?: number;
  breakdown?: {
    eventbrite: number;
    ticketmaster: number;
    mock: number;
  };
  error?: string;
}

interface ScrapingSummary {
  regionsProcessed: number;
  citiesProcessed: number;
  totalEventsCollected: number;
  averageEventsPerCity: number;
}

export const EventScrapingManager = () => {
  const { toast } = useToast();
  const [isPopulating, setIsPopulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string>("");
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [summary, setSummary] = useState<ScrapingSummary | null>(null);

  const populateGlobalEvents = async (regions: string = 'all', maxCitiesPerRegion: number = 3) => {
    setIsPopulating(true);
    setProgress(0);
    setCurrentOperation("Initializing global event population...");
    setResults([]);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('populate-global-events', {
        body: {
          regions,
          maxCitiesPerRegion
        }
      });

      if (error) throw error;

      if (data.success) {
        setResults(data.results || []);
        setSummary(data.summary);
        setProgress(100);
        setCurrentOperation("Population completed successfully!");
        
        toast({
          title: "✅ Global Events Populated!",
          description: `Added ${data.summary.totalEventsCollected} events across ${data.summary.citiesProcessed} cities`,
        });
      } else {
        throw new Error(data.error || 'Population failed');
      }
    } catch (error: any) {
      console.error('Error populating global events:', error);
      setCurrentOperation("Population failed");
      toast({
        title: "Failed to populate events",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsPopulating(false);
    }
  };

  const populateSpecificRegion = async (region: string) => {
    setCurrentOperation(`Populating events for ${region}...`);
    await populateGlobalEvents(region, 5);
  };

  const getStatusIcon = (result: ScrapingResult) => {
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getResultColor = (result: ScrapingResult) => {
    if (result.success) {
      if ((result.eventsCollected || 0) > 10) return "bg-green-50 border-green-200";
      if ((result.eventsCollected || 0) > 5) return "bg-yellow-50 border-yellow-200";
      return "bg-blue-50 border-blue-200";
    }
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={20} />
            Event Data Population Manager
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Populate the events database with real data from various global cities using Eventbrite, Ticketmaster, and other sources.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={() => populateGlobalEvents('all', 2)}
              disabled={isPopulating}
              className="flex items-center gap-2"
            >
              {isPopulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={16} />}
              Populate All Regions
            </Button>
            
            <Button
              variant="outline"
              onClick={() => populateSpecificRegion('India')}
              disabled={isPopulating}
              className="flex items-center gap-2"
            >
              <MapPin size={16} />
              Populate India
            </Button>
            
            <Button
              variant="outline"
              onClick={() => populateSpecificRegion('United States')}
              disabled={isPopulating}
              className="flex items-center gap-2"
            >
              <MapPin size={16} />
              Populate USA
            </Button>
            
            <Button
              variant="outline"
              onClick={() => populateSpecificRegion('United Kingdom')}
              disabled={isPopulating}
              className="flex items-center gap-2"
            >
              <MapPin size={16} />
              Populate UK
            </Button>
          </div>

          {/* Progress Section */}
          {isPopulating && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={16} />
                {currentOperation}
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                This process may take several minutes as we fetch data from multiple API sources...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              Population Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{summary.regionsProcessed}</div>
                <div className="text-sm text-muted-foreground">Regions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.citiesProcessed}</div>
                <div className="text-sm text-muted-foreground">Cities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.totalEventsCollected}</div>
                <div className="text-sm text-muted-foreground">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.averageEventsPerCity}</div>
                <div className="text-sm text-muted-foreground">Avg/City</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Population Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${getResultColor(result)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result)}
                      <div>
                        <div className="font-medium">{result.city}</div>
                        <div className="text-sm text-muted-foreground">{result.region}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <>
                          <Badge variant="outline">
                            {result.eventsCollected} events
                          </Badge>
                          {result.breakdown && (
                            <div className="flex gap-1">
                              {result.breakdown.eventbrite > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  EB: {result.breakdown.eventbrite}
                                </Badge>
                              )}
                              {result.breakdown.ticketmaster > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  TM: {result.breakdown.ticketmaster}
                                </Badge>
                              )}
                              {result.breakdown.mock > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Mock: {result.breakdown.mock}
                                </Badge>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <Badge variant="destructive">
                          Failed: {result.error}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">About Event Population</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• This tool fetches real events from Eventbrite, Ticketmaster, and other sources</p>
                <p>• Events are populated for major cities to ensure global coverage</p>
                <p>• The process includes duplicate detection to avoid storing the same event twice</p>
                <p>• Mock events are generated to fill gaps where real events are sparse</p>
                <p>• API rate limits are respected with delays between requests</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};