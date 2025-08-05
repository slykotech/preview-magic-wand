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

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-1">{place.name}</CardTitle>
          <Button
            onClick={() => onAddToDatePlan(place)}
            size="sm"
            className="ml-2 shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Image */}
        {place.photoReference && (
          <div className="w-full h-32 rounded-md overflow-hidden bg-muted">
            <img
              src={getPhotoUrl(place.photoReference)}
              alt={place.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          </div>
        )}

        {/* Address and Distance */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="line-clamp-2">{place.address}</p>
            <p className="font-medium">{place.distance}km away</p>
          </div>
        </div>

        {/* Rating and Price */}
        <div className="flex items-center gap-4 text-sm">
          {place.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{place.rating}</span>
            </div>
          )}
          
          {place.priceLevel && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium">{getPriceLevelText(place.priceLevel)}</span>
            </div>
          )}

          {place.isOpen !== undefined && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className={`text-sm font-medium ${place.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                {place.isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          )}
        </div>

        {/* Category Badge */}
        <div>
          <Badge variant="secondary">
            {getCategoryFromTypes(place.types)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};