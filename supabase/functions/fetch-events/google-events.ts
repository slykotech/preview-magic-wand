// Google Places API integration for events and venues

import { UnifiedEvent, calculateDistance, formatEventTiming, generateEventDates, EVENT_CATEGORIES } from './event-sources.ts';

interface GooglePlace {
  id: string;
  displayName: { text: string };
  location: { latitude: number; longitude: number };
  rating?: number;
  types: string[];
  photos?: Array<{ name: string }>;
}

interface GooglePlacesResponse {
  places: GooglePlace[];
}

const VENUE_TYPES = [
  'tourist_attraction',
  'museum',
  'art_gallery',
  'amusement_park',
  'zoo',
  'aquarium',
  'bowling_alley',
  'movie_theater',
  'night_club',
  'restaurant',
  'cafe',
  'park',
  'shopping_mall',
  'cultural_center',
  'performing_arts_theater',
  'concert_hall',
  'stadium',
  'convention_center',
  'spa',
  'casino'
];

export async function fetchGoogleEvents(
  apiKey: string,
  latitude: number,
  longitude: number,
  radius: number = 25,
  cityName?: string
): Promise<UnifiedEvent[]> {
  try {
    console.log('Fetching venues from Google Places (New API)');
    
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.types,places.photos'
      },
      body: JSON.stringify({
        includedTypes: VENUE_TYPES,
        maxResultCount: 20, // Increased to get more venues
        locationRestriction: {
          circle: {
            center: {
              latitude,
              longitude
            },
            radius: radius * 1000 // Convert km to meters
          }
        },
        rankPreference: 'POPULARITY' // Prioritize popular venues
      })
    });

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data: GooglePlacesResponse = await response.json();
    console.log('Google Places response:', JSON.stringify(data, null, 2));

    if (!data.places || data.places.length === 0) {
      console.log('No places found from Google Places API');
      return [];
    }

    // Enhanced reverse geocoding for better location data
    let resolvedCityName = cityName;
    let resolvedState: string | undefined;
    let resolvedCountry: string | undefined;
    
    if (!resolvedCityName) {
      try {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
        );
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.status === 'OK' && geocodeData.results?.[0]) {
            const addressComponents = geocodeData.results[0].address_components;
            
            const cityComponent = addressComponents.find(component => 
              component.types.includes('locality')
            );
            const stateComponent = addressComponents.find(component => 
              component.types.includes('administrative_area_level_1')
            );
            const countryComponent = addressComponents.find(component => 
              component.types.includes('country')
            );
            
            resolvedCityName = cityComponent?.long_name || 
                              stateComponent?.long_name || 
                              'Unknown City';
            resolvedState = stateComponent?.long_name;
            resolvedCountry = countryComponent?.long_name;
          }
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        resolvedCityName = 'Unknown City';
      }
    }

    const events: UnifiedEvent[] = [];
    const eventDates = generateEventDates(data.places.length);

    // Process places sequentially to handle async operations properly
    for (let index = 0; index < data.places.length; index++) {
      const place = data.places[index];
      // Skip if no proper name
      if (!place.displayName?.text || place.displayName.text.length < 3) {
        continue;
      }

      // Determine category based on place types
      let category = EVENT_CATEGORIES.ENTERTAINMENT;
      if (place.types.includes('museum') || place.types.includes('art_gallery')) {
        category = EVENT_CATEGORIES.ARTS;
      } else if (place.types.includes('restaurant') || place.types.includes('cafe')) {
        category = EVENT_CATEGORIES.FOOD;
      } else if (place.types.includes('night_club')) {
        category = EVENT_CATEGORIES.NIGHTLIFE;
      } else if (place.types.includes('amusement_park') || place.types.includes('zoo')) {
        category = EVENT_CATEGORIES.OUTDOOR;
      } else if (place.types.includes('tourist_attraction')) {
        category = EVENT_CATEGORIES.CULTURAL;
      }

      // Calculate distance
      const distance = calculateDistance(
        latitude,
        longitude,
        place.location.latitude,
        place.location.longitude
      );

      // Get specific location data for this venue
      let venueCityName = resolvedCityName;
      let venueStateName = resolvedState;
      let venueCountryName = resolvedCountry;
      
      // Try to get more specific location for this venue if coordinates differ significantly
      if (distance > 5) { // Only if venue is more than 5km away from search center
        try {
          const venueGeocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${place.location.latitude},${place.location.longitude}&key=${apiKey}`
          );
          if (venueGeocodeResponse.ok) {
            const venueGeocodeData = await venueGeocodeResponse.json();
            if (venueGeocodeData.status === 'OK' && venueGeocodeData.results?.[0]) {
              const venueAddressComponents = venueGeocodeData.results[0].address_components;
              
              const venueCityComponent = venueAddressComponents.find(component => 
                component.types.includes('locality')
              );
              const venueStateComponent = venueAddressComponents.find(component => 
                component.types.includes('administrative_area_level_1')
              );
              const venueCountryComponent = venueAddressComponents.find(component => 
                component.types.includes('country')
              );
              
              if (venueCityComponent) venueCityName = venueCityComponent.long_name;
              if (venueStateComponent) venueStateName = venueStateComponent.long_name;
              if (venueCountryComponent) venueCountryName = venueCountryComponent.long_name;
            }
          }
        } catch (venueError) {
          console.error('Venue-specific geocoding error:', venueError);
        }
      }

      const eventDate = eventDates[index];
      
      events.push({
        id: `google_${place.id}`,
        title: `Visit ${place.displayName.text}`,
        distance: `${Math.round(distance)} km away`,
        timing: formatEventTiming(eventDate),
        description: `Explore this popular ${category.toLowerCase()} destination`,
        category,
        venue: place.displayName.text,
        city: venueCityName,
        state: venueStateName,
        country: venueCountryName,
        location_lat: place.location.latitude,
        location_lng: place.location.longitude,
        location_name: place.displayName.text,
        price: category === EVENT_CATEGORIES.FOOD ? '₹500 - ₹2000' : 
               category === EVENT_CATEGORIES.NIGHTLIFE ? '₹1000 - ₹3000' : 
               'Entry varies',
        date: eventDate.toISOString().split('T')[0],
        time: `${10 + (index % 12)}:00`,
        source: 'google',
        bookingUrl: `https://www.google.com/maps/place/${encodeURIComponent(place.displayName.text)}`
      });
    }

    console.log(`Fetched ${events.length} events from Google Places`);
    return events;

  } catch (error) {
    console.error('Google Places API error:', error);
    throw error;
  }
}