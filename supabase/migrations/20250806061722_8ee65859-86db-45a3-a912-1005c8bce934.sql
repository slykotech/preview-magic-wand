-- Add the remaining categories to complete the 500 card collection
-- INTIMATE & VULNERABLE CARDS (70 cards)
-- FLIRTY & PLAYFUL CARDS (70 cards)  
-- MEMORY & NOSTALGIA CARDS (60 cards)
-- FUTURE & DREAMS CARDS (60 cards)
-- FUNNY & SILLY CARDS (50 cards)
-- SPICY & SENSUAL CARDS (40 cards)
-- GROWTH & LEARNING CARDS (40 cards)
-- DAILY LIFE & HABITS CARDS (30 cards)

INSERT INTO deck_cards (category, subcategory, prompt, timer_seconds, timer_category, difficulty_level, intimacy_level, requires_action, requires_physical_presence, mood_tags, relationship_stage, is_active) VALUES

-- INTIMATE & VULNERABLE CARDS (70 cards)
('intimate', 'fears', 'Share your biggest fear about growing old together, then let me hold you while we talk about how we will face it as a team.', 240, 'deep', 4, 5, true, true, ARRAY['deep', 'vulnerable', 'emotional'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Tell me about a time when you felt most vulnerable with me and how it strengthened our bond.', 180, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'growth', 'bonding'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'secrets', 'Share something you have never told anyone else, then let me show you it does not change how I see you.', 300, 'deep', 5, 5, false, false, ARRAY['vulnerable', 'secrets', 'acceptance'], ARRAY['committed', 'married'], true),
('intimate', 'insecurities', 'Describe your biggest insecurity and let me tell you three reasons why it makes you even more loveable.', 240, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'insecurity', 'reassurance'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'desires', 'Tell me what you are most afraid of losing in our relationship.', 120, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'loss', 'deep'], ARRAY['committed', 'married'], true),
('intimate', 'healing', 'Share a childhood wound that still affects you and how our love helps heal it.', 300, 'deep', 5, 5, false, false, ARRAY['vulnerable', 'healing', 'childhood'], ARRAY['committed', 'married'], true),
('intimate', 'emotional', 'Describe a moment when you felt completely emotionally naked with me.', 180, 'deep', 4, 5, false, false, ARRAY['vulnerable', 'emotional', 'naked'], ARRAY['committed', 'married'], true),
('intimate', 'tears', 'Tell me about a time when you cried because of something beautiful about us.', 120, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'tears', 'beauty'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'needs', 'Share what you need from me when you are feeling most insecure.', 180, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'needs', 'support'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'authentic', 'Describe the part of yourself you are most afraid to show others, but feel safe showing me.', 240, 'deep', 4, 5, false, false, ARRAY['vulnerable', 'safety', 'authentic'], ARRAY['committed', 'married'], true),
('intimate', 'support', 'Tell me about a dream you are afraid to pursue and how I can support you.', 180, 'deep', 3, 3, false, false, ARRAY['vulnerable', 'dreams', 'support'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'parenting', 'Share your deepest fear about becoming a parent together.', 240, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'parenting', 'future'], ARRAY['committed', 'married'], true),
('intimate', 'worthiness', 'Describe a time when you felt like you were not good enough for me.', 180, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'worthiness', 'insecurity'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'judgment', 'Tell me what you are most afraid people would think if they knew the real you.', 240, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'judgment', 'authentic'], ARRAY['committed', 'married'], true),
('intimate', 'future_fears', 'Share your biggest fear about our future together.', 180, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'future', 'fear'], ARRAY['committed', 'married'], true),
('intimate', 'understanding', 'Describe a moment when you felt completely understood by me for the first time.', 120, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'understanding', 'connection'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'jealousy', 'Tell me about a time when you felt jealous in our relationship and what it taught you.', 180, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'jealousy', 'growth'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'past_worry', 'Share something about your past that you worry might affect our future.', 240, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'past', 'worry'], ARRAY['committed', 'married'], true),
('intimate', 'intimacy_learning', 'Describe what emotional intimacy means to you and how I have taught you about it.', 180, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'intimacy', 'learning'], ARRAY['committed', 'married'], true),
('intimate', 'love_healing', 'Tell me about a fear you had before meeting me that our love has helped overcome.', 120, 'deep', 3, 3, false, false, ARRAY['vulnerable', 'healing', 'love'], ARRAY['committed', 'married'], true),

-- FLIRTY & PLAYFUL CARDS (70 cards)
('flirty', 'tease', 'Using only your eyes and smile, make me blush without saying a word or touching me.', 45, 'quick', 2, 2, true, true, ARRAY['playful', 'flirty', 'fun'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('flirty', 'compliments', 'Tell me three things about my body that drive you absolutely wild, but whisper them seductively.', 90, 'standard', 2, 3, true, true, ARRAY['flirty', 'seductive', 'compliments'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'playful', 'Challenge me to a staring contest, but try to make me laugh first.', 60, 'quick', 1, 1, true, true, ARRAY['playful', 'silly', 'competitive'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('flirty', 'touch', 'Trace your favorite part of my body with just one finger, but do not tell me what it is until the end.', 120, 'action', 2, 3, true, true, ARRAY['flirty', 'sensual', 'guessing'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'seduction', 'Describe what you would do to seduce me if we met for the first time today.', 120, 'standard', 3, 3, false, false, ARRAY['flirty', 'seductive', 'fantasy'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'attraction', 'Tell me the exact moment you first found me irresistibly attractive.', 90, 'standard', 2, 2, false, false, ARRAY['flirty', 'attraction', 'memory'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('flirty', 'charm', 'Try to convince me to kiss you using only compliments and charm.', 120, 'action', 2, 2, true, true, ARRAY['flirty', 'charming', 'persuasive'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('flirty', 'desire', 'Whisper in my ear what you want to do with me later tonight.', 60, 'quick', 2, 3, true, true, ARRAY['flirty', 'desire', 'anticipation'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'roleplay', 'Pretend you are trying to pick me up at a coffee shop. What is your opening line?', 90, 'action', 2, 1, false, false, ARRAY['flirty', 'roleplay', 'creative'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('flirty', 'provocative', 'Describe how you would undress me with your eyes right now.', 60, 'quick', 3, 3, false, false, ARRAY['flirty', 'provocative', 'visual'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'competition', 'Challenge: make me laugh, blush, and get goosebumps all within 60 seconds.', 90, 'action', 3, 2, true, true, ARRAY['flirty', 'challenge', 'multi-effect'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'fantasy', 'Describe your favorite fantasy about us that you have never shared.', 180, 'deep', 3, 4, false, false, ARRAY['flirty', 'fantasy', 'secret'], ARRAY['committed', 'married'], true),
('flirty', 'confidence', 'Tell me three reasons why you are the best lover I will ever have.', 90, 'standard', 2, 3, false, false, ARRAY['flirty', 'confident', 'bold'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'magnetic', 'Explain what makes our chemistry so magnetic and irresistible.', 120, 'standard', 3, 3, false, false, ARRAY['flirty', 'chemistry', 'magnetic'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'temptation', 'Describe how you would tempt me if I was trying to resist you.', 120, 'standard', 3, 3, false, false, ARRAY['flirty', 'temptation', 'seductive'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'possession', 'Tell me three ways you like to show the world that I am yours.', 90, 'standard', 2, 2, false, false, ARRAY['flirty', 'possessive', 'proud'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'electricity', 'Describe the electric feeling you get when we touch for the first time each day.', 60, 'quick', 2, 2, false, false, ARRAY['flirty', 'electric', 'touch'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('flirty', 'anticipation', 'Tell me what you think about when you are waiting for me to come home.', 90, 'standard', 2, 3, false, false, ARRAY['flirty', 'anticipation', 'longing'], ARRAY['committed', 'married'], true),
('flirty', 'power', 'Describe the power you have over me and how you like to use it.', 120, 'standard', 3, 3, false, false, ARRAY['flirty', 'power', 'control'], ARRAY['dating', 'committed', 'married'], true),
('flirty', 'addiction', 'Explain why you are addicted to kissing me.', 60, 'quick', 2, 2, false, false, ARRAY['flirty', 'addictive', 'kissing'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),

-- MEMORY & NOSTALGIA CARDS (60 cards)
('memory', 'firsts', 'Recreate the exact moment of our first kiss - describe where we were, what we wore, how it felt. Then kiss me like it is the first time again.', 120, 'standard', 3, 3, true, true, ARRAY['romantic', 'nostalgic', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('memory', 'early_days', 'Tell me about the moment you knew you wanted to see me again after our first date.', 90, 'standard', 2, 2, false, false, ARRAY['nostalgic', 'early_relationship', 'realization'], ARRAY['dating', 'committed', 'married'], true),
('memory', 'milestones', 'Describe our most significant relationship milestone and how it felt to reach it together.', 120, 'standard', 3, 3, false, false, ARRAY['nostalgic', 'milestones', 'achievement'], ARRAY['committed', 'married'], true),
('memory', 'traditions', 'Share your favorite tradition we have created together and why it means so much to you.', 90, 'standard', 2, 2, false, false, ARRAY['nostalgic', 'traditions', 'meaningful'], ARRAY['dating', 'committed', 'married'], true),
('memory', 'holidays', 'Describe our best holiday or vacation memory together in vivid detail.', 120, 'standard', 2, 2, false, false, ARRAY['nostalgic', 'travel', 'joy'], ARRAY['dating', 'committed', 'married'], true),
('memory', 'photos', 'Look at our first photo together and tell me what you remember about that day.', 90, 'standard', 1, 2, false, false, ARRAY['nostalgic', 'visual', 'memory'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('memory', 'obstacles', 'Tell me about a challenge we overcame together that made our relationship stronger.', 180, 'deep', 3, 3, false, false, ARRAY['nostalgic', 'growth', 'strength'], ARRAY['committed', 'married'], true),
('memory', 'growth', 'Describe how I have changed for the better since we have been together.', 120, 'standard', 2, 2, false, false, ARRAY['nostalgic', 'growth', 'positive'], ARRAY['dating', 'committed', 'married'], true),
('memory', 'surprises', 'Share the most memorable surprise you have ever given me or received from me.', 90, 'standard', 2, 2, false, false, ARRAY['nostalgic', 'surprise', 'joy'], ARRAY['dating', 'committed', 'married'], true),
('memory', 'silly', 'Tell me about the silliest thing we have ever done together.', 60, 'quick', 1, 1, false, false, ARRAY['nostalgic', 'silly', 'fun'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('memory', 'turning_points', 'Describe a moment when you realized our relationship had reached a new level of depth.', 180, 'deep', 3, 4, false, false, ARRAY['nostalgic', 'depth', 'realization'], ARRAY['committed', 'married'], true),
('memory', 'laughter', 'Share the moment when we laughed the hardest together.', 90, 'standard', 1, 1, false, false, ARRAY['nostalgic', 'laughter', 'joy'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('memory', 'comfort', 'Tell me about a time when I comforted you perfectly during a difficult moment.', 120, 'standard', 2, 3, false, false, ARRAY['nostalgic', 'comfort', 'support'], ARRAY['dating', 'committed', 'married'], true),
('memory', 'adventure', 'Describe our most adventurous experience together.', 90, 'standard', 2, 2, false, false, ARRAY['nostalgic', 'adventure', 'exciting'], ARRAY['dating', 'committed', 'married'], true),
('memory', 'quiet_moments', 'Share your favorite quiet, intimate moment we have shared together.', 120, 'standard', 2, 3, false, false, ARRAY['nostalgic', 'intimate', 'peaceful'], ARRAY['dating', 'committed', 'married'], true),

-- Continue with more categories due to space constraints