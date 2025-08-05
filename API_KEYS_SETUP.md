# API Keys Required for Event System

The real-time events system needs these API keys configured in Supabase secrets:

## Required API Keys:

1. **TICKETMASTER_API_KEY**
   - Get from: https://developer.ticketmaster.com/
   - Quota: 5000 requests/day
   - Coverage: US, CA, GB, AU, IE, NZ, MX

2. **EVENTBRITE_API_KEY** 
   - Get from: https://www.eventbrite.com/platform/api/
   - Quota: 1000 requests/day
   - Coverage: Global

3. **GOOGLE_PLACES_API_KEY**
   - Get from: https://console.cloud.google.com/
   - Enable: Places API
   - Quota: Limited usage (expensive)
   - Coverage: Global

## Usage:
- Run master scraper: Call `event-scraper-master` function
- Events auto-refresh every 4 hours
- Database stores real events from all sources
- No more mock data

## Test the system:
1. Configure the 3 API keys above
2. Call the master scraper in batch mode
3. Events will populate in the database
4. Users will see real events in the app