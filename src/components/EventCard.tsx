import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, DollarSign, ExternalLink, Navigation, Calendar } from 'lucide-react';
import { EventSuggestion } from '@/hooks/useEventSuggestions';

interface EventCardProps {
  event: EventSuggestion;
  onSaveToPlanner: (event: EventSuggestion) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSaveToPlanner }) => {
  const handleBookNow = () => {
    if (event.booking_url) {
      window.open(event.booking_url, '_blank');
    }
  };

  const handleGetDirections = () => {
    if (event.location_lat && event.location_lng) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${event.location_lat},${event.location_lng}`;
      window.open(mapsUrl, '_blank');
    } else if (event.venue) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      music: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      food: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      art: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      comedy: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      dance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      theater: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      outdoor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      romantic: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
      sports: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      educational: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    };
    
    return colors[category || 'other'] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-semibold line-clamp-2 flex-1">
            {event.title}
          </CardTitle>
          {event.distance_km !== undefined && event.distance_km < 999 && (
            <Badge variant="outline" className="shrink-0">
              {event.distance_km.toFixed(1)} km
            </Badge>
          )}
        </div>
        
        {event.category && (
          <Badge className={`w-fit ${getCategoryColor(event.category)}`}>
            {event.category}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {event.description}
          </p>
        )}

        <div className="space-y-2 text-sm">
          {event.venue && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1">{event.venue}</span>
            </div>
          )}

          {event.event_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{formatDate(event.event_date)}</span>
              {event.event_time && <span>at {event.event_time}</span>}
            </div>
          )}

          {event.price && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4 shrink-0" />
              <span>{event.price}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {event.booking_url && (
            <Button
              size="sm"
              onClick={handleBookNow}
              className="flex-1 min-w-[100px]"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Book Now
            </Button>
          )}

          {(event.location_lat && event.location_lng) || event.venue ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGetDirections}
              className="flex-1 min-w-[100px]"
            >
              <Navigation className="h-4 w-4 mr-1" />
              Directions
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSaveToPlanner(event)}
            className="flex-1 min-w-[120px]"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Save to Planner
          </Button>
        </div>

        {event.source && (
          <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Source: {event.source}
          </div>
        )}
      </CardContent>
    </Card>
  );
};