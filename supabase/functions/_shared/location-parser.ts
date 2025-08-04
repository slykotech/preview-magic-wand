// Location parsing utility for cleaning and structuring location data
export interface ParsedLocation {
  city: string;
  state: string | null;
  country: string;
  original: string;
}

/**
 * Parses various location string formats into structured city, state, country data
 * Handles formats like:
 * - "Area, City, State, Country" 
 * - "City, State, Country"
 * - "City, Country"
 * - "City"
 */
export function parseLocationString(locationString: string): ParsedLocation {
  if (!locationString) {
    return {
      city: '',
      state: null,
      country: '',
      original: locationString
    };
  }

  const original = locationString.trim();
  const parts = original.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return {
      city: '',
      state: null,
      country: '',
      original
    };
  }

  // Handle different formats based on number of parts
  switch (parts.length) {
    case 1:
      // Just a city name
      return {
        city: parts[0],
        state: null,
        country: '',
        original
      };

    case 2:
      // "City, Country"
      return {
        city: parts[0],
        state: null,
        country: parts[1],
        original
      };

    case 3:
      // "City, State, Country"
      return {
        city: parts[0],
        state: parts[1],
        country: parts[2],
        original
      };

    case 4:
    default:
      // "Area, City, State, Country" - skip the area, use city
      return {
        city: parts[1] || parts[0], // Use second part as city, fallback to first
        state: parts[2] || null,
        country: parts[3] || parts[parts.length - 1], // Use last part as country
        original
      };
  }
}

/**
 * Clean and normalize city names
 */
export function cleanCityName(city: string): string {
  if (!city) return '';
  
  return city
    .trim()
    .replace(/^(the\s+)/i, '') // Remove "the" prefix
    .replace(/\s+/g, ' ') // Normalize spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Clean and normalize state names
 */
export function cleanStateName(state: string): string {
  if (!state) return '';
  
  return state
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Clean and normalize country names
 */
export function cleanCountryName(country: string): string {
  if (!country) return '';
  
  // Handle common country name variations
  const countryMap: { [key: string]: string } = {
    'usa': 'United States',
    'us': 'United States',
    'united states of america': 'United States',
    'uk': 'United Kingdom',
    'britain': 'United Kingdom',
    'great britain': 'United Kingdom',
  };
  
  const normalized = country.toLowerCase().trim();
  if (countryMap[normalized]) {
    return countryMap[normalized];
  }
  
  return country
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Complete location parsing with cleaning
 */
export function parseAndCleanLocation(locationString: string): ParsedLocation {
  const parsed = parseLocationString(locationString);
  
  return {
    city: cleanCityName(parsed.city),
    state: parsed.state ? cleanStateName(parsed.state) : null,
    country: cleanCountryName(parsed.country),
    original: parsed.original
  };
}

/**
 * Extract coordinates from location data if available
 */
export function extractCoordinates(locationData: any): { lat: number | null, lng: number | null } {
  // Try various common coordinate field names
  const possibleLatFields = ['lat', 'latitude', 'location_lat', 'venue_lat'];
  const possibleLngFields = ['lng', 'lon', 'longitude', 'location_lng', 'venue_lng'];
  
  let lat: number | null = null;
  let lng: number | null = null;
  
  for (const field of possibleLatFields) {
    if (locationData[field] && typeof locationData[field] === 'number') {
      lat = locationData[field];
      break;
    }
  }
  
  for (const field of possibleLngFields) {
    if (locationData[field] && typeof locationData[field] === 'number') {
      lng = locationData[field];
      break;
    }
  }
  
  return { lat, lng };
}

/**
 * Validate parsed location data
 */
export function validateLocation(location: ParsedLocation): boolean {
  return location.city.length > 0 && location.country.length > 0;
}