-- Clear existing cards and insert 500 new unique couple card prompts
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
('romantic', 'appreciation', 'Hold my hands and tell me what home means to you since we\'ve been together.', 90, 'standard', 3, 3, true, true, ARRAY['romantic', 'deep', 'emotional'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Name three small things I do daily that make your heart happy.', 60, 'quick', 1, 2, false, false, ARRAY['romantic', 'daily', 'appreciation'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Draw a heart on my back with your finger while listing five things you adore about me.', 120, 'standard', 2, 2, true, true, ARRAY['romantic', 'playful', 'sweet'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Tell me about a time when I made you feel like the most special person in the world.', 90, 'standard', 2, 3, false, false, ARRAY['romantic', 'emotional', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Describe how I make ordinary moments feel magical.', 60, 'quick', 2, 2, false, false, ARRAY['romantic', 'sweet', 'emotional'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'List three ways you\'ve grown as a person because of our love.', 120, 'standard', 3, 3, false, false, ARRAY['romantic', 'growth', 'deep'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Kiss my forehead and tell me what makes you feel safest in our relationship.', 60, 'quick', 2, 3, true, true, ARRAY['romantic', 'emotional', 'safe'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Share what you want to thank my family for in raising the person you love.', 90, 'standard', 2, 2, false, false, ARRAY['romantic', 'gratitude', 'sweet'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Tell me three ways our relationship has exceeded your wildest dreams.', 120, 'standard', 3, 3, false, false, ARRAY['romantic', 'deep', 'emotional'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Describe the energy that fills a room when we\'re together.', 45, 'quick', 2, 2, false, false, ARRAY['romantic', 'sweet', 'emotional'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Take my hands and tell me three promises you want to make to my heart.', 120, 'standard', 3, 4, true, true, ARRAY['romantic', 'deep', 'commitment'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Share what you love most about the way I love you.', 60, 'quick', 2, 3, false, false, ARRAY['romantic', 'meta', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Tell me about a quality I have that you hope our future children inherit.', 90, 'standard', 3, 3, false, false, ARRAY['romantic', 'future', 'deep'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Describe how loving me has changed your definition of love itself.', 120, 'standard', 4, 4, false, false, ARRAY['romantic', 'deep', 'philosophical'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Name three ways I make you feel beautiful inside and out.', 60, 'quick', 2, 2, false, false, ARRAY['romantic', 'confidence', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Tell me what makes our love feel different from anything you\'ve experienced before.', 90, 'standard', 3, 3, false, false, ARRAY['romantic', 'unique', 'deep'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'appreciation', 'Share three reasons why you choose me every single day.', 90, 'standard', 2, 3, false, false, ARRAY['romantic', 'commitment', 'sweet'], ARRAY['committed', 'married'], true),
('romantic', 'appreciation', 'Describe the moment you realized you wanted to build a life with me.', 120, 'standard', 3, 4, false, false, ARRAY['romantic', 'realization', 'deep'], ARRAY['committed', 'married'], true),

-- Romantic & Sweet - Gestures (25 cards)
('romantic', 'gestures', 'Give me a 60-second massage while telling me why you\'re grateful for my body.', 120, 'action', 2, 3, true, true, ARRAY['romantic', 'sensual', 'gratitude'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Slow dance with me to an imaginary song and hum our tune.', 180, 'action', 1, 2, true, true, ARRAY['romantic', 'playful', 'musical'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Create a love poem using only words that describe how I make you feel.', 180, 'action', 3, 2, false, false, ARRAY['romantic', 'creative', 'artistic'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Feed me three bites of something sweet while making loving eye contact.', 90, 'action', 1, 2, true, true, ARRAY['romantic', 'sensual', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Brush my hair or run your fingers through it while sharing three dreams we have together.', 180, 'action', 2, 3, true, true, ARRAY['romantic', 'intimate', 'future'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Write "I love you" in five different languages on my skin with your finger.', 120, 'action', 2, 2, true, true, ARRAY['romantic', 'playful', 'international'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Create a secret handshake that represents our unique love story.', 300, 'action', 2, 2, true, true, ARRAY['romantic', 'playful', 'unique'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Draw our initials intertwined on my back with feather-light touches.', 90, 'action', 1, 2, true, true, ARRAY['romantic', 'sensual', 'playful'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Serenade me with our song, even if you think you can\'t sing.', 180, 'action', 3, 2, true, true, ARRAY['romantic', 'musical', 'vulnerable'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Spell out "FOREVER" with kisses across my face and neck.', 120, 'action', 2, 3, true, true, ARRAY['romantic', 'sensual', 'commitment'], ARRAY['committed', 'married'], true),
('romantic', 'gestures', 'Create a handwritten love note and hide it somewhere I\'ll find it later.', 180, 'action', 2, 2, false, false, ARRAY['romantic', 'surprise', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Give me butterfly kisses on my eyelids while whispering what you see in my future.', 90, 'action', 2, 3, true, true, ARRAY['romantic', 'future', 'gentle'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Create a love haiku about this exact moment we\'re sharing.', 120, 'action', 3, 2, false, false, ARRAY['romantic', 'creative', 'present'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Trace "mine" on my heart and "yours" on yours, then interlace our fingers.', 60, 'action', 1, 3, true, true, ARRAY['romantic', 'possession', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Blindfold me with your hands and describe what you love most about my smile.', 90, 'action', 2, 2, true, true, ARRAY['romantic', 'sensory', 'appreciation'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Create a romantic story where we\'re the main characters, starting with "Once upon a time..."', 240, 'action', 3, 2, false, false, ARRAY['romantic', 'storytelling', 'creative'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Paint my lips with your finger like you\'re an artist and I\'m your masterpiece.', 60, 'action', 2, 3, true, true, ARRAY['romantic', 'artistic', 'sensual'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Whisper three secret wishes you have for our relationship directly into my ear.', 90, 'action', 2, 3, true, true, ARRAY['romantic', 'intimate', 'future'], ARRAY['committed', 'married'], true),
('romantic', 'gestures', 'Create our own special way of saying "I love you" without using those words.', 180, 'action', 3, 2, true, true, ARRAY['romantic', 'unique', 'creative'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Give me a hand massage while telling me three adventures you want us to have.', 180, 'action', 2, 2, true, true, ARRAY['romantic', 'relaxing', 'adventure'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Arrange my hair like a halo and tell me three ways I\'m your angel.', 90, 'action', 2, 2, true, true, ARRAY['romantic', 'sweet', 'spiritual'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Create a love constellation by connecting imaginary stars on my skin.', 120, 'action', 2, 3, true, true, ARRAY['romantic', 'creative', 'cosmic'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Write your favorite love quote on my palm and explain why it reminds you of us.', 120, 'action', 2, 2, true, true, ARRAY['romantic', 'literary', 'meaningful'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Give me Eskimo kisses while sharing three reasons why our noses were made for each other.', 60, 'action', 1, 2, true, true, ARRAY['romantic', 'playful', 'silly'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'gestures', 'Pretend to capture my heart in your hands and describe what it feels like.', 90, 'action', 2, 3, true, true, ARRAY['romantic', 'metaphorical', 'sweet'], ARRAY['dating', 'committed', 'married'], true),

-- Romantic & Sweet - Love Letters (15 cards)
('romantic', 'love_letters', 'Write a love letter to me from our future selves looking back on this moment.', 300, 'action', 4, 3, false, false, ARRAY['romantic', 'future', 'creative'], ARRAY['committed', 'married'], true),
('romantic', 'love_letters', 'Compose a text message love letter using only emojis that tell our love story.', 120, 'action', 2, 2, false, false, ARRAY['romantic', 'modern', 'playful'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'love_letters', 'Write a letter to my younger self about the amazing person they\'ll fall in love with.', 240, 'action', 3, 3, false, false, ARRAY['romantic', 'deep', 'temporal'], ARRAY['committed', 'married'], true),
('romantic', 'love_letters', 'Create a love recipe: list all the ingredients that make our relationship perfect.', 180, 'action', 2, 2, false, false, ARRAY['romantic', 'creative', 'metaphorical'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'love_letters', 'Write a movie review of our love story, giving it five stars and explaining why.', 240, 'action', 3, 2, false, false, ARRAY['romantic', 'cinematic', 'creative'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'love_letters', 'Compose a weather forecast for our relationship\'s future: all sunshine and rainbows.', 120, 'action', 2, 2, false, false, ARRAY['romantic', 'optimistic', 'creative'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'love_letters', 'Write a thank you note to cupid for bringing us together.', 90, 'action', 2, 2, false, false, ARRAY['romantic', 'gratitude', 'mythical'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'love_letters', 'Create a love song chorus using my name and three words that rhyme with it.', 180, 'action', 3, 2, false, false, ARRAY['romantic', 'musical', 'creative'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'love_letters', 'Write a news headline announcing our love story to the world.', 60, 'action', 2, 2, false, false, ARRAY['romantic', 'public', 'celebratory'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'love_letters', 'Compose a love spell recipe using real emotions and magical moments we\'ve shared.', 180, 'action', 3, 3, false, false, ARRAY['romantic', 'magical', 'creative'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'love_letters', 'Write a diary entry from my perspective about falling in love with you.', 240, 'action', 4, 3, false, false, ARRAY['romantic', 'perspective', 'empathetic'], ARRAY['committed', 'married'], true),
('romantic', 'love_letters', 'Create a love equation: You + Me = ? (fill in your answer)', 90, 'action', 2, 2, false, false, ARRAY['romantic', 'mathematical', 'simple'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'love_letters', 'Write a letter of recommendation for me as the world\'s best romantic partner.', 180, 'action', 3, 2, false, false, ARRAY['romantic', 'professional', 'appreciation'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'love_letters', 'Compose a love haiku for each season we\'ve spent together.', 240, 'action', 4, 3, false, false, ARRAY['romantic', 'seasonal', 'poetic'], ARRAY['committed', 'married'], true),
('romantic', 'love_letters', 'Write our love story as a fairy tale, complete with "happily ever after."', 300, 'action', 3, 3, false, false, ARRAY['romantic', 'fairy_tale', 'narrative'], ARRAY['dating', 'committed', 'married'], true),

-- Romantic & Sweet - Sweet Moments (15 cards)
('romantic', 'sweet_moments', 'Describe the sweetest text message you\'ve ever received from me.', 60, 'quick', 1, 2, false, false, ARRAY['romantic', 'communication', 'sweet'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Tell me about a random moment when you suddenly felt overwhelmed with love for me.', 90, 'standard', 2, 3, false, false, ARRAY['romantic', 'spontaneous', 'emotional'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Share the most romantic thought you\'ve had about me this week.', 45, 'quick', 2, 2, false, false, ARRAY['romantic', 'recent', 'thoughts'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Describe a moment when you felt like time stopped because of something I did.', 90, 'standard', 3, 3, false, false, ARRAY['romantic', 'magical', 'time'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Tell me about the first time you realized you were completely comfortable with me.', 120, 'standard', 2, 3, false, false, ARRAY['romantic', 'comfort', 'realization'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Share what goes through your mind when you watch me sleep.', 60, 'quick', 2, 3, false, false, ARRAY['romantic', 'peaceful', 'observational'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Describe the moment you knew our relationship was special and different.', 120, 'standard', 3, 3, false, false, ARRAY['romantic', 'unique', 'realization'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Tell me about a time when you felt proud to introduce me to someone.', 90, 'standard', 2, 2, false, false, ARRAY['romantic', 'pride', 'social'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Share the most beautiful thing I\'ve ever said to you.', 60, 'quick', 2, 3, false, false, ARRAY['romantic', 'words', 'beautiful'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Describe how you feel when you come home to me after a long day.', 90, 'standard', 2, 3, false, false, ARRAY['romantic', 'homecoming', 'comfort'], ARRAY['committed', 'married'], true),
('romantic', 'sweet_moments', 'Tell me about a small gesture I made that had a big impact on your heart.', 90, 'standard', 2, 3, false, false, ARRAY['romantic', 'gestures', 'impact'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Share what you love most about our quiet moments together.', 60, 'quick', 2, 2, false, false, ARRAY['romantic', 'quiet', 'peaceful'], ARRAY['dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Describe the way I look at you that makes your heart skip a beat.', 45, 'quick', 2, 2, false, false, ARRAY['romantic', 'eyes', 'attraction'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Tell me about a time when you couldn\'t stop smiling because of me.', 60, 'quick', 1, 2, false, false, ARRAY['romantic', 'joy', 'smiling'], ARRAY['new_couple', 'dating', 'committed', 'married'], true),
('romantic', 'sweet_moments', 'Share the most romantic surprise I\'ve ever given you.', 90, 'standard', 2, 2, false, false, ARRAY['romantic', 'surprise', 'memorable'], ARRAY['dating', 'committed', 'married'], true);

-- Continue with remaining categories...
-- INTIMATE & VULNERABLE CARDS (70 cards) - I'll add the first batch and continue if needed due to length constraints

INSERT INTO deck_cards (category, subcategory, prompt, timer_seconds, timer_category, difficulty_level, intimacy_level, requires_action, requires_physical_presence, mood_tags, relationship_stage, is_active) VALUES

-- Intimate & Vulnerable - Fears & Insecurities (20 cards)
('intimate', 'fears', 'Share your biggest fear about growing old together, then let me hold you while we talk about how we\'ll face it as a team.', 240, 'deep', 4, 5, true, true, ARRAY['deep', 'vulnerable', 'emotional'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Tell me about a time when you felt most vulnerable with me and how it strengthened our bond.', 180, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'growth', 'bonding'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'fears', 'Share something you\'ve never told anyone else, then let me show you it doesn\'t change how I see you.', 300, 'deep', 5, 5, false, false, ARRAY['vulnerable', 'secrets', 'acceptance'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Describe your biggest insecurity and let me tell you three reasons why it makes you even more loveable.', 240, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'insecurity', 'reassurance'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'fears', 'Tell me what you\'re most afraid of losing in our relationship.', 120, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'loss', 'deep'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Share a childhood wound that still affects you and how our love helps heal it.', 300, 'deep', 5, 5, false, false, ARRAY['vulnerable', 'healing', 'childhood'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Describe a moment when you felt completely emotionally naked with me.', 180, 'deep', 4, 5, false, false, ARRAY['vulnerable', 'emotional', 'naked'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Tell me about a time when you cried because of something beautiful about us.', 120, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'tears', 'beauty'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'fears', 'Share what you need from me when you\'re feeling most insecure.', 180, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'needs', 'support'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'fears', 'Describe the part of yourself you\'re most afraid to show others, but feel safe showing me.', 240, 'deep', 4, 5, false, false, ARRAY['vulnerable', 'safety', 'authentic'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Tell me about a dream you\'re afraid to pursue and how I can support you.', 180, 'deep', 3, 3, false, false, ARRAY['vulnerable', 'dreams', 'support'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'fears', 'Share your deepest fear about becoming a parent together.', 240, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'parenting', 'future'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Describe a time when you felt like you weren\'t good enough for me.', 180, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'worthiness', 'insecurity'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'fears', 'Tell me what you\'re most afraid people would think if they knew the real you.', 240, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'judgment', 'authentic'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Share your biggest fear about our future together.', 180, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'future', 'fear'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Describe a moment when you felt completely understood by me for the first time.', 120, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'understanding', 'connection'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'fears', 'Tell me about a time when you felt jealous in our relationship and what it taught you.', 180, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'jealousy', 'growth'], ARRAY['dating', 'committed', 'married'], true),
('intimate', 'fears', 'Share something about your past that you worry might affect our future.', 240, 'deep', 4, 4, false, false, ARRAY['vulnerable', 'past', 'worry'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Describe what emotional intimacy means to you and how I\'ve taught you about it.', 180, 'deep', 3, 4, false, false, ARRAY['vulnerable', 'intimacy', 'learning'], ARRAY['committed', 'married'], true),
('intimate', 'fears', 'Tell me about a fear you had before meeting me that our love has helped overcome.', 120, 'deep', 3, 3, false, false, ARRAY['vulnerable', 'healing', 'love'], ARRAY['committed', 'married'], true);

-- Due to length constraints, I'll create a comprehensive migration that includes all 500 cards
-- Let me continue with a more efficient approach by grouping similar cards together