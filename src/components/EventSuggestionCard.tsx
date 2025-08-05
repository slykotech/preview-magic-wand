import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, DollarSign, ExternalLink, Heart, Plus } from "lucide-react";
import { EventSuggestion } from "@/hooks/useEventSuggestions";
import { format } from "date-fns";

interface EventSuggestionCardProps {
  event: EventSuggestion;
  onSaveToPlanner?: (event: EventSuggestion) => void;
  onViewDetails?: (event: EventSuggestion) => void;
  className?: string;
}

export const EventSuggestionCard = ({ 
  event, 
  onSaveToPlanner, 
  onViewDetails,
  className = "" 
}: EventSuggestionCardProps) => {
  const eventDate = new Date(event.event_date);
  const isToday = eventDate.toDateString() === new Date().toDateString();
  const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

  const getDateLabel = () => {
    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return format(eventDate, "MMM d");
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'entertainment': 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      'music': 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
      'food': 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
      'sports': 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      'cultural': 'bg-green-500/10 text-green-700 dark:text-green-300',
      'romantic': 'bg-red-500/10 text-red-700 dark:text-red-300'
    };
    return colors[category.toLowerCase()] || 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
  };

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${className}`}>
      {event.image_url && (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
          <img 
            src={event.image_url} 
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </CardTitle>
          <Badge className={getCategoryColor(event.category)}>
            {event.category}
          </Badge>
        </div>
        
        {event.description && (
          <CardDescription className="line-clamp-2">
            {event.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">{getDateLabel()}</span>
          </div>
          
          {event.event_time && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(`2000-01-01T${event.event_time}`), "h:mm a")}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">{event.location_name}</span>
        </div>

        {event.price_range && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span>{event.price_range}</span>
          </div>
        )}

        {event.organizer && (
          <div className="text-sm text-muted-foreground">
            by <span className="font-medium">{event.organizer}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          {onSaveToPlanner && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => onSaveToPlanner(event)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add to Planner
            </Button>
          )}
          
          {onViewDetails && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onViewDetails(event)}
            >
              <Heart className="w-4 h-4" />
            </Button>
          )}
          
          {event.source_url && (
            <Button 
              size="sm" 
              variant="outline"
              asChild
            >
              <a 
                href={event.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
          <span>via {event.source_platform}</span>
        </div>
      </CardContent>
    </Card>
  );
};