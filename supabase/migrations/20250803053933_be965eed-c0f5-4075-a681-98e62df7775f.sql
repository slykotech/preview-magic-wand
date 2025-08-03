-- Insert Truth or Love cards
INSERT INTO game_cards (game_id, card_number, title, prompt, category, difficulty_level, time_limit_seconds, requires_action, requires_voice_response) VALUES
('aa8e1fde-e2cc-4b10-bb03-b27a6a9ef35c', 1, 'Vulnerability', 'What is something you have never told anyone, but you feel comfortable sharing with me?', 'deep_talk', 'beginner', 600, false, false),
('aa8e1fde-e2cc-4b10-bb03-b27a6a9ef35c', 2, 'Dreams', 'What is a dream or goal you have that you worry might sound silly to others?', 'aspirations', 'beginner', 600, false, false),
('aa8e1fde-e2cc-4b10-bb03-b27a6a9ef35c', 3, 'Past Relationships', 'What is the most valuable lesson you learned from a past relationship?', 'reflection', 'intermediate', 600, false, false),
('aa8e1fde-e2cc-4b10-bb03-b27a6a9ef35c', 4, 'Family', 'What family tradition would you want to start or continue with me?', 'future', 'beginner', 600, false, false),
('aa8e1fde-e2cc-4b10-bb03-b27a6a9ef35c', 5, 'Insecurities', 'What is an insecurity you have that I could help you feel more confident about?', 'support', 'intermediate', 600, false, false),
('aa8e1fde-e2cc-4b10-bb03-b27a6a9ef35c', 6, 'Love Languages', 'How do you feel most loved and appreciated by me?', 'connection', 'beginner', 600, false, false),
('aa8e1fde-e2cc-4b10-bb03-b27a6a9ef35c', 7, 'Childhood', 'What is your happiest childhood memory, and how does it influence who you are today?', 'memories', 'beginner', 600, false, false),
('aa8e1fde-e2cc-4b10-bb03-b27a6a9ef35c', 8, 'Fears', 'What is something you are afraid of that you have never admitted out loud?', 'vulnerability', 'intermediate', 600, false, false);

-- Insert This or That cards
INSERT INTO game_cards (game_id, card_number, title, prompt, category, difficulty_level, time_limit_seconds, requires_action, requires_voice_response) VALUES
('4c544bfe-88e7-4dae-8596-7fe7c2d8a1ea', 1, 'Morning vs Night', 'Are you more of a morning person or a night owl? Why?', 'personality', 'beginner', 180, false, false),
('4c544bfe-88e7-4dae-8596-7fe7c2d8a1ea', 2, 'Adventure vs Comfort', 'Do you prefer spontaneous adventures or cozy nights at home?', 'lifestyle', 'beginner', 180, false, false),
('4c544bfe-88e7-4dae-8596-7fe7c2d8a1ea', 3, 'Beach vs Mountains', 'Would you rather spend a vacation at the beach or in the mountains?', 'travel', 'beginner', 180, false, false),
('4c544bfe-88e7-4dae-8596-7fe7c2d8a1ea', 4, 'Books vs Movies', 'Do you prefer getting lost in a good book or watching movies?', 'entertainment', 'beginner', 180, false, false),
('4c544bfe-88e7-4dae-8596-7fe7c2d8a1ea', 5, 'City vs Country', 'Would you rather live in a bustling city or peaceful countryside?', 'lifestyle', 'beginner', 180, false, false),
('4c544bfe-88e7-4dae-8596-7fe7c2d8a1ea', 6, 'Cook vs Order', 'Do you prefer cooking together or ordering takeout for date nights?', 'romance', 'beginner', 180, false, false),
('4c544bfe-88e7-4dae-8596-7fe7c2d8a1ea', 7, 'Past vs Future', 'Are you more interested in learning about the past or the future?', 'mindset', 'beginner', 180, false, false),
('4c544bfe-88e7-4dae-8596-7fe7c2d8a1ea', 8, 'Big Party vs Intimate', 'Would you prefer a big celebration or an intimate gathering for special occasions?', 'social', 'beginner', 180, false, false);