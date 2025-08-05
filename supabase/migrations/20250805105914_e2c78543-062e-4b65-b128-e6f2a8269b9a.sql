-- First, clear existing game types and add the new romantic game suite
DELETE FROM game_cards;
DELETE FROM card_games;

-- Insert the new romantic game suite
INSERT INTO card_games (id, name, game_type, description, difficulty_level, max_players, estimated_duration_minutes, lgbtq_inclusive, is_active) VALUES
-- 1. Card Deck Game (Couples Edition)
(gen_random_uuid(), 'Card Deck Game', 'couples_cards', 'A turn-based question game with 500+ couple-oriented questions across 8 categories: Romantic, Flirty, Funny, Deep Talk, Communication, Conflict Resolution, Compatibility, and Future Planning.', 'beginner', 2, 45, true, true),

-- 2. Tic Toe Heart (Romantic Tic-Tac-Toe)
(gen_random_uuid(), 'Tic Toe Heart', 'tic_toe_heart', 'Romantic twist on classic Tic-Tac-Toe with heart markers, winner rewards, animated celebrations, and emoji reactions.', 'beginner', 2, 15, true, true),

-- 3. Truth or Dare (Couples Version)
(gen_random_uuid(), 'Truth or Dare for Couples', 'truth_or_dare_couples', 'Flirty truths and cute dares designed to build trust and create fun memories. Features spinning wheel, themed categories, and proof uploads.', 'intermediate', 2, 30, true, true);

-- Add sample cards for Card Deck Game
INSERT INTO game_cards (id, game_id, card_number, title, prompt, category, time_limit_seconds, requires_action, requires_voice_response) 
SELECT 
  gen_random_uuid(),
  (SELECT id FROM card_games WHERE game_type = 'couples_cards'),
  row_number() OVER (),
  'Sample Card ' || row_number() OVER (),
  CASE 
    WHEN row_number() OVER () % 8 = 1 THEN 'What''s your favorite memory of us together?'
    WHEN row_number() OVER () % 8 = 2 THEN 'If you could plan our perfect date night, what would it include?'
    WHEN row_number() OVER () % 8 = 3 THEN 'What''s the silliest thing that makes you think of me?'
    WHEN row_number() OVER () % 8 = 4 THEN 'What''s one fear you have about our relationship that we should talk about?'
    WHEN row_number() OVER () % 8 = 5 THEN 'How do you prefer to resolve conflicts when we disagree?'
    WHEN row_number() OVER () % 8 = 6 THEN 'What''s something you''ve always wanted to ask me but haven''t?'
    WHEN row_number() OVER () % 8 = 7 THEN 'In what ways do you think we complement each other perfectly?'
    ELSE 'What''s one dream you have for our future together?'
  END,
  CASE 
    WHEN row_number() OVER () % 8 = 1 THEN 'romantic'
    WHEN row_number() OVER () % 8 = 2 THEN 'flirty'
    WHEN row_number() OVER () % 8 = 3 THEN 'funny'
    WHEN row_number() OVER () % 8 = 4 THEN 'deep_talk'
    WHEN row_number() OVER () % 8 = 5 THEN 'communication'
    WHEN row_number() OVER () % 8 = 6 THEN 'conflict_resolution'
    WHEN row_number() OVER () % 8 = 7 THEN 'compatibility'
    ELSE 'future_planning'
  END,
  600, -- 10 minutes
  false,
  false
FROM generate_series(1, 40); -- Generate 40 sample cards

-- Add game session data structure for new games
-- For Tic Toe Heart, session_data will store: { "board": [[null,null,null],[null,null,null],[null,null,null]], "userSymbol": "💖", "partnerSymbol": "💘", "winner": null }
-- For Truth or Dare, session_data will store: { "theme": "mixed", "round": 1, "maxRounds": 10, "userScore": 0, "partnerScore": 0, "currentPrompt": "", "promptType": "truth" }
-- For Card Deck, session_data will store: { "selectedCategories": ["romantic", "flirty"], "cardsAnswered": [], "customCards": [] }