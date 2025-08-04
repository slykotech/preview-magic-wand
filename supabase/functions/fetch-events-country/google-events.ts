// Google Places API integration for events and venues
// Copied for isolated edge function deployment

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

    for (let index = 0; index < data.places.length; index++) {
      const place = data.places[index];
      
      // Skip if no proper name
      if (!place.displayName?.text || place.displayName.text.length < 3) {
        continue;
      }

      try {
        // Get detailed place information including address
        let venueAddress = '';
        let placeDetails = null;
        
        // Try to get place details for proper address
        try {
          const detailsResponse = await fetch(
            `https://places.googleapis.com/v1/places/${place.id}?fields=formattedAddress,addressComponents&key=${apiKey}`,
            {
              headers: {
                'X-Goog-Api-Key': apiKey
              }
            }
          );
          
          if (detailsResponse.ok) {
            placeDetails = await detailsResponse.json();
            venueAddress = placeDetails.formattedAddress || '';
          }
        } catch (error) {
          console.log(`Failed to get address for place ${place.id}:`, error);
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

        const eventDate = eventDates[index];
        
        // Create proper directions URL instead of place URL
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.location.latitude},${place.location.longitude}&destination_place_id=${place.id}`;
        
        events.push({
          id: `google_${place.id}`,
          title: `Visit ${place.displayName.text}`,
          distance: `${Math.round(distance * 10) / 10} km away`,
          timing: formatEventTiming(eventDate),
          description: `Explore this popular ${category.toLowerCase()} destination${venueAddress ? ` at ${venueAddress}` : ''}`,
          category,
          venue: place.displayName.text,
          city: resolvedCityName,
          state: resolvedState,
          country: resolvedCountry,
          location_lat: place.location.latitude,
          location_lng: place.location.longitude,
          location_name: venueAddress || place.displayName.text,
          price: category === EVENT_CATEGORIES.FOOD ? '₹500 - ₹2000' : 
                 category === EVENT_CATEGORIES.NIGHTLIFE ? '₹1000 - ₹3000' : 
                 'Entry varies',
          date: eventDate.toISOString().split('T')[0],
          time: `${10 + (index % 12)}:00`,
          source: 'google',
          bookingUrl: directionsUrl
        });
        
      } catch (error) {
        console.error(`Error processing Google Place ${index}:`, error);
        // Continue with next place
      }
    }

    console.log(`Fetched ${events.length} events from Google Places`);
    return events;

  } catch (error) {
    console.error('Google Places API error:', error);
    throw error;
  }
}