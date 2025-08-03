-- Insert the missing game types that are referenced in the frontend
INSERT INTO card_games (id, name, game_type, description, difficulty_level, estimated_duration_minutes, max_players, lgbtq_inclusive, is_active) VALUES
('truth-or-love-01', 'Truth or Love', 'truth_or_love', 'Honest conversations that deepen your connection', 'beginner', 30, 2, true, true),
('this-or-that-01', 'This or That', 'this_or_that', 'Fun choices that reveal your preferences', 'beginner', 20, 2, true, true),
('memory-match-01', 'Memory Match', 'memory_match', 'Test how well you know each other', 'intermediate', 25, 2, true, true),
('love-coupons-01', 'Love Coupons', 'love_coupons', 'Create romantic gestures for each other', 'beginner', 15, 2, true, true),
('couple-quiz-01', 'Couple Quiz', 'couple_quiz', 'Test your knowledge about each other', 'intermediate', 35, 2, true, true);

-- Insert Truth or Love cards
INSERT INTO game_cards (game_id, card_number, title, prompt, category, difficulty_level, time_limit_seconds, requires_action, requires_voice_response) VALUES
('truth-or-love-01', 1, 'Vulnerability', 'What is something you have never told anyone, but you feel comfortable sharing with me?', 'deep_talk', 'beginner', 600, false, false),
('truth-or-love-01', 2, 'Dreams', 'What is a dream or goal you have that you worry might sound silly to others?', 'aspirations', 'beginner', 600, false, false),
('truth-or-love-01', 3, 'Past Relationships', 'What is the most valuable lesson you learned from a past relationship?', 'reflection', 'intermediate', 600, false, false),
('truth-or-love-01', 4, 'Family', 'What family tradition would you want to start or continue with me?', 'future', 'beginner', 600, false, false),
('truth-or-love-01', 5, 'Insecurities', 'What is an insecurity you have that I could help you feel more confident about?', 'support', 'intermediate', 600, false, false),
('truth-or-love-01', 6, 'Love Languages', 'How do you feel most loved and appreciated by me?', 'connection', 'beginner', 600, false, false),
('truth-or-love-01', 7, 'Childhood', 'What is your happiest childhood memory, and how does it influence who you are today?', 'memories', 'beginner', 600, false, false),
('truth-or-love-01', 8, 'Fears', 'What is something you are afraid of that you have never admitted out loud?', 'vulnerability', 'intermediate', 600, false, false);

-- Insert This or That cards
INSERT INTO game_cards (game_id, card_number, title, prompt, category, difficulty_level, time_limit_seconds, requires_action, requires_voice_response) VALUES
('this-or-that-01', 1, 'Morning vs Night', 'Are you more of a morning person or a night owl? Why?', 'personality', 'beginner', 180, false, false),
('this-or-that-01', 2, 'Adventure vs Comfort', 'Do you prefer spontaneous adventures or cozy nights at home?', 'lifestyle', 'beginner', 180, false, false),
('this-or-that-01', 3, 'Beach vs Mountains', 'Would you rather spend a vacation at the beach or in the mountains?', 'travel', 'beginner', 180, false, false),
('this-or-that-01', 4, 'Books vs Movies', 'Do you prefer getting lost in a good book or watching movies?', 'entertainment', 'beginner', 180, false, false),
('this-or-that-01', 5, 'City vs Country', 'Would you rather live in a bustling city or peaceful countryside?', 'lifestyle', 'beginner', 180, false, false),
('this-or-that-01', 6, 'Cook vs Order', 'Do you prefer cooking together or ordering takeout for date nights?', 'romance', 'beginner', 180, false, false),
('this-or-that-01', 7, 'Past vs Future', 'Are you more interested in learning about the past or the future?', 'mindset', 'beginner', 180, false, false),
('this-or-that-01', 8, 'Big Party vs Intimate', 'Would you prefer a big celebration or an intimate gathering for special occasions?', 'social', 'beginner', 180, false, false);

-- Insert Memory Match cards (partner knowledge questions)
INSERT INTO game_cards (game_id, card_number, title, prompt, category, difficulty_level, time_limit_seconds, requires_action, requires_voice_response) VALUES
('memory-match-01', 1, 'Favorite Memory', 'What do you think is my favorite memory of us together?', 'relationship', 'intermediate', 300, false, false),
('memory-match-01', 2, 'Dream Job', 'What do you think my dream job would be?', 'aspirations', 'intermediate', 300, false, false),
('memory-match-01', 3, 'Hidden Talent', 'What hidden talent do you think I have or wish I had?', 'personality', 'intermediate', 300, false, false),
('memory-match-01', 4, 'Perfect Day', 'How would you describe my perfect day off?', 'lifestyle', 'intermediate', 300, false, false),
('memory-match-01', 5, 'Greatest Fear', 'What do you think is something I worry about most?', 'emotions', 'intermediate', 300, false, false),
('memory-match-01', 6, 'Comfort Food', 'What food do you think I would choose for comfort?', 'preferences', 'beginner', 300, false, false),
('memory-match-01', 7, 'Childhood Dream', 'What do you think I wanted to be when I grew up?', 'past', 'intermediate', 300, false, false),
('memory-match-01', 8, 'Love Language', 'How do you think I prefer to show and receive love?', 'connection', 'intermediate', 300, false, false);

-- Insert Love Coupons cards  
INSERT INTO game_cards (game_id, card_number, title, prompt, category, difficulty_level, time_limit_seconds, requires_action, requires_voice_response) VALUES
('love-coupons-01', 1, 'Massage Coupon', 'Create a coupon for a 20-minute relaxing massage. What makes it special?', 'physical', 'beginner', 300, true, false),
('love-coupons-01', 2, 'Breakfast in Bed', 'Design a coupon for making your partners favorite breakfast in bed. Include the details!', 'service', 'beginner', 300, true, false),
('love-coupons-01', 3, 'Date Night Planning', 'Create a coupon where you plan the entire next date night. What would you include?', 'romance', 'beginner', 300, true, false),
('love-coupons-01', 4, 'Chore Helper', 'Make a coupon to take over your partners least favorite chore for a week. Which one?', 'service', 'beginner', 300, true, false),
('love-coupons-01', 5, 'Listening Session', 'Design a coupon for an hour of undivided attention and listening. Set the scene!', 'emotional', 'beginner', 300, true, false),
('love-coupons-01', 6, 'Adventure Coupon', 'Create a coupon for trying something new together. What adventure would you choose?', 'experience', 'beginner', 300, true, false),
('love-coupons-01', 7, 'Memory Lane', 'Make a coupon to recreate your first date or a special memory. Describe the plan!', 'nostalgia', 'beginner', 300, true, false),
('love-coupons-01', 8, 'Self-Care Gift', 'Design a coupon for something that helps your partner relax and recharge. What is it?', 'wellness', 'beginner', 300, true, false);

-- Insert Couple Quiz cards
INSERT INTO game_cards (game_id, card_number, title, prompt, category, difficulty_level, time_limit_seconds, requires_action, requires_voice_response) VALUES
('couple-quiz-01', 1, 'First Impressions', 'What was your partners first impression of you? Let them answer, then share what you think it was!', 'memories', 'intermediate', 400, false, false),
('couple-quiz-01', 2, 'Deal Breakers', 'Name three things you think are relationship deal-breakers for your partner.', 'values', 'intermediate', 400, false, false),
('couple-quiz-01', 3, 'Life Goals', 'What do you think your partner wants to accomplish in the next 5 years?', 'future', 'intermediate', 400, false, false),
('couple-quiz-01', 4, 'Pet Peeves', 'What are two things that you think really annoy your partner?', 'quirks', 'intermediate', 400, false, false),
('couple-quiz-01', 5, 'Happy Place', 'Where do you think your partner feels most at peace and happy?', 'emotions', 'intermediate', 400, false, false),
('couple-quiz-01', 6, 'Communication Style', 'How does your partner prefer to resolve conflicts or disagreements?', 'personality', 'intermediate', 400, false, false),
('couple-quiz-01', 7, 'Surprises', 'What kind of surprise do you think your partner would love most right now?', 'romance', 'intermediate', 400, false, false),
('couple-quiz-01', 8, 'Support Needs', 'When your partner is stressed, what do you think helps them most?', 'support', 'intermediate', 400, false, false);