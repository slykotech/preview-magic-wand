-- Delete all existing events to start fresh
DELETE FROM events;

-- Also delete any date_ideas that were created from bad event data
DELETE FROM date_ideas WHERE 
  title LIKE '%Event%' OR 
  title LIKE '%Company%' OR
  title LIKE '%Studio%' OR
  title LIKE '%Management%' OR
  description LIKE '%Highly rated attraction%' OR
  description LIKE '%Event Venue%';