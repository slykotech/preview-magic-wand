-- Delete all existing deck cards
DELETE FROM deck_cards;

-- Add response_type column if it doesn't exist
ALTER TABLE deck_cards 
ADD COLUMN IF NOT EXISTS response_type TEXT DEFAULT 'action';

-- Insert new 500 cards organized by response type
-- PHYSICAL/ACTION TASKS (250 cards)
-- Romantic & Sweet Action Cards (60 cards)
INSERT INTO deck_cards (category, subcategory, prompt, timer_seconds, timer_category, difficulty_level, intimacy_level, requires_action, requires_physical_presence, mood_tags, relationship_stage, response_type) VALUES
('romantic', 'sweet_actions', 'Give me a 30-second hug while whispering what you love about me', 120, 'medium', 1, 2, true, true, '{"loving","gentle"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Kiss my forehead and tell me three things that make you happy about us', 90, 'quick', 1, 2, true, true, '{"loving","tender"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Hold my hands and look into my eyes for 60 seconds without talking', 90, 'quick', 1, 3, true, true, '{"intimate","connecting"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Dance with me to our favorite song', 180, 'long', 2, 2, true, true, '{"playful","romantic"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Write "I love you" on my back with your finger and let me guess the words', 120, 'medium', 1, 2, true, true, '{"playful","loving"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Give me a gentle 2-minute shoulder massage', 150, 'medium', 1, 2, true, true, '{"caring","relaxing"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Trace the outline of my face with your finger', 60, 'quick', 1, 3, true, true, '{"tender","intimate"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Surprise me with a kiss somewhere unexpected', 45, 'quick', 1, 2, true, true, '{"spontaneous","playful"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Create a heart shape with our hands together', 30, 'quick', 1, 1, true, true, '{"cute","loving"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Give me three different types of kisses', 90, 'quick', 2, 3, true, true, '{"passionate","varied"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Hum our song while holding me close', 120, 'medium', 1, 2, true, true, '{"musical","romantic"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Brush my hair gently for 2 minutes', 150, 'medium', 1, 2, true, true, '{"caring","soothing"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Hold me from behind and sway together', 90, 'quick', 1, 2, true, true, '{"romantic","close"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Kiss each of my fingertips', 60, 'quick', 1, 2, true, true, '{"tender","detailed"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Give me a piggyback ride around the room', 120, 'medium', 2, 1, true, true, '{"playful","fun"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Slow dance with me without music', 150, 'medium', 2, 3, true, true, '{"romantic","intimate"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Massage my hands for 90 seconds', 120, 'medium', 1, 2, true, true, '{"caring","relaxing"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Give me butterfly kisses on my cheeks', 45, 'quick', 1, 2, true, true, '{"gentle","sweet"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Spell out "LOVE" using our bodies', 90, 'quick', 2, 1, true, true, '{"creative","playful"}', '{"all"}', 'action'),
('romantic', 'sweet_actions', 'Feed me something sweet and kiss me after', 120, 'medium', 1, 2, true, true, '{"sensual","caring"}', '{"all"}', 'action'),

-- Intimate & Vulnerable Action Cards (50 cards)
('intimate', 'vulnerable_actions', 'Look into my eyes and breathe together for 2 minutes', 150, 'medium', 2, 4, true, true, '{"deep","connecting"}', '{"committed","long_term"}', 'action'),
('intimate', 'vulnerable_actions', 'Place your hand on my heart and feel it beat for 30 seconds', 60, 'quick', 1, 3, true, true, '{"intimate","connecting"}', '{"all"}', 'action'),
('intimate', 'vulnerable_actions', 'Hold me tight and rock back and forth', 120, 'medium', 1, 3, true, true, '{"comforting","close"}', '{"all"}', 'action'),
('intimate', 'vulnerable_actions', 'Whisper your biggest fear about losing me', 90, 'quick', 3, 4, true, true, '{"vulnerable","deep"}', '{"committed","long_term"}', 'action'),
('intimate', 'vulnerable_actions', 'Show me through touch where you feel most connected to me', 120, 'medium', 2, 4, true, true, '{"intimate","exploring"}', '{"committed","long_term"}', 'action'),
('intimate', 'vulnerable_actions', 'Let me feel your pulse while you tell me what makes you feel alive', 90, 'quick', 2, 3, true, true, '{"deep","connecting"}', '{"all"}', 'action'),
('intimate', 'vulnerable_actions', 'Share our breath for 30 seconds', 60, 'quick', 2, 4, true, true, '{"intimate","vulnerable"}', '{"committed","long_term"}', 'action'),
('intimate', 'vulnerable_actions', 'Touch my face while sharing your deepest wish for us', 90, 'quick', 2, 3, true, true, '{"tender","hopeful"}', '{"all"}', 'action'),
('intimate', 'vulnerable_actions', 'Demonstrate how you want to be held when you''re sad', 120, 'medium', 2, 3, true, true, '{"caring","understanding"}', '{"all"}', 'action'),
('intimate', 'vulnerable_actions', 'Show me your most comforting touch', 90, 'quick', 1, 3, true, true, '{"comforting","caring"}', '{"all"}', 'action'),

-- Flirty & Playful Action Cards (40 cards)
('flirty', 'playful_actions', 'Give me your sexiest wink and pose', 30, 'quick', 1, 2, true, true, '{"flirty","confident"}', '{"all"}', 'action'),
('flirty', 'playful_actions', 'Seduce me using only your eyes for 30 seconds', 60, 'quick', 2, 3, true, true, '{"seductive","intense"}', '{"all"}', 'action'),
('flirty', 'playful_actions', 'Give me a playful butt slap', 15, 'quick', 1, 2, true, true, '{"playful","cheeky"}', '{"all"}', 'action'),
('flirty', 'playful_actions', 'Bite your lip while looking at me for 15 seconds', 30, 'quick', 1, 2, true, true, '{"flirty","teasing"}', '{"all"}', 'action'),
('flirty', 'playful_actions', 'Do your best sexy dance for 30 seconds', 60, 'quick', 2, 2, true, true, '{"confident","entertaining"}', '{"all"}', 'action'),
('flirty', 'playful_actions', 'Whisper something naughty in my ear', 30, 'quick', 2, 3, true, true, '{"seductive","intimate"}', '{"all"}', 'action'),
('flirty', 'playful_actions', 'Give me a kiss that shows how much you want me', 45, 'quick', 2, 3, true, true, '{"passionate","desiring"}', '{"all"}', 'action'),
('flirty', 'playful_actions', 'Use your finger to trace my lips', 30, 'quick', 1, 3, true, true, '{"sensual","teasing"}', '{"all"}', 'action'),
('flirty', 'playful_actions', 'Show me how you would seduce me if we just met', 90, 'quick', 2, 2, true, true, '{"roleplay","flirty"}', '{"all"}', 'action'),
('flirty', 'playful_actions', 'Give me a hickey somewhere discreet', 60, 'quick', 2, 3, true, true, '{"marking","passionate"}', '{"all"}', 'action'),

-- Spicy & Sensual Action Cards (30 cards)  
('spicy', 'sensual_actions', 'Give me a full body massage for 3 minutes', 210, 'long', 2, 4, true, true, '{"sensual","relaxing"}', '{"committed","long_term"}', 'action'),
('spicy', 'sensual_actions', 'Kiss my neck in three different ways', 90, 'quick', 2, 4, true, true, '{"passionate","varied"}', '{"all"}', 'action'),
('spicy', 'sensual_actions', 'Show me your favorite way to touch me', 120, 'medium', 2, 4, true, true, '{"intimate","personal"}', '{"committed","long_term"}', 'action'),
('spicy', 'sensual_actions', 'Undress me slowly with your eyes', 60, 'quick', 2, 3, true, true, '{"intense","desiring"}', '{"all"}', 'action'),
('spicy', 'sensual_actions', 'Use ice to trace patterns on my skin', 120, 'medium', 2, 4, true, true, '{"sensual","temperature"}', '{"committed","long_term"}', 'action'),
('spicy', 'sensual_actions', 'Blindfold me and touch me somewhere unexpected', 90, 'quick', 3, 4, true, true, '{"surprise","sensual"}', '{"committed","long_term"}', 'action'),
('spicy', 'sensual_actions', 'Show me what you want me to do to you', 120, 'medium', 3, 4, true, true, '{"demonstrative","intimate"}', '{"committed","long_term"}', 'action'),
('spicy', 'sensual_actions', 'Kiss me like you''ve been craving me all day', 60, 'quick', 2, 3, true, true, '{"passionate","hungry"}', '{"all"}', 'action'),
('spicy', 'sensual_actions', 'Use your mouth to explore my collarbone', 90, 'quick', 2, 4, true, true, '{"oral","exploring"}', '{"committed","long_term"}', 'action'),
('spicy', 'sensual_actions', 'Show me your bedroom eyes for 30 seconds', 45, 'quick', 1, 3, true, true, '{"seductive","intense"}', '{"all"}', 'action'),

-- Funny & Silly Action Cards (25 cards)
('funny', 'silly_actions', 'Do your worst impression of me', 60, 'quick', 1, 1, true, true, '{"humorous","mimicking"}', '{"all"}', 'action'),
('funny', 'silly_actions', 'Perform our most embarrassing dance move together', 90, 'quick', 2, 1, true, true, '{"embarrassing","fun"}', '{"all"}', 'action'),
('funny', 'silly_actions', 'Have a staring contest until one of us laughs', 120, 'medium', 1, 1, true, true, '{"competitive","funny"}', '{"all"}', 'action'),
('funny', 'silly_actions', 'Do 10 jumping jacks while declaring your love', 60, 'quick', 1, 1, true, true, '{"active","silly"}', '{"all"}', 'action'),
('funny', 'silly_actions', 'Pretend to be a robot and give me robot kisses', 90, 'quick', 2, 1, true, true, '{"roleplay","mechanical"}', '{"all"}', 'action'),
('funny', 'silly_actions', 'Sing "Happy Birthday" to our relationship', 45, 'quick', 1, 1, true, true, '{"musical","celebrating"}', '{"all"}', 'action'),
('funny', 'silly_actions', 'Do your best animal impression and let me guess', 60, 'quick', 1, 1, true, true, '{"animalistic","guessing"}', '{"all"}', 'action'),
('funny', 'silly_actions', 'Pretend you''re a secret agent trying to seduce me', 120, 'medium', 2, 2, true, true, '{"roleplay","spy"}', '{"all"}', 'action'),
('funny', 'silly_actions', 'Have a thumb wrestling match', 60, 'quick', 1, 1, true, true, '{"competitive","playful"}', '{"all"}', 'action'),
('funny', 'silly_actions', 'Do the worst pickup line you know with full commitment', 45, 'quick', 1, 1, true, true, '{"cheesy","confident"}', '{"all"}', 'action'),

-- Growth & Learning Action Cards (25 cards)
('growth', 'learning_actions', 'Show me through actions how you''ve grown since we met', 180, 'long', 3, 2, true, true, '{"demonstrative","evolving"}', '{"committed","long_term"}', 'action'),
('growth', 'learning_actions', 'Demonstrate a skill you want to teach me', 150, 'medium', 2, 1, true, true, '{"educational","sharing"}', '{"all"}', 'action'),
('growth', 'learning_actions', 'Practice a new way of showing affection for 30 seconds', 60, 'quick', 2, 2, true, true, '{"experimental","affectionate"}', '{"all"}', 'action'),
('growth', 'learning_actions', 'Show me your meditation or relaxation technique', 120, 'medium', 1, 2, true, true, '{"calming","sharing"}', '{"all"}', 'action'),
('growth', 'learning_actions', 'Demonstrate how you want to be comforted when stressed', 90, 'quick', 2, 2, true, true, '{"instructive","caring"}', '{"all"}', 'action'),

-- Daily Life & Habits Action Cards (20 cards)
('daily', 'habit_actions', 'Show me your morning routine in 60 seconds', 90, 'quick', 1, 1, true, true, '{"demonstrative","routine"}', '{"all"}', 'action'),
('daily', 'habit_actions', 'Demonstrate how you like your coffee/tea prepared', 120, 'medium', 1, 1, true, true, '{"instructive","preference"}', '{"all"}', 'action'),
('daily', 'habit_actions', 'Show me your favorite way to relax after work', 150, 'medium', 1, 1, true, true, '{"relaxing","personal"}', '{"all"}', 'action'),
('daily', 'habit_actions', 'Demonstrate your workout routine in 30 seconds', 60, 'quick', 1, 1, true, true, '{"active","healthy"}', '{"all"}', 'action'),
('daily', 'habit_actions', 'Show me how you want to be woken up', 60, 'quick', 1, 2, true, true, '{"gentle","preference"}', '{"all"}', 'action');

-- TEXT RESPONSE TASKS (150 cards)
-- Romantic & Sweet Text Cards (40 cards)
INSERT INTO deck_cards (category, subcategory, prompt, timer_seconds, timer_category, difficulty_level, intimacy_level, requires_action, requires_physical_presence, mood_tags, relationship_stage, response_type) VALUES
('romantic', 'sweet_questions', 'Write a short love poem about the way I make you feel', 300, 'long', 2, 3, false, false, '{"creative","loving"}', '{"all"}', 'text'),
('romantic', 'sweet_questions', 'Describe the exact moment you realized you were falling for me', 240, 'long', 2, 3, false, false, '{"memory","deep"}', '{"all"}', 'text'),
('romantic', 'sweet_questions', 'What are three things you want to accomplish together this year?', 180, 'medium', 1, 2, false, false, '{"future","planning"}', '{"all"}', 'text'),
('romantic', 'sweet_questions', 'If you could relive any day with me, which would it be and why?', 240, 'long', 2, 3, false, false, '{"memory","appreciation"}', '{"all"}', 'text'),
('romantic', 'sweet_questions', 'What song perfectly describes our love story?', 120, 'medium', 1, 2, false, false, '{"musical","romantic"}', '{"all"}', 'text'),
('romantic', 'sweet_questions', 'Write what you would say in wedding vows to me right now', 300, 'long', 3, 4, false, false, '{"commitment","future"}', '{"committed","long_term"}', 'text'),
('romantic', 'sweet_questions', 'Describe how I''ve changed your life for the better', 240, 'long', 2, 3, false, false, '{"impact","grateful"}', '{"all"}', 'text'),
('romantic', 'sweet_questions', 'What do you love most about waking up next to me?', 180, 'medium', 1, 3, false, false, '{"morning","intimate"}', '{"committed","long_term"}', 'text'),
('romantic', 'sweet_questions', 'If you could give me any gift in the world, what would it be?', 150, 'medium', 1, 2, false, false, '{"generous","thoughtful"}', '{"all"}', 'text'),
('romantic', 'sweet_questions', 'What''s your favorite way I show you I love you?', 120, 'medium', 1, 2, false, false, '{"appreciation","observant"}', '{"all"}', 'text'),

-- Intimate & Vulnerable Text Cards (30 cards)
('intimate', 'vulnerable_questions', 'What is your biggest fear about our relationship?', 240, 'long', 3, 4, false, false, '{"fear","vulnerable"}', '{"committed","long_term"}', 'text'),
('intimate', 'vulnerable_questions', 'Describe a time when I made you feel completely safe', 180, 'medium', 2, 3, false, false, '{"safety","trust"}', '{"all"}', 'text'),
('intimate', 'vulnerable_questions', 'What insecurity of yours do you want me to help you heal?', 300, 'long', 3, 4, false, false, '{"healing","support"}', '{"committed","long_term"}', 'text'),
('intimate', 'vulnerable_questions', 'How do you want me to support you during difficult times?', 240, 'long', 2, 3, false, false, '{"support","caring"}', '{"all"}', 'text'),
('intimate', 'vulnerable_questions', 'What part of yourself are you still learning to love?', 240, 'long', 3, 3, false, false, '{"self_love","growth"}', '{"all"}', 'text'),
('intimate', 'vulnerable_questions', 'Describe how being with me has helped you grow', 240, 'long', 2, 3, false, false, '{"growth","impact"}', '{"all"}', 'text'),
('intimate', 'vulnerable_questions', 'What do you need from me when you''re feeling overwhelmed?', 180, 'medium', 2, 3, false, false, '{"support","understanding"}', '{"all"}', 'text'),
('intimate', 'vulnerable_questions', 'Share a childhood memory that shaped who you are today', 300, 'long', 2, 3, false, false, '{"childhood","formative"}', '{"all"}', 'text'),
('intimate', 'vulnerable_questions', 'What''s the most challenging thing about loving someone?', 240, 'long', 3, 4, false, false, '{"challenging","deep"}', '{"committed","long_term"}', 'text'),
('intimate', 'vulnerable_questions', 'How has your definition of love changed since being with me?', 240, 'long', 2, 3, false, false, '{"evolving","love"}', '{"all"}', 'text'),

-- Future & Dreams Text Cards (25 cards)
('future', 'dreams_questions', 'Describe our perfect weekend together 10 years from now', 240, 'long', 2, 2, false, false, '{"future","domestic"}', '{"committed","long_term"}', 'text'),
('future', 'dreams_questions', 'What tradition do you want to start for our family?', 180, 'medium', 2, 2, false, false, '{"tradition","family"}', '{"committed","long_term"}', 'text'),
('future', 'dreams_questions', 'If we could travel anywhere together, where and why?', 150, 'medium', 1, 2, false, false, '{"travel","adventure"}', '{"all"}', 'text'),
('future', 'dreams_questions', 'What dream of yours do you want us to pursue together?', 180, 'medium', 2, 2, false, false, '{"shared_goals","ambitious"}', '{"all"}', 'text'),
('future', 'dreams_questions', 'How do you envision us supporting each other''s dreams?', 240, 'long', 2, 3, false, false, '{"mutual_support","partnership"}', '{"all"}', 'text'),

-- Memory & Nostalgia Text Cards (25 cards)
('memory', 'nostalgia_questions', 'Describe our first date from your perspective', 240, 'long', 1, 2, false, false, '{"first_time","romantic"}', '{"all"}', 'text'),
('memory', 'nostalgia_questions', 'What''s your favorite memory of us laughing together?', 180, 'medium', 1, 2, false, false, '{"laughter","joy"}', '{"all"}', 'text'),
('memory', 'nostalgia_questions', 'Tell me about a moment when you felt incredibly proud of me', 180, 'medium', 1, 2, false, false, '{"pride","support"}', '{"all"}', 'text'),
('memory', 'nostalgia_questions', 'What was your first impression of me and how has it changed?', 240, 'long', 1, 2, false, false, '{"first_impression","evolving"}', '{"all"}', 'text'),
('memory', 'nostalgia_questions', 'Describe a small moment between us that felt perfect', 180, 'medium', 1, 3, false, false, '{"perfect","small_moments"}', '{"all"}', 'text'),

-- Growth & Learning Text Cards (15 cards)
('growth', 'learning_questions', 'What life lesson have you learned since being with me?', 240, 'long', 2, 3, false, false, '{"wisdom","growth"}', '{"all"}', 'text'),
('growth', 'learning_questions', 'How do you want to grow as a person this year?', 180, 'medium', 2, 2, false, false, '{"self_improvement","goals"}', '{"all"}', 'text'),
('growth', 'learning_questions', 'What skill do you want us to learn together?', 120, 'medium', 1, 1, false, false, '{"shared_learning","skills"}', '{"all"}', 'text'),

-- Daily Life & Habits Text Cards (10 cards)
('daily', 'habit_questions', 'What daily habit of mine makes you smile?', 120, 'medium', 1, 1, false, false, '{"habits","appreciation"}', '{"all"}', 'text'),
('daily', 'habit_questions', 'Describe your ideal lazy Sunday with me', 180, 'medium', 1, 2, false, false, '{"relaxation","together"}', '{"all"}', 'text');

-- PHOTO RESPONSE TASKS (50 cards)
-- Romantic & Sweet Photo Cards (15 cards)
INSERT INTO deck_cards (category, subcategory, prompt, timer_seconds, timer_category, difficulty_level, intimacy_level, requires_action, requires_physical_presence, mood_tags, relationship_stage, response_type) VALUES
('romantic', 'sweet_photos', 'Take a selfie showing how you feel about me right now', 60, 'quick', 1, 2, false, false, '{"expressive","emotional"}', '{"all"}', 'photo'),
('romantic', 'sweet_photos', 'Capture something that reminds you of our love', 120, 'medium', 1, 2, false, false, '{"symbolic","meaningful"}', '{"all"}', 'photo'),
('romantic', 'sweet_photos', 'Take a photo of your hands making a heart shape', 30, 'quick', 1, 1, false, false, '{"symbolic","cute"}', '{"all"}', 'photo'),
('romantic', 'sweet_photos', 'Show me your favorite photo of us', 60, 'quick', 1, 2, false, false, '{"memory","favorite"}', '{"all"}', 'photo'),
('romantic', 'sweet_photos', 'Take a photo that represents our future together', 120, 'medium', 2, 2, false, false, '{"future","symbolic"}', '{"all"}', 'photo'),

-- Memory & Nostalgia Photo Cards (10 cards)
('memory', 'nostalgia_photos', 'Show me a photo from before we met that explains who you are', 90, 'quick', 1, 2, false, false, '{"past","identity"}', '{"all"}', 'photo'),
('memory', 'nostalgia_photos', 'Take a photo of something that reminds you of our first date', 120, 'medium', 1, 2, false, false, '{"first_date","memory"}', '{"all"}', 'photo'),
('memory', 'nostalgia_photos', 'Capture your facial expression when you think about our future', 45, 'quick', 1, 2, false, false, '{"future","expression"}', '{"all"}', 'photo'),

-- Flirty & Playful Photo Cards (10 cards)
('flirty', 'playful_photos', 'Take your sexiest selfie right now', 60, 'quick', 2, 2, false, false, '{"confident","attractive"}', '{"all"}', 'photo'),
('flirty', 'playful_photos', 'Show me your best "come here" look', 30, 'quick', 1, 2, false, false, '{"inviting","seductive"}', '{"all"}', 'photo'),
('flirty', 'playful_photos', 'Take a photo that would make me miss you', 90, 'quick', 2, 3, false, false, '{"longing","attractive"}', '{"all"}', 'photo'),

-- Funny & Silly Photo Cards (10 cards)
('funny', 'silly_photos', 'Take the weirdest selfie you can imagine', 60, 'quick', 1, 1, false, false, '{"weird","humorous"}', '{"all"}', 'photo'),
('funny', 'silly_photos', 'Show me your best "surprised" face', 30, 'quick', 1, 1, false, false, '{"surprised","expressive"}', '{"all"}', 'photo'),
('funny', 'silly_photos', 'Take a photo doing your worst dance move', 45, 'quick', 1, 1, false, false, '{"dancing","embarrassing"}', '{"all"}', 'photo'),

-- Creative Photo Cards (5 cards)
('creative', 'artistic_photos', 'Draw a picture of us and take a photo', 300, 'long', 2, 2, false, false, '{"artistic","creative"}', '{"all"}', 'photo'),
('creative', 'artistic_photos', 'Create art using household items that represents our relationship', 240, 'long', 3, 2, false, false, '{"creative","symbolic"}', '{"all"}', 'photo');

-- VOICE RESPONSE TASKS (50 cards)
-- Romantic & Sweet Voice Cards (15 cards)
INSERT INTO deck_cards (category, subcategory, prompt, timer_seconds, timer_category, difficulty_level, intimacy_level, requires_action, requires_physical_presence, mood_tags, relationship_stage, response_type) VALUES
('romantic', 'sweet_voice', 'Sing me a love song (even if you think you can''t sing)', 120, 'medium', 2, 2, false, false, '{"musical","vulnerable"}', '{"all"}', 'voice'),
('romantic', 'sweet_voice', 'Record yourself saying "I love you" in 5 different ways', 90, 'quick', 1, 2, false, false, '{"varied","loving"}', '{"all"}', 'voice'),
('romantic', 'sweet_voice', 'Tell me a bedtime story about us', 180, 'long', 2, 2, false, false, '{"storytelling","intimate"}', '{"all"}', 'voice'),
('romantic', 'sweet_voice', 'Whisper something that always makes you smile about me', 30, 'quick', 1, 2, false, false, '{"gentle","happy"}', '{"all"}', 'voice'),
('romantic', 'sweet_voice', 'Hum the song that makes you think of me', 60, 'quick', 1, 2, false, false, '{"musical","associative"}', '{"all"}', 'voice'),

-- Flirty & Playful Voice Cards (10 cards)
('flirty', 'playful_voice', 'Use your sexiest voice to tell me what you''re thinking', 45, 'quick', 2, 3, false, false, '{"seductive","confident"}', '{"all"}', 'voice'),
('flirty', 'playful_voice', 'Do your best pickup line in a funny accent', 30, 'quick', 1, 1, false, false, '{"humorous","accented"}', '{"all"}', 'voice'),
('flirty', 'playful_voice', 'Whisper something that would make me blush', 30, 'quick', 2, 3, false, false, '{"intimate","teasing"}', '{"all"}', 'voice'),

-- Funny & Silly Voice Cards (10 cards)
('funny', 'silly_voice', 'Do your best impression of a movie character telling me they love me', 60, 'quick', 2, 1, false, false, '{"imitation","entertaining"}', '{"all"}', 'voice'),
('funny', 'silly_voice', 'Sing "Happy Birthday" to our relationship in an opera voice', 45, 'quick', 2, 1, false, false, '{"musical","dramatic"}', '{"all"}', 'voice'),
('funny', 'silly_voice', 'Record yourself doing your worst dad joke', 30, 'quick', 1, 1, false, false, '{"cheesy","humorous"}', '{"all"}', 'voice'),

-- Memory & Nostalgia Voice Cards (10 cards)
('memory', 'nostalgia_voice', 'Tell me about your favorite memory of us in detail', 180, 'long', 1, 2, false, false, '{"detailed","nostalgic"}', '{"all"}', 'voice'),
('memory', 'nostalgia_voice', 'Describe how you felt the first time you said "I love you" to me', 120, 'medium', 2, 3, false, false, '{"first_time","emotional"}', '{"all"}', 'voice'),

-- Growth & Learning Voice Cards (5 cards)
('growth', 'learning_voice', 'Share a life lesson you want to pass on to our future children', 180, 'long', 2, 2, false, false, '{"wisdom","future"}', '{"committed","long_term"}', 'voice');