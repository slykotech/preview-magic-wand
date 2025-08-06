-- Enable realtime for card_responses table
ALTER TABLE public.card_responses REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.card_responses;