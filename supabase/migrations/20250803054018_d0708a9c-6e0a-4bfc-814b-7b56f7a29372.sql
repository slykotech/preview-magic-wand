-- Insert Memory Match cards (partner knowledge questions)
INSERT INTO game_cards (game_id, card_number, title, prompt, category, difficulty_level, time_limit_seconds, requires_action, requires_voice_response) VALUES
('5671fdab-485a-4914-a9f7-013740eb1723', 1, 'Favorite Memory', 'What do you think is my favorite memory of us together?', 'relationship', 'intermediate', 300, false, false),
('5671fdab-485a-4914-a9f7-013740eb1723', 2, 'Dream Job', 'What do you think my dream job would be?', 'aspirations', 'intermediate', 300, false, false),
('5671fdab-485a-4914-a9f7-013740eb1723', 3, 'Hidden Talent', 'What hidden talent do you think I have or wish I had?', 'personality', 'intermediate', 300, false, false),
('5671fdab-485a-4914-a9f7-013740eb1723', 4, 'Perfect Day', 'How would you describe my perfect day off?', 'lifestyle', 'intermediate', 300, false, false),
('5671fdab-485a-4914-a9f7-013740eb1723', 5, 'Greatest Fear', 'What do you think is something I worry about most?', 'emotions', 'intermediate', 300, false, false),
('5671fdab-485a-4914-a9f7-013740eb1723', 6, 'Comfort Food', 'What food do you think I would choose for comfort?', 'preferences', 'beginner', 300, false, false),
('5671fdab-485a-4914-a9f7-013740eb1723', 7, 'Childhood Dream', 'What do you think I wanted to be when I grew up?', 'past', 'intermediate', 300, false, false),
('5671fdab-485a-4914-a9f7-013740eb1723', 8, 'Love Language', 'How do you think I prefer to show and receive love?', 'connection', 'intermediate', 300, false, false);

-- Insert Love Coupons cards  
INSERT INTO game_cards (game_id, card_number, title, prompt, category, difficulty_level, time_limit_seconds, requires_action, requires_voice_response) VALUES
('d8c205ae-cd3c-400d-b76f-03c0f4a8678b', 1, 'Massage Coupon', 'Create a coupon for a 20-minute relaxing massage. What makes it special?', 'physical', 'beginner', 300, true, false),
('d8c205ae-cd3c-400d-b76f-03c0f4a8678b', 2, 'Breakfast in Bed', 'Design a coupon for making your partners favorite breakfast in bed. Include the details!', 'service', 'beginner', 300, true, false),
('d8c205ae-cd3c-400d-b76f-03c0f4a8678b', 3, 'Date Night Planning', 'Create a coupon where you plan the entire next date night. What would you include?', 'romance', 'beginner', 300, true, false),
('d8c205ae-cd3c-400d-b76f-03c0f4a8678b', 4, 'Chore Helper', 'Make a coupon to take over your partners least favorite chore for a week. Which one?', 'service', 'beginner', 300, true, false),
('d8c205ae-cd3c-400d-b76f-03c0f4a8678b', 5, 'Listening Session', 'Design a coupon for an hour of undivided attention and listening. Set the scene!', 'emotional', 'beginner', 300, true, false),
('d8c205ae-cd3c-400d-b76f-03c0f4a8678b', 6, 'Adventure Coupon', 'Create a coupon for trying something new together. What adventure would you choose?', 'experience', 'beginner', 300, true, false),
('d8c205ae-cd3c-400d-b76f-03c0f4a8678b', 7, 'Memory Lane', 'Make a coupon to recreate your first date or a special memory. Describe the plan!', 'nostalgia', 'beginner', 300, true, false),
('d8c205ae-cd3c-400d-b76f-03c0f4a8678b', 8, 'Self-Care Gift', 'Design a coupon for something that helps your partner relax and recharge. What is it?', 'wellness', 'beginner', 300, true, false);