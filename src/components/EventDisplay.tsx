import { EventSuggestion } from "@/hooks/useEventSuggestions";
import { EventSuggestionCard } from "./EventSuggestionCard";
import { RefreshCw, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventDisplayProps {
  events: EventSuggestion[];
  isLoading: boolean;
  onEventSelect: (event: EventSuggestion) => void;
  onRefresh: () => void;
  searchQuery: string;
  selectedCategory: string;
}

export const EventDisplay = ({ 
  events, 
  isLoading, 
  onEventSelect, 
  onRefresh,
  searchQuery,
  selectedCategory 
}: EventDisplayProps) => {
  const handleEventSave = async (event: EventSuggestion) => {
    onEventSelect(event);
  };

  const handleEventView = async (event: EventSuggestion) => {
    // Could track viewing
    console.log('Event viewed:', event.title);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Finding amazing events for you...</h3>
        <p className="text-muted-foreground">This may take a moment while we search worldwide events</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
          <Search className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No events found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We couldn't find any events matching your search. Try different keywords or refresh to discover new events.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onRefresh} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Events
          </Button>
          {(searchQuery || selectedCategory !== 'all') && (
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Clear All Filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {events.length} Event{events.length !== 1 ? 's' : ''} Found
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.map((event) => (
          <EventSuggestionCard
            key={event.id}
            event={event}
            onSaveToPlanner={handleEventSave}
            onViewDetails={handleEventView}
          />
        ))}
      </div>
    </div>
  );
};