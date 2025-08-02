import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, DollarSign, Clock, TrendingUp } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ApiUsageData {
  daily_used: number;
  daily_limit: number;
  monthly_used: number;
  monthly_limit: number;
  daily_remaining: number;
  monthly_cost_remaining: number;
}

interface UsageLogEntry {
  api_source: string;
  cost_estimate: number;
  success: boolean;
  created_at: string;
  execution_time_ms: number;
}

export const ApiUsageMonitor = () => {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState<ApiUsageData | null>(null);
  const [recentUsage, setRecentUsage] = useState<UsageLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUsageData = async () => {
      try {
        // Fetch current quota status
        const { data: quotaData } = await supabase.rpc('check_user_quota', {
          p_user_id: user.id,
          p_estimated_cost: 0
        });

        if (quotaData) {
          setUsageData(quotaData as unknown as ApiUsageData);
        }

        // Fetch recent usage logs
        const { data: logsData } = await supabase
          .from('api_usage_logs')
          .select('api_source, cost_estimate, success, created_at, execution_time_ms')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (logsData) {
          setRecentUsage(logsData);
        }
      } catch (error) {
        console.error('Error fetching usage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
  }, [user]);

  if (!user) return null;
  if (loading) return <div className="text-center">Loading usage data...</div>;

  const dailyProgress = usageData ? (usageData.daily_used / usageData.daily_limit) * 100 : 0;
  const monthlyProgress = usageData ? (usageData.monthly_used / usageData.monthly_limit) * 100 : 0;

  const isNearDailyLimit = dailyProgress > 80;
  const isNearMonthlyLimit = monthlyProgress > 80;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData?.daily_used || 0} / {usageData?.daily_limit || 10}
            </div>
            <Progress value={dailyProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {usageData?.daily_remaining || 0} requests remaining today
            </p>
            {isNearDailyLimit && (
              <Badge variant="destructive" className="mt-2">
                Near limit
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Monthly Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(usageData?.monthly_used || 0).toFixed(2)} / ${(usageData?.monthly_limit || 5).toFixed(2)}
            </div>
            <Progress value={monthlyProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              ${(usageData?.monthly_cost_remaining || 0).toFixed(2)} remaining this month
            </p>
            {isNearMonthlyLimit && (
              <Badge variant="destructive" className="mt-2">
                Near limit
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {(isNearDailyLimit || isNearMonthlyLimit) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You're approaching your API usage limits. Consider upgrading your plan or optimizing your requests.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent API Usage
          </CardTitle>
          <CardDescription>
            Your last 10 API requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentUsage.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent API usage</p>
            ) : (
              recentUsage.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.success ? "default" : "destructive"}>
                      {entry.api_source}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      ${entry.cost_estimate.toFixed(4)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.execution_time_ms}ms
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};