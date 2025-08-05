-- Check if Google Places API key is configured
SELECT COUNT(*) FROM vault.secrets WHERE name = 'GOOGLE_PLACES_API_KEY';