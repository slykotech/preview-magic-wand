-- Insert the missing game types that are referenced in the frontend
INSERT INTO card_games (name, game_type, description, difficulty_level, estimated_duration_minutes, max_players, lgbtq_inclusive, is_active) VALUES
('Truth or Love', 'truth_or_love', 'Honest conversations that deepen your connection', 'beginner', 30, 2, true, true),
('This or That', 'this_or_that', 'Fun choices that reveal your preferences', 'beginner', 20, 2, true, true),
('Memory Match', 'memory_match', 'Test how well you know each other', 'intermediate', 25, 2, true, true),
('Love Coupons', 'love_coupons', 'Create romantic gestures for each other', 'beginner', 15, 2, true, true),
('Couple Quiz', 'couple_quiz', 'Test your knowledge about each other', 'intermediate', 35, 2, true, true);

-- Get the game IDs for our new games
-- We'll insert cards using the actual UUIDs returned by the database