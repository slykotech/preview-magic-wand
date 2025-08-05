import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface CitySearchInputProps {
  onLocationSet: (city: string, coordinates: {
    lat: number;
    lng: number;
    displayName: string;
  }) => void;
  onCurrentLocation: () => void;
  className?: string;
}
interface CityOption {
  name: string;
  displayName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  country: string;
}
const popularCities: CityOption[] = [
// India
{
  name: 'mumbai',
  displayName: 'Mumbai, India',
  coordinates: {
    lat: 19.0760,
    lng: 72.8777
  },
  country: 'IN'
}, {
  name: 'delhi',
  displayName: 'Delhi, India',
  coordinates: {
    lat: 28.7041,
    lng: 77.1025
  },
  country: 'IN'
}, {
  name: 'bangalore',
  displayName: 'Bangalore, India',
  coordinates: {
    lat: 12.9716,
    lng: 77.5946
  },
  country: 'IN'
}, {
  name: 'hyderabad',
  displayName: 'Hyderabad, India',
  coordinates: {
    lat: 17.3850,
    lng: 78.4867
  },
  country: 'IN'
}, {
  name: 'pune',
  displayName: 'Pune, India',
  coordinates: {
    lat: 18.5204,
    lng: 73.8567
  },
  country: 'IN'
}, {
  name: 'chennai',
  displayName: 'Chennai, India',
  coordinates: {
    lat: 13.0827,
    lng: 80.2707
  },
  country: 'IN'
}, {
  name: 'kolkata',
  displayName: 'Kolkata, India',
  coordinates: {
    lat: 22.5726,
    lng: 88.3639
  },
  country: 'IN'
}, {
  name: 'ahmedabad',
  displayName: 'Ahmedabad, India',
  coordinates: {
    lat: 23.0225,
    lng: 72.5714
  },
  country: 'IN'
}, {
  name: 'jaipur',
  displayName: 'Jaipur, India',
  coordinates: {
    lat: 26.9124,
    lng: 75.7873
  },
  country: 'IN'
}, {
  name: 'kochi',
  displayName: 'Kochi, India',
  coordinates: {
    lat: 9.9312,
    lng: 76.2673
  },
  country: 'IN'
},
// International
{
  name: 'newyork',
  displayName: 'New York, USA',
  coordinates: {
    lat: 40.7128,
    lng: -74.0060
  },
  country: 'US'
}, {
  name: 'london',
  displayName: 'London, UK',
  coordinates: {
    lat: 51.5074,
    lng: -0.1278
  },
  country: 'GB'
}, {
  name: 'paris',
  displayName: 'Paris, France',
  coordinates: {
    lat: 48.8566,
    lng: 2.3522
  },
  country: 'FR'
}, {
  name: 'tokyo',
  displayName: 'Tokyo, Japan',
  coordinates: {
    lat: 35.6762,
    lng: 139.6503
  },
  country: 'JP'
}, {
  name: 'sydney',
  displayName: 'Sydney, Australia',
  coordinates: {
    lat: -33.8688,
    lng: 151.2093
  },
  country: 'AU'
}, {
  name: 'dubai',
  displayName: 'Dubai, UAE',
  coordinates: {
    lat: 25.2048,
    lng: 55.2708
  },
  country: 'AE'
}, {
  name: 'singapore',
  displayName: 'Singapore',
  coordinates: {
    lat: 1.3521,
    lng: 103.8198
  },
  country: 'SG'
}, {
  name: 'toronto',
  displayName: 'Toronto, Canada',
  coordinates: {
    lat: 43.6532,
    lng: -79.3832
  },
  country: 'CA'
}];
export const CitySearchInput = ({
  onLocationSet,
  onCurrentLocation,
  className = ""
}: CitySearchInputProps) => {
  const {
    toast
  } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [filteredCities, setFilteredCities] = useState<CityOption[]>(popularCities);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Filter cities based on search input
  useEffect(() => {
    if (searchInput.trim()) {
      const filtered = popularCities.filter(city => city.displayName.toLowerCase().includes(searchInput.toLowerCase()) || city.name.toLowerCase().includes(searchInput.toLowerCase()));
      setFilteredCities(filtered);
    } else {
      setFilteredCities(popularCities);
    }
  }, [searchInput]);
  const handleCitySelect = (cityValue: string) => {
    const city = popularCities.find(c => c.name === cityValue);
    if (city) {
      setSelectedCity(cityValue);
      onLocationSet(city.name, {
        lat: city.coordinates.lat,
        lng: city.coordinates.lng,
        displayName: city.displayName
      });
      toast({
        title: "Location Set! 📍",
        description: `Now showing events near ${city.displayName}`
      });
    }
  };
  const handleManualSearch = async () => {
    if (!searchInput.trim()) return;
    setIsGeocoding(true);
    try {
      // Try to geocode the manual input using a free geocoding service
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&limit=1`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const coordinates = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          displayName: result.display_name
        };
        onLocationSet(searchInput.toLowerCase().replace(/\s+/g, ''), coordinates);
        setSearchInput('');
        toast({
          title: "Location Found! 📍",
          description: `Now showing events near ${result.display_name}`
        });
      } else {
        toast({
          title: "Location Not Found",
          description: "Please try a different city name or select from the popular cities list.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "Error",
        description: "Unable to find that location. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeocoding(false);
    }
  };
  return <div className={`space-y-4 ${className}`}>
      

      {/* Popular Cities Dropdown */}
      

      {/* Manual City Search */}
      <div className="space-y-2">
        
        <div className="flex gap-2">
          <Input placeholder="Enter any city name..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && !isGeocoding && handleManualSearch()} disabled={isGeocoding} />
          <Button onClick={handleManualSearch} disabled={!searchInput.trim() || isGeocoding} size="icon">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Current Location Button */}
      
    </div>;
};