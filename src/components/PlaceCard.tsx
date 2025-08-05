import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Star, Clock, DollarSign, Plus, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Place {
  id: string;
  name: string;
  address: string;
  rating: number;
  priceLevel?: number;
  latitude: number;
  longitude: number;
  types: string[];
  photoReference?: string;
  isOpen?: boolean;
  distance: number;
}

interface PlaceCardProps {
  place: Place;
  onAddToDatePlan: (placeData: any) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, onAddToDatePlan }) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const timeOptions = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00'
  ];
  const getPriceLevelText = (level?: number) => {
    if (!level) return 'Unknown';
    return '$'.repeat(level);
  };

  const getCategoryFromTypes = (types: string[]) => {
    const categoryMap: { [key: string]: string } = {
      'restaurant': 'Dining',
      'food': 'Food',
      'bar': 'Nightlife',
      'cafe': 'Cafe',
      'tourist_attraction': 'Attraction',
      'museum': 'Culture',
      'park': 'Outdoor',
      'shopping_mall': 'Shopping',
      'movie_theater': 'Entertainment',
      'amusement_park': 'Entertainment',
      'spa': 'Relaxation',
      'gym': 'Sports'
    };

    for (const type of types) {
      if (categoryMap[type]) {
        return categoryMap[type];
      }
    }
    return 'Other';
  };

  const getPhotoUrl = (photoReference?: string) => {
    if (!photoReference) return '/placeholder.svg';
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`;
  };

  const handleGetDirections = () => {
    const address = encodeURIComponent(place.address || place.name);
    const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
    window.open(url, '_blank');
  };

  const handleAddToDate = () => {
    if (!selectedDate || !selectedTime) return;
    
    const dateData = {
      title: `Visit ${place.name}`,
      description: `A great ${getCategoryFromTypes(place.types).toLowerCase()} experience`,
      category: mapPlaceTypesToDateCategory(place.types),
      location: `${place.name}, ${place.address}`,
      estimated_cost: place.priceLevel ? '$'.repeat(place.priceLevel * 15) : '',
      estimated_duration: '2 hours',
      notes: `Rating: ${place.rating}/5 ⭐${place.distance ? ` • ${place.distance}km away` : ''}`,
      scheduled_date: selectedDate,
      scheduled_time: selectedTime
    };
    
    onAddToDatePlan(dateData);
    setIsDialogOpen(false);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
  };

  const mapPlaceTypesToDateCategory = (types: string[]) => {
    const categoryMap: { [key: string]: string } = {
      'restaurant': 'food',
      'food': 'food',
      'bar': 'entertainment',
      'cafe': 'food',
      'tourist_attraction': 'cultural',
      'museum': 'cultural',
      'park': 'outdoor',
      'shopping_mall': 'entertainment',
      'movie_theater': 'entertainment',
      'amusement_park': 'entertainment',
      'spa': 'relaxation',
      'gym': 'sports'
    };
    
    for (const type of types) {
      if (categoryMap[type]) {
        return categoryMap[type];
      }
    }
    return 'romantic';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <div>
          <CardTitle className="text-lg font-semibold line-clamp-2">{place.name}</CardTitle>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="line-clamp-2">{place.address}</p>
            <p className="font-medium">{place.distance}km away</p>
          </div>
        </div>

        {/* Rating */}
        {place.rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{place.rating} rating</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleGetDirections}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <MapPin className="h-4 w-4 mr-1" />
            Get Directions
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1">
                <Plus className="h-4 w-4 mr-1" />
                Add to Dates
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Visit to {place.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Date Picker */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Picker */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Time</label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a time" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border max-h-[200px]">
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddToDate}
                    disabled={!selectedDate || !selectedTime}
                    className="flex-1"
                  >
                    Add to Dates
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};