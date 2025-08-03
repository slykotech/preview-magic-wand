import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, XCircle, Clock, Wifi, WifiOff } from 'lucide-react';

interface DataSourceInfo {
  real_time_sources: string[];
  fallback_used: boolean;
  firecrawl_status: 'available' | 'failed' | 'not_configured';
  cache_status: 'hit' | 'miss' | 'expired';
  last_updated: string;
}

interface DataSourceStatusProps {
  dataSourceInfo: DataSourceInfo | null;
  quota?: {
    daily_remaining: number;
    monthly_cost_remaining: number;
    daily_limit: number;
    monthly_limit: number;
  };
  className?: string;
}

export const DataSourceStatus = ({ dataSourceInfo, quota, className }: DataSourceStatusProps) => {
  if (!dataSourceInfo) return null;

  const getFirecrawlIcon = () => {
    switch (dataSourceInfo.firecrawl_status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'not_configured':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCacheIcon = () => {
    switch (dataSourceInfo.cache_status) {
      case 'hit':
        return <Wifi className="h-4 w-4 text-blue-500" />;
      case 'miss':
        return <WifiOff className="h-4 w-4 text-orange-500" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={`border-muted/50 ${className}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Data Source Status</h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {getCacheIcon()}
            {dataSourceInfo.cache_status}
          </div>
        </div>

        {/* Real-time Sources */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {dataSourceInfo.real_time_sources.length > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm">
              Real-time Sources ({dataSourceInfo.real_time_sources.length})
            </span>
          </div>
          
          {dataSourceInfo.real_time_sources.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dataSourceInfo.real_time_sources.map((source) => (
                <Badge key={source} variant="secondary" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Firecrawl Status */}
        <div className="flex items-center gap-2">
          {getFirecrawlIcon()}
          <span className="text-sm">
            Firecrawl: {dataSourceInfo.firecrawl_status.replace('_', ' ')}
          </span>
        </div>

        {/* Fallback Status */}
        {dataSourceInfo.fallback_used && (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-yellow-600">
              Using generated events (real-time sources unavailable)
            </span>
          </div>
        )}

        {/* Quota Information */}
        {quota && (
          <div className="pt-2 border-t border-muted/50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Daily:</span>
                <span className={`ml-1 ${quota.daily_remaining < 3 ? 'text-red-500' : 'text-green-500'}`}>
                  {quota.daily_remaining}/{quota.daily_limit}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Monthly:</span>
                <span className={`ml-1 ${quota.monthly_cost_remaining < 1 ? 'text-red-500' : 'text-green-500'}`}>
                  ${quota.monthly_cost_remaining.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground">
          Updated {formatLastUpdated(dataSourceInfo.last_updated)}
        </div>
      </CardContent>
    </Card>
  );
};