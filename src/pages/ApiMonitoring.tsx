import { ApiUsageMonitor } from "@/components/ApiUsageMonitor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, DollarSign, Clock, TrendingUp } from "lucide-react";

const ApiMonitoring = () => {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">API Usage Monitoring</h1>
        <p className="text-muted-foreground mt-2">
          Track your API usage and costs to optimize your event discovery experience
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Cost Control Features
            </CardTitle>
            <CardDescription>
              Built-in protections to manage your API costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  15min Cache
                </Badge>
                <span className="text-sm">Reduces duplicate requests</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Free Sources First
                </Badge>
                <span className="text-sm">Prioritizes cost-free APIs</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Smart Rate Limits
                </Badge>
                <span className="text-sm">Prevents quota overages</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <Shield className="h-3 w-3 mr-1" />
                  Daily/Monthly Caps
                </Badge>
                <span className="text-sm">Budget protection</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ApiUsageMonitor />

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>API Cost Breakdown</CardTitle>
            <CardDescription>
              Understanding the cost structure of different event sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">Free Sources</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• BookMyShow (scraping simulation)</li>
                    <li>• Facebook Events (scraping simulation)</li>
                    <li>• Meetup Events (scraping simulation)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-orange-600">Paid Sources</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Google Places: $0.017/request</li>
                    <li>• Ticketmaster: $0.025/request</li>
                    
                    <li>• SeatGeek: $0.005/request</li>
                    <li>• PredictHQ: $0.02/request</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Cost Optimization:</strong> The system prioritizes free sources first, 
                  then supplements with paid APIs only when necessary. Aggressive caching and 
                  rate limiting minimize costs while ensuring you get comprehensive event data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApiMonitoring;