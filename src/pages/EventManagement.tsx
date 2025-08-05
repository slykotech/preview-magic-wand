import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GradientHeader } from "@/components/GradientHeader";
import { EventScrapingManager } from "@/components/EventScrapingManager";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Database,
  Settings,
  ArrowLeft,
  Trash2,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const EventManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(false);
  const [eventStats, setEventStats] = useState<{
    total: number;
    byPlatform: Record<string, number>;
    byCountry: Record<string, number>;
  } | null>(null);

  const loadEventStats = async () => {
    try {
      // Get total events count
      const { count: totalCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      // Get events by platform
      const { data: platformData } = await supabase
        .from('events')
        .select('source_platform')
        .not('source_platform', 'is', null);

      // Get events by country  
      const { data: countryData } = await supabase
        .from('events')
        .select('country')
        .not('country', 'is', null);

      const byPlatform = platformData?.reduce((acc, item) => {
        acc[item.source_platform] = (acc[item.source_platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const byCountry = countryData?.reduce((acc, item) => {
        acc[item.country] = (acc[item.country] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setEventStats({
        total: totalCount || 0,
        byPlatform,
        byCountry
      });
    } catch (error) {
      console.error('Error loading event stats:', error);
    }
  };

  const clearAllEvents = async () => {
    if (!confirm('Are you sure you want to delete ALL events? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all events

      if (error) throw error;

      toast({
        title: "Events cleared",
        description: "All events have been removed from the database",
      });

      await loadEventStats();
    } catch (error: any) {
      toast({
        title: "Failed to clear events",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <GradientHeader
        title="Event Management"
        subtitle="Configure event data sources and populate the database"
        icon={<Database size={24} />}
        backRoute="/dashboard"
      />

      <div className="p-6 space-y-6">
        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={20} />
                Database Overview
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadEventStats}
                className="flex items-center gap-1"
              >
                <RefreshCw size={14} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {eventStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{eventStats.total}</div>
                    <div className="text-sm text-blue-800">Total Events</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.keys(eventStats.byCountry).length}
                    </div>
                    <div className="text-sm text-green-800">Countries</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Object.keys(eventStats.byPlatform).length}
                    </div>
                    <div className="text-sm text-purple-800">Sources</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">By Platform:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(eventStats.byPlatform).map(([platform, count]) => (
                        <Badge key={platform} variant="secondary">
                          {platform}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">By Country:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(eventStats.byCountry).map(([country, count]) => (
                        <Badge key={country} variant="outline">
                          {country}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={clearAllEvents}
                    disabled={isClearing}
                    className="flex items-center gap-2"
                  >
                    {isClearing ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Clear All Events
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Button onClick={loadEventStats} variant="outline">
                  Load Statistics
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="populate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="populate" className="flex items-center gap-2">
              <Database size={16} />
              Populate Events
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings size={16} />
              API Configuration
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="populate" className="space-y-6">
            <EventScrapingManager />
          </TabsContent>
          
          <TabsContent value="config" className="space-y-6">
            <ApiKeyManager />
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation />
    </div>
  );
};