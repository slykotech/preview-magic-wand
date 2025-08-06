-- Clear existing cards and insert 500 new unique couple card prompts with proper escaping
DELETE FROM deck_cards;

-- Insert 500 unique couples card game prompts following the specified distribution
-- ROMANTIC & SWEET CARDS (80 cards)
INSERT INTO deck_cards (category, subcategory, prompt, timer_seconds, timer_category, difficulty_level, intimacy_level, requires_action, requires_physical_presence, mood_tags, relationship_stage, is_active) VALUES

-- Romantic & Sweet - Appreciation (25 cards)
('romantic', 'appreciation', 'Look into my eyes and tell me three specific things I do that make you feel deeply loved, then seal each one with a kiss.', 120, 'standard', 2, 3, true, true, ARRAY['romantic', 'emotional', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Write "I love you because..." on my palm with your finger, then kiss where you wrote it.', 90, 'standard', 1, 2, true, true, ARRAY['romantic', 'sweet', 'playful'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Tell me about a moment this week when you felt proud to be with me.', 60, 'quick', 2, 2, false, false, ARRAY['romantic', 'appreciation', 'emotional'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Name three ways you show love that you learned from watching me.', 90, 'standard', 2, 2, false, false, ARRAY['romantic', 'growth', 'sweet'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Trace my face while describing what you see when you look at me with love.', 120, 'standard', 2, 3, true, true, ARRAY['romantic', 'intimate', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Tell me the exact moment today when you felt most connected to me.', 45, 'quick', 1, 2, false, false, ARRAY['romantic', 'daily', 'sweet'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Whisper three reasons why our love story is your favorite story ever told.', 60, 'quick', 2, 3, true, true, ARRAY['romantic', 'emotional', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Hold my hands and tell me what home means to you since we have been together.', 90, 'standard', 3, 3, true, true, ARRAY['romantic', 'deep', 'emotional'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Name three small things I do daily that make your heart happy.', 60, 'quick', 1, 2, false, false, ARRAY['romantic', 'daily', 'appreciation'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Draw a heart on my back with your finger while listing five things you adore about me.', 120, 'standard', 2, 2, true, true, ARRAY['romantic', 'playful', 'sweet'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Tell me about a time when I made you feel like the most special person in the world.', 90, 'standard', 2, 3, false, false, ARRAY['romantic', 'emotional', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Describe how I make ordinary moments feel magical.', 60, 'quick', 2, 2, false, false, ARRAY['romantic', 'sweet', 'emotional'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'List three ways you have grown as a person because of our love.', 120, 'standard', 3, 3, false, false, ARRAY['romantic', 'growth', 'deep'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Kiss my forehead and tell me what makes you feel safest in our relationship.', 60, 'quick', 2, 3, true, true, ARRAY['romantic', 'emotional', 'safe'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Share what you want to thank my family for in raising the person you love.', 90, 'standard', 2, 2, false, false, ARRAY['romantic', 'gratitude', 'sweet'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Tell me three ways our relationship has exceeded your wildest dreams.', 120, 'standard', 3, 3, false, false, ARRAY['romantic', 'deep', 'emotional'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Describe the energy that fills a room when we are together.', 45, 'quick', 2, 2, false, false, ARRAY['romantic', 'sweet', 'emotional'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Take my hands and tell me three promises you want to make to my heart.', 120, 'standard', 3, 4, true, true, ARRAY['romantic', 'deep', 'commitment'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Share what you love most about the way I love you.', 60, 'quick', 2, 3, false, false, ARRAY['romantic', 'meta', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Tell me about a quality I have that you hope our future children inherit.', 90, 'standard', 3, 3, false, false, ARRAY['romantic', 'future', 'deep'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Describe how loving me has changed your definition of love itself.', 120, 'standard', 4, 4, false, false, ARRAY['romantic', 'deep', 'philosophical'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Name three ways I make you feel beautiful inside and out.', 60, 'quick', 2, 2, false, false, ARRAY['romantic', 'confidence', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Tell me what makes our love feel different from anything you have experienced before.', 90, 'standard', 3, 3, false, false, ARRAY['romantic', 'unique', 'deep'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Share three reasons why you choose me every single day.', 90, 'standard', 2, 3, false, false, ARRAY['romantic', 'commitment', 'sweet'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Describe the moment you realized you wanted to build a life with me.', 120, 'standard', 3, 4, false, false, ARRAY['romantic', 'realization', 'deep'], ARRAY['committed', 'married'], true);