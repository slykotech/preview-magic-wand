-- Fix security warnings for new functions
ALTER FUNCTION public.generate_cache_key(TEXT, TEXT, TEXT) SET search_path = '';
ALTER FUNCTION public.should_scrape_region(TEXT, TEXT, TEXT) SET search_path = '';