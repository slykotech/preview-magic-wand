-- Add city column to events table if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS city TEXT;

-- Update existing events to populate city field from location_name where city is null
UPDATE events 
SET city = COALESCE(location_name, 'Unknown City')
WHERE city IS NULL OR city = '';

-- Create an index on city for better search performance
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);

-- Update existing Google Places events to have proper city information
-- This helps with the immediate display issue
UPDATE events 
SET city = CASE 
  WHEN venue LIKE '%Hyderabad%' OR location_name LIKE '%Hyderabad%' THEN 'Hyderabad'
  WHEN venue LIKE '%Mumbai%' OR location_name LIKE '%Mumbai%' THEN 'Mumbai'
  WHEN venue LIKE '%Delhi%' OR location_name LIKE '%Delhi%' THEN 'Delhi'
  WHEN venue LIKE '%Bangalore%' OR location_name LIKE '%Bangalore%' THEN 'Bangalore'
  WHEN venue LIKE '%Chennai%' OR location_name LIKE '%Chennai%' THEN 'Chennai'
  WHEN venue LIKE '%Pune%' OR location_name LIKE '%Pune%' THEN 'Pune'
  WHEN venue LIKE '%Kolkata%' OR location_name LIKE '%Kolkata%' THEN 'Kolkata'
  WHEN venue LIKE '%Goa%' OR location_name LIKE '%Goa%' THEN 'Goa'
  ELSE COALESCE(city, location_name, 'Unknown City')
END
WHERE source = 'google' AND (city IS NULL OR city = '' OR city = 'Unknown City');