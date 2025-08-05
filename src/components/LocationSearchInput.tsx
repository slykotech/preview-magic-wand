import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface LocationSearchInputProps {
  onLocationSelect: (cityName: string) => void;
  placeholder?: string;
  className?: string;
}

// Popular cities for quick selection
const popularCities = [
  "Mumbai, Maharashtra, India",
  "Delhi, India", 
  "Bangalore, Karnataka, India",
  "Hyderabad, Telangana, India",
  "Chennai, Tamil Nadu, India",
  "Kolkata, West Bengal, India",
  "Pune, Maharashtra, India",
  "Ahmedabad, Gujarat, India",
  "Jaipur, Rajasthan, India",
  "Surat, Gujarat, India",
  "Lucknow, Uttar Pradesh, India",
  "Kanpur, Uttar Pradesh, India",
  "Nagpur, Maharashtra, India",
  "Visakhapatnam, Andhra Pradesh, India",
  "Indore, Madhya Pradesh, India",
  "Thane, Maharashtra, India",
  "Bhopal, Madhya Pradesh, India",
  "Pimpri-Chinchwad, Maharashtra, India",
  "Patna, Bihar, India",
  "Vadodara, Gujarat, India"
];

export const LocationSearchInput = ({ 
  onLocationSelect, 
  placeholder = "Search for a city or location...",
  className = ""
}: LocationSearchInputProps) => {
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleLocationSelect = (location: string) => {
    onLocationSelect(location);
    setSearchValue(location);
    setOpen(false);
  };

  const handleSearch = () => {
    if (searchValue.trim()) {
      onLocationSelect(searchValue.trim());
      setOpen(false);
    }
  };

  const filteredCities = popularCities.filter(city =>
    city.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className={`flex gap-2 ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              onFocus={() => setOpen(true)}
              className="pl-10"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search cities..." value={searchValue} onValueChange={setSearchValue} />
            <CommandList>
              <CommandEmpty>No cities found.</CommandEmpty>
              {filteredCities.slice(0, 10).map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => handleLocationSelect(city)}
                  className="cursor-pointer"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {city}
                </CommandItem>
              ))}
              {searchValue && !filteredCities.some(city => 
                city.toLowerCase() === searchValue.toLowerCase()
              ) && (
                <CommandItem
                  value={searchValue}
                  onSelect={() => handleLocationSelect(searchValue)}
                  className="cursor-pointer border-t"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search for "{searchValue}"
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button 
        onClick={handleSearch} 
        disabled={!searchValue.trim() || isSearching}
      >
        {isSearching ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};