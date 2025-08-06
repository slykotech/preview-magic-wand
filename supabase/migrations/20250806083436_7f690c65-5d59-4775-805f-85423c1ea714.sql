-- Update existing AI events with past dates to have future dates
UPDATE public.events 
SET start_date = CASE 
  WHEN EXTRACT(DOW FROM start_date) = 0 THEN -- Sunday
    CURRENT_DATE + INTERVAL '7 days' + (start_date::time)
  WHEN EXTRACT(DOW FROM start_date) = 1 THEN -- Monday  
    CURRENT_DATE + INTERVAL '8 days' + (start_date::time)
  WHEN EXTRACT(DOW FROM start_date) = 2 THEN -- Tuesday
    CURRENT_DATE + INTERVAL '9 days' + (start_date::time)
  WHEN EXTRACT(DOW FROM start_date) = 3 THEN -- Wednesday
    CURRENT_DATE + INTERVAL '10 days' + (start_date::time)
  WHEN EXTRACT(DOW FROM start_date) = 4 THEN -- Thursday
    CURRENT_DATE + INTERVAL '11 days' + (start_date::time)
  WHEN EXTRACT(DOW FROM start_date) = 5 THEN -- Friday
    CURRENT_DATE + INTERVAL '12 days' + (start_date::time)
  WHEN EXTRACT(DOW FROM start_date) = 6 THEN -- Saturday
    CURRENT_DATE + INTERVAL '13 days' + (start_date::time)
END,
updated_at = now()
WHERE ai_generated = true 
  AND start_date < CURRENT_DATE
  AND city_name ILIKE '%hyderabad%';