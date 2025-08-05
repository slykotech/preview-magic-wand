import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, DollarSign, ExternalLink, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  price?: string;
  organizer?: string;
  category?: string;
  website_url?: string;
  image_url?: string;
  source: string;
  distance_km?: number;
}

interface EventCardProps {
  event: Event;
  onSave?: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSave }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveEvent = useCallback(async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(event);
      toast({
        title: "Event saved!",
        description: `${event.title} has been saved to your list.`,
      });
    } catch (error) {
      toast({
        title: "Error saving event",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [event, onSave, toast]);

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isTomorrow = format(date, 'yyyy-MM-dd') === format(new Date(Date.now() + 24*60*60*1000), 'yyyy-MM-dd');
    
    if (isToday) return `Today at ${format(date, 'h:mm a')}`;
    if (isTomorrow) return `Tomorrow at ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, yyyy h:mm a');
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'eventbrite': return 'bg-orange-100 text-orange-800';
      case 'meetup': return 'bg-red-100 text-red-800';
      case 'webscraping': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {event.image_url && (
        <div className="h-48 bg-muted overflow-hidden">
          <img 
            src={event.image_url} 
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
          <div className="flex gap-1 flex-shrink-0">
            <Badge variant="secondary" className={getSourceColor(event.source)}>
              {event.source}
            </Badge>
            {onSave && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveEvent}
                disabled={isSaving}
                className="p-1 h-auto"
              >
                <Heart className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatEventDate(event.start_date)}</span>
        </div>

        {event.location_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{event.location_name}</span>
            {event.distance_km && (
              <span className="text-xs">({event.distance_km.toFixed(1)} km away)</span>
            )}
          </div>
        )}

        {event.price && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>{event.price}</span>
          </div>
        )}

        {event.organizer && (
          <div className="text-sm text-muted-foreground">
            by {event.organizer}
          </div>
        )}

        {event.category && (
          <Badge variant="outline" className="w-fit">
            {event.category}
          </Badge>
        )}

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}

        {event.website_url && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full"
          >
            <a 
              href={event.website_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Event
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};