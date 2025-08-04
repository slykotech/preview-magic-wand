import { useState } from 'react';
import { Search, MapPin, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EnhancedLocationData } from '@/hooks/useEnhancedLocation';

interface EnhancedEventSearchProps {
  onLocationSearch: (cityName: string, country?: string) => void;
  onNearbySearch: (radius: number) => void;
  currentLocation: EnhancedLocationData | null;
  isLoading: boolean;
}

const POPULAR_CITIES = {
  'India': ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Gurgaon', 'Noida'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Newcastle', 'Sheffield'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'Gold Coast', 'Newcastle'],
  'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City'],
  'Germany': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund'],
  'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier']
};

const SEARCH_RADIUS_OPTIONS = [
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: 200, label: '200 km' },
  { value: 500, label: '500 km' }
];

export const EnhancedEventSearch = ({ 
  onLocationSearch, 
  onNearbySearch, 
  currentLocation, 
  isLoading 
}: EnhancedEventSearchProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('India');
  const [searchRadius, setSearchRadius] = useState(25);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    if (searchInput.trim()) {
      onLocationSearch(searchInput.trim(), selectedCountry);
      setSearchInput('');
    }
  };

  const handlePopularCityClick = (city: string) => {
    onLocationSearch(city, selectedCountry);
  };

  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius);
    if (currentLocation && currentLocation.latitude !== 0) {
      onNearbySearch(radius);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-card/50 rounded-lg backdrop-blur-sm">
      {/* Location Status */}
      {currentLocation && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Current: {currentLocation.displayName}</span>
          {currentLocation.searchRadius && (
            <Badge variant="secondary" className="text-xs">
              {currentLocation.searchRadius}km radius
            </Badge>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for a city..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(POPULAR_CITIES).map(country => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} disabled={!searchInput.trim() || isLoading}>
          Search
        </Button>
      </div>

      {/* Filters Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs"
        >
          <Filter className="h-3 w-3 mr-1" />
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>

        {/* Radius Selector for Current Location */}
        {currentLocation && currentLocation.latitude !== 0 && (
          <Select value={searchRadius.toString()} onValueChange={(value) => handleRadiusChange(parseInt(value))}>
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_RADIUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          <div>
            <h4 className="text-sm font-medium mb-2">Popular Cities in {selectedCountry}</h4>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CITIES[selectedCountry as keyof typeof POPULAR_CITIES]?.map(city => (
                <Button
                  key={city}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePopularCityClick(city)}
                  className="text-xs h-7"
                  disabled={isLoading}
                >
                  {city}
                </Button>
              ))}
            </div>
          </div>

          {currentLocation && (
            <div>
              <h4 className="text-sm font-medium mb-2">Search Radius</h4>
              <div className="flex flex-wrap gap-2">
                {SEARCH_RADIUS_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    variant={searchRadius === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRadiusChange(option.value)}
                    className="text-xs h-7"
                    disabled={currentLocation.latitude === 0}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};