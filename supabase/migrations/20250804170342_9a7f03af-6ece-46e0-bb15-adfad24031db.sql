-- Clean up old mock/test data and trigger fresh event fetching
DELETE FROM events WHERE 
  title LIKE 'Visit %' OR 
  title LIKE 'Experience %' OR
  title LIKE 'Explore %' OR
  title LIKE 'Discover %' OR
  source IN ('district', 'paytm-insider', 'bookmyshow') OR 
  (city IS NULL OR city = '') OR
  (location_name IS NULL OR location_name = '') OR
  created_at < '2025-08-04 16:00:00';