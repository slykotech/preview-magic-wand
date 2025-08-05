import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/hooks/useLocation';
import { PlaceCard } from './PlaceCard';
import { CitySearchInput } from './CitySearchInput';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2, Search } from 'lucide-react';
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
interface SweetSuggestionsProps {
  coupleId: string;
  userId: string;
  onAddToDatePlan: (placeData: any) => void;
}
export const SweetSuggestions: React.FC<SweetSuggestionsProps> = ({
  coupleId,
  userId,
  onAddToDatePlan
}) => {
  const {
    toast
  } = useToast();
  const {
    location,
    isGettingLocation,
    getCurrentLocation,
    setManualLocation
  } = useLocation();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = [{
    value: 'all',
    label: 'All Places'
  }, {
    value: 'Cultural & Historical',
    label: 'Cultural & Historical'
  }, {
    value: 'Religious & Spiritual',
    label: 'Religious & Spiritual'
  }, {
    value: 'Entertainment',
    label: 'Entertainment'
  }, {
    value: 'Dining & Social',
    label: 'Dining & Social'
  }, {
    value: 'Nature & Outdoor',
    label: 'Nature & Outdoor'
  }, {
    value: 'Shopping & Markets',
    label: 'Shopping & Markets'
  }];

  // Auto-detect location and search on component mount
  useEffect(() => {
    if (!location && !isGettingLocation) {
      getCurrentLocation();
    }
  }, []);
  useEffect(() => {
    if (location) {
      searchPlaces();
    }
  }, [location, selectedCategory]);
  const searchPlaces = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('search-nearby-places', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          category: selectedCategory === 'all' ? undefined : selectedCategory
        }
      });
      if (error) throw error;
      if (data.success) {
        setPlaces(data.places || []);
        toast({
          title: `Found ${data.places?.length || 0} places! 📍`,
          description: `Discovered great options near ${location.displayName} ${data.source === 'database' ? '(cached)' : '(fresh)'}`
        });
      } else {
        throw new Error(data.error || 'Failed to search places');
      }
    } catch (error) {
      console.error('Error searching places:', error);
      toast({
        title: "Search failed",
        description: "Could not find places nearby. Please try again.",
        variant: "destructive"
      });
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };
  const handleLocationSet = (locationData: any) => {
    setManualLocation(locationData.name, {
      lat: locationData.lat,
      lng: locationData.lng,
      displayName: locationData.displayName || locationData.name
    });
  };
  const handleAddToDatePlan = (place: Place) => {
    const dateData = {
      title: `Visit ${place.name}`,
      description: `A great ${getCategoryFromTypes(place.types).toLowerCase()} experience`,
      category: mapPlaceTypesToDateCategory(place.types),
      location: `${place.name}, ${place.address}`,
      estimated_cost: place.priceLevel ? '$'.repeat(place.priceLevel * 15) : '',
      estimated_duration: '2 hours',
      notes: `Rating: ${place.rating}/5 ⭐${place.distance ? ` • ${place.distance}km away` : ''}`
    };
    onAddToDatePlan(dateData);
    toast({
      title: "Added to Date Plan! 💕",
      description: `${place.name} has been added to your planned dates`
    });
  };
  const getCategoryFromTypes = (types: string[]) => {
    const categoryMap: {
      [key: string]: string;
    } = {
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
  const mapPlaceTypesToDateCategory = (types: string[]) => {
    const categoryMap: {
      [key: string]: string;
    } = {
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
  return <div className="space-y-6">
      {/* Location Selection */}
      <Card>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <CitySearchInput onLocationSet={handleLocationSet} onCurrentLocation={getCurrentLocation} className="w-full" />
            </div>
            
          </div>
          
          {location && <div className="text-sm text-muted-foreground">
              📍 Searching near: {location.displayName}
            </div>}
        </CardContent>
      </Card>

      {/* Filters */}
      {location}

      {/* Results */}
      {location && <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Sweet Suggestions
              {places.length > 0 && <Badge variant="secondary" className="ml-2">
                  {places.length} found
                </Badge>}
            </h3>
          </div>

          {loading ? <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Finding amazing places nearby...</span>
            </div> : places.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {places.map(place => <PlaceCard key={place.id} place={place} onAddToDatePlan={handleAddToDatePlan} />)}
            </div> : location ? <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  No places found in this area. Try changing the category filter above.
                </p>
              </CardContent>
            </Card> : <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Please set your location to see sweet suggestions nearby! 📍
                </p>
              </CardContent>
            </Card>}
        </div>}
    </div>;
};