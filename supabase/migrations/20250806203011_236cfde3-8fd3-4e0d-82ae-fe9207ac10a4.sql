-- Add 40 more photo response cards to reach 80 total
INSERT INTO deck_cards (category, subcategory, prompt, timer_category, timer_seconds, response_type, difficulty_level, intimacy_level, requires_physical_presence, is_active) VALUES

-- Sweet & Romantic Photos (10 cards)
('intimacy', 'romantic', 'Take a photo of your partner looking into your eyes', 'short', 120, 'photo', 1, 2, true, true),
('intimacy', 'romantic', 'Capture a sweet forehead kiss moment', 'short', 90, 'photo', 1, 3, true, true),
('intimacy', 'romantic', 'Take a photo holding hands in an interesting way', 'short', 60, 'photo', 1, 1, true, true),
('intimacy', 'romantic', 'Photograph your partner''s genuine laugh', 'short', 120, 'photo', 1, 1, false, true),
('intimacy', 'romantic', 'Take a mirror selfie together making heart hands', 'short', 90, 'photo', 1, 2, true, true),
('intimacy', 'romantic', 'Capture a photo of you two dancing together', 'short', 120, 'photo', 1, 2, true, true),
('intimacy', 'romantic', 'Take a photo recreating your first date pose', 'medium', 180, 'photo', 2, 2, true, true),
('intimacy', 'romantic', 'Photograph each other''s favorite facial feature', 'short', 90, 'photo', 1, 2, true, true),
('intimacy', 'romantic', 'Take a photo showing off your matching items/clothes', 'short', 120, 'photo', 1, 1, false, true),
('intimacy', 'romantic', 'Capture a candid moment of your partner being themselves', 'medium', 150, 'photo', 2, 2, false, true),

-- Fun & Playful Photos (10 cards)
('fun', 'playful', 'Take the silliest face photo contest', 'short', 90, 'photo', 1, 1, true, true),
('fun', 'playful', 'Photograph yourselves in superhero poses', 'short', 120, 'photo', 1, 1, true, true),
('fun', 'playful', 'Take a photo recreating a famous movie scene', 'medium', 180, 'photo', 2, 2, true, true),
('fun', 'playful', 'Capture yourselves doing the weirdest dance move', 'short', 90, 'photo', 1, 1, true, true),
('fun', 'playful', 'Take a photo with the most random object nearby', 'short', 60, 'photo', 1, 1, false, true),
('fun', 'playful', 'Photograph each other wearing something backwards', 'short', 90, 'photo', 1, 1, false, true),
('fun', 'playful', 'Take a photo pretending to be different animals', 'short', 120, 'photo', 1, 1, true, true),
('fun', 'playful', 'Capture yourselves making the most dramatic faces', 'short', 90, 'photo', 1, 1, true, true),
('fun', 'playful', 'Take a photo jumping at the same time', 'short', 120, 'photo', 1, 1, true, true),
('fun', 'playful', 'Photograph yourselves with exaggerated expressions of surprise', 'short', 90, 'photo', 1, 1, true, true),

-- Creative & Artistic Photos (10 cards)
('connection', 'creative', 'Take a photo using only shadows and light', 'medium', 180, 'photo', 3, 2, true, true),
('connection', 'creative', 'Capture a photo that represents your relationship', 'medium', 240, 'photo', 3, 3, false, true),
('connection', 'creative', 'Take a photo from a bird''s eye view', 'short', 120, 'photo', 2, 1, false, true),
('connection', 'creative', 'Photograph something that reminds you of your partner', 'medium', 180, 'photo', 2, 2, false, true),
('connection', 'creative', 'Take a photo using reflections (mirror, water, glass)', 'medium', 180, 'photo', 3, 2, false, true),
('connection', 'creative', 'Capture a photo with interesting lighting', 'medium', 150, 'photo', 2, 1, false, true),
('connection', 'creative', 'Take a photo that tells a story without words', 'medium', 240, 'photo', 3, 3, false, true),
('connection', 'creative', 'Photograph your hands creating a heart shape', 'short', 90, 'photo', 1, 2, true, true),
('connection', 'creative', 'Take a photo with natural frames (doorway, trees)', 'medium', 150, 'photo', 2, 1, false, true),
('connection', 'creative', 'Capture a photo from an unusual angle', 'short', 120, 'photo', 2, 1, false, true),

-- Memory & Nostalgia Photos (10 cards)
('memories', 'nostalgia', 'Take a photo recreating your profile pictures', 'medium', 180, 'photo', 2, 2, true, true),
('memories', 'nostalgia', 'Photograph something from your first month together', 'medium', 150, 'photo', 2, 3, false, true),
('memories', 'nostalgia', 'Take a photo in the style of your childhood photos', 'medium', 180, 'photo', 2, 2, true, true),
('memories', 'nostalgia', 'Capture a photo at the place you had your first kiss', 'medium', 120, 'photo', 2, 3, false, true),
('memories', 'nostalgia', 'Take a photo wearing each other''s clothes', 'short', 120, 'photo', 1, 2, true, true),
('memories', 'nostalgia', 'Photograph yourselves doing your partner''s favorite hobby', 'medium', 180, 'photo', 2, 2, false, true),
('memories', 'nostalgia', 'Take a photo with your favorite shared snack/drink', 'short', 90, 'photo', 1, 1, false, true),
('memories', 'nostalgia', 'Capture a photo of your favorite spot to cuddle', 'short', 120, 'photo', 1, 3, false, true),
('memories', 'nostalgia', 'Take a photo showing your different morning routines', 'medium', 180, 'photo', 2, 2, false, true),
('memories', 'nostalgia', 'Photograph each other''s "thinking face"', 'short', 90, 'photo', 1, 2, true, true);