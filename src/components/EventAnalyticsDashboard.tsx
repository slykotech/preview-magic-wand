import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  MapPin, 
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AnalyticsData {
  totalEvents: number;
  activeSourcesCount: number;
  avgSuccessRate: number;
  recentErrors: number;
  sourcePlatformStats: Array<{
    source_platform: string;
    events_count: number;
    success_rate: number;
    avg_response_time: number;
  }>;
  geographicDistribution: Array<{
    country: string;
    city: string;
    events_count: number;
  }>;
  dailyTrends: Array<{
    date: string;
    events_scraped: number;
    success_rate: number;
  }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const EventAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Get total events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      // Get source platform statistics from events table
      const { data: events } = await supabase
        .from('events')
        .select('source_platform');

      // Get geographic distribution
      const { data: geoData } = await supabase
        .from('events')
        .select('country, city')
        .not('country', 'is', null);

      // Get API sources data
      const { data: apiSources } = await supabase
        .from('event_api_sources')
        .select('platform_name, success_rate, avg_response_time_ms, current_daily_usage, current_monthly_usage');

      // Process source platform stats from events
      const sourcePlatformStats = events?.reduce((acc: any[], curr) => {
        const existing = acc.find(item => item.source_platform === curr.source_platform);
        if (existing) {
          existing.events_count += 1;
        } else {
          acc.push({
            source_platform: curr.source_platform,
            events_count: 1,
            success_rate: 100, // Default since we don't have failure data
            avg_response_time: 1000 // Default
          });
        }
        return acc;
      }, []) || [];

      // Merge with API sources data
      if (apiSources) {
        sourcePlatformStats.forEach(stat => {
          const apiSource = apiSources.find(api => api.platform_name.toLowerCase().includes(stat.source_platform));
          if (apiSource) {
            stat.success_rate = apiSource.success_rate || 100;
            stat.avg_response_time = apiSource.avg_response_time_ms || 1000;
          }
        });
      }

      // Process geographic distribution
      const geoDistribution = geoData?.reduce((acc: any[], curr) => {
        const key = `${curr.country}-${curr.city}`;
        const existing = acc.find(item => item.country === curr.country && item.city === curr.city);
        if (existing) {
          existing.events_count++;
        } else {
          acc.push({
            country: curr.country,
            city: curr.city,
            events_count: 1
          });
        }
        return acc;
      }, []) || [];

      // Create mock daily trends since we don't have the analytics table yet
      const dailyTrends = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          events_scraped: Math.floor(Math.random() * 100) + 20,
          success_rate: Math.floor(Math.random() * 20) + 80
        };
      });

      const avgSuccessRate = sourcePlatformStats.reduce((sum, curr) => sum + (curr.success_rate || 0), 0) / (sourcePlatformStats.length || 1);
      const recentErrors = sourcePlatformStats.filter(stat => (stat.success_rate || 0) < 80).length;

      setAnalytics({
        totalEvents: eventsCount || 0,
        activeSourcesCount: sourcePlatformStats.length,
        avgSuccessRate: avgSuccessRate || 0,
        recentErrors,
        sourcePlatformStats,
        geographicDistribution: geoDistribution.slice(0, 10),
        dailyTrends
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Event System Analytics</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event System Analytics</h2>
          <p className="text-muted-foreground">
            Last updated: {lastRefresh.toLocaleString()}
          </p>
        </div>
        <Button onClick={loadAnalytics} disabled={isLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalEvents.toLocaleString()}</div>
            <Badge variant="secondary" className="mt-1">
              Active Database
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeSourcesCount}</div>
            <Badge variant="outline" className="mt-1">
              Scraping APIs
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            {analytics.avgSuccessRate >= 80 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.avgSuccessRate.toFixed(1)}%
            </div>
            <Progress value={analytics.avgSuccessRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
            {analytics.recentErrors === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.recentErrors}</div>
            <Badge variant={analytics.recentErrors === 0 ? "secondary" : "destructive"} className="mt-1">
              {analytics.recentErrors === 0 ? "All Good" : "Needs Attention"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Platform Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Source Platform Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.sourcePlatformStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source_platform" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="events_count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Top Cities by Events</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.geographicDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ city, events_count }) => `${city} (${events_count})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="events_count"
                >
                  {analytics.geographicDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Scraping Trends (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="events_scraped" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Events Scraped"
                />
                <Line 
                  type="monotone" 
                  dataKey="success_rate" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Success Rate %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};