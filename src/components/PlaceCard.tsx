import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Clock, DollarSign, Plus } from 'lucide-react';

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
  onAddToDatePlan: (place: Place) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, onAddToDatePlan }) => {
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
          <Button
            onClick={() => onAddToDatePlan(place)}
            size="sm"
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to Dates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};