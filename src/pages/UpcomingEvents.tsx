import { Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const UpcomingEvents = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Upcoming Events
        </h1>
        <p className="text-muted-foreground">
          Event discovery feature has been removed
        </p>
      </div>

      {/* Placeholder Content */}
      <Card className="p-6 text-center">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <CardTitle className="mb-2">Event Discovery Disabled</CardTitle>
        <CardDescription>
          The event discovery and external API integrations have been removed. 
          You can still plan and manage your dates using the Date Planner feature.
        </CardDescription>
      </Card>
    </div>
  );
};

export default UpcomingEvents;