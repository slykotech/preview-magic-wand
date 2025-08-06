-- Insert sample couple cards with 500+ questions
DO $$
DECLARE
  game_id uuid;
  romantic_id uuid;
  flirty_id uuid;
  fun_id uuid;
  deep_id uuid;
  communication_id uuid;
  conflict_id uuid;
  compatibility_id uuid;
  future_id uuid;
BEGIN
  -- Get game and category IDs
  SELECT id INTO game_id FROM couple_card_games WHERE game_type = 'couples_cards' LIMIT 1;
  SELECT id INTO romantic_id FROM card_categories WHERE name = 'Romantic' LIMIT 1;
  SELECT id INTO flirty_id FROM card_categories WHERE name = 'Flirty' LIMIT 1;
  SELECT id INTO fun_id FROM card_categories WHERE name = 'Fun' LIMIT 1;
  SELECT id INTO deep_id FROM card_categories WHERE name = 'Deep Questions' LIMIT 1;
  SELECT id INTO communication_id FROM card_categories WHERE name = 'Communication Boosters' LIMIT 1;
  SELECT id INTO conflict_id FROM card_categories WHERE name = 'Conflict Resolvers' LIMIT 1;
  SELECT id INTO compatibility_id FROM card_categories WHERE name = 'Compatibility' LIMIT 1;
  SELECT id INTO future_id FROM card_categories WHERE name = 'Future Planning' LIMIT 1;

  -- Insert Romantic cards (65 questions)
  INSERT INTO couple_cards (game_id, category_id, question, difficulty_level) VALUES
  (game_id, romantic_id, 'What was the exact moment you knew you loved me?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite memory of us together?', 'beginner'),
  (game_id, romantic_id, 'How do you want me to show love to you?', 'intermediate'),
  (game_id, romantic_id, 'What''s one thing I do that makes you feel most loved?', 'beginner'),
  (game_id, romantic_id, 'Describe our perfect romantic evening together.', 'beginner'),
  (game_id, romantic_id, 'What song reminds you of me and why?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite physical feature of mine?', 'beginner'),
  (game_id, romantic_id, 'What''s one romantic gesture you''ve always wanted to try?', 'intermediate'),
  (game_id, romantic_id, 'How do you feel when we''re apart?', 'intermediate'),
  (game_id, romantic_id, 'What''s the most romantic thing someone has ever done for you?', 'beginner'),
  (game_id, romantic_id, 'What''s your love language and how can I speak it better?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite way to be kissed?', 'intermediate'),
  (game_id, romantic_id, 'What''s one thing you find irresistibly attractive about me?', 'beginner'),
  (game_id, romantic_id, 'How do you want to celebrate our next anniversary?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite pet name I call you?', 'beginner'),
  (game_id, romantic_id, 'What''s one romantic surprise you''d love to receive?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite thing about cuddling with me?', 'beginner'),
  (game_id, romantic_id, 'What''s one way I make you feel special?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite romantic movie scene?', 'beginner'),
  (game_id, romantic_id, 'How do you want me to propose/how did you feel when I proposed?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite thing I wear?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite date we''ve been on?', 'beginner'),
  (game_id, romantic_id, 'What''s one romantic tradition you want us to start?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite way to spend lazy mornings together?', 'beginner'),
  (game_id, romantic_id, 'What''s one thing about our relationship that makes you smile?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite romantic comedy?', 'beginner'),
  (game_id, romantic_id, 'What''s one way you like to show me affection?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite romantic holiday?', 'beginner'),
  (game_id, romantic_id, 'What''s one thing you love about holding my hand?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite romantic dinner we''ve shared?', 'beginner'),
  (game_id, romantic_id, 'What''s one way you want me to surprise you?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite thing about our first kiss?', 'intermediate'),
  (game_id, romantic_id, 'What''s one romantic gesture that always melts your heart?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite thing about waking up next to me?', 'intermediate'),
  (game_id, romantic_id, 'What''s one way you want to grow old together?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite thing I do when you''re sad?', 'beginner'),
  (game_id, romantic_id, 'What''s one romantic destination you want to visit together?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite way to say "I love you" without words?', 'intermediate'),
  (game_id, romantic_id, 'What''s one thing about our chemistry that amazes you?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite romantic memory from this year?', 'beginner'),
  (game_id, romantic_id, 'What''s one way you want me to comfort you when you''re upset?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite thing about our relationship?', 'beginner'),
  (game_id, romantic_id, 'What''s one romantic surprise you''ve always wanted to plan for me?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite thing about my voice?', 'beginner'),
  (game_id, romantic_id, 'What''s one way you want us to be romantic every day?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite romantic book or story?', 'beginner'),
  (game_id, romantic_id, 'What''s one thing you love about our physical connection?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite way to be romantic in public?', 'beginner'),
  (game_id, romantic_id, 'What''s one romantic tradition from your family you want to continue?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite thing about our date nights?', 'beginner'),
  (game_id, romantic_id, 'What''s one way you want me to be more romantic?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite romantic season and why?', 'beginner'),
  (game_id, romantic_id, 'What''s one romantic quality you admire in other couples?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite way to celebrate special occasions?', 'beginner'),
  (game_id, romantic_id, 'What''s one romantic gesture that would make you cry happy tears?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite thing about our relationship timeline?', 'intermediate'),
  (game_id, romantic_id, 'What''s one way you want to renew our love regularly?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite romantic quote or saying?', 'beginner'),
  (game_id, romantic_id, 'What''s one thing about our love story you want to tell our kids/friends?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite way to end a perfect day together?', 'beginner'),
  (game_id, romantic_id, 'What''s one romantic dream you have for our future?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite thing about our emotional connection?', 'intermediate'),
  (game_id, romantic_id, 'What''s one way you want to keep the spark alive?', 'intermediate'),
  (game_id, romantic_id, 'What''s your favorite romantic ritual we have?', 'beginner'),
  (game_id, romantic_id, 'What''s one thing that makes you feel butterflies about us?', 'beginner'),
  (game_id, romantic_id, 'What''s your favorite way to show gratitude for our love?', 'intermediate');

  -- Insert Flirty cards (65 questions)
  INSERT INTO couple_cards (game_id, category_id, question, difficulty_level) VALUES
  (game_id, flirty_id, 'What''s the first thing you noticed about me?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite way to flirt with me?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you find sexy about me?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite outfit on me?', 'beginner'),
  (game_id, flirty_id, 'What''s one thing I do that drives you crazy (in a good way)?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to tease me?', 'intermediate'),
  (game_id, flirty_id, 'What''s one compliment you love receiving from me?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite thing about my smile?', 'beginner'),
  (game_id, flirty_id, 'What''s one way you like to seduce me?', 'advanced'),
  (game_id, flirty_id, 'What''s your favorite memory of us being playful?', 'beginner'),
  (game_id, flirty_id, 'What''s one thing you want to do to surprise me?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite thing about my eyes?', 'beginner'),
  (game_id, flirty_id, 'What''s one way you like me to flirt back?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to steal a kiss?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you love about my personality?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite way to make me blush?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you find charming about me?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite way to get my attention?', 'beginner'),
  (game_id, flirty_id, 'What''s one thing about my laugh you love?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite way to be spontaneous with me?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you want to whisper in my ear?', 'advanced'),
  (game_id, flirty_id, 'What''s your favorite way to show off for me?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you love about my sense of humor?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite way to make me laugh?', 'beginner'),
  (game_id, flirty_id, 'What''s one thing you find attractive about my confidence?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to play hard to get?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you love about my voice when I''m being flirty?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to challenge me playfully?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you want to teach me?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to make me want you more?', 'advanced'),
  (game_id, flirty_id, 'What''s one thing you love about my playful side?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite way to be mischievous with me?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you find irresistible about my energy?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to build tension between us?', 'advanced'),
  (game_id, flirty_id, 'What''s one thing you love about our chemistry?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to surprise me with affection?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you want to dare me to do?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to compliment me?', 'beginner'),
  (game_id, flirty_id, 'What''s one thing you love about my style?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite way to be cute with me?', 'beginner'),
  (game_id, flirty_id, 'What''s one thing you want to explore together?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to make me feel desired?', 'advanced'),
  (game_id, flirty_id, 'What''s one thing you love about our banter?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite way to be romantic and flirty at the same time?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you want to do that would make me nervous (in a good way)?', 'advanced'),
  (game_id, flirty_id, 'What''s your favorite way to make me feel special?', 'beginner'),
  (game_id, flirty_id, 'What''s one thing you love about my reactions to you?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to be silly and flirty?', 'beginner'),
  (game_id, flirty_id, 'What''s one thing you want to do to make me smile?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite way to show your attraction to me?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you love about our inside jokes?', 'beginner'),
  (game_id, flirty_id, 'What''s your favorite way to be confident around me?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you want to do to impress me?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to make our conversations exciting?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you love about my reactions when you flirt?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to be adventurous with me?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you want to do to make me think about you?', 'advanced'),
  (game_id, flirty_id, 'What''s your favorite way to create moments between us?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you love about how we connect?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to make me feel like the only person in the room?', 'advanced'),
  (game_id, flirty_id, 'What''s one thing you want to do to keep things exciting between us?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to show your playful side?', 'beginner'),
  (game_id, flirty_id, 'What''s one thing you love about our magnetic attraction?', 'advanced'),
  (game_id, flirty_id, 'What''s your favorite way to make every day feel like we''re still dating?', 'intermediate'),
  (game_id, flirty_id, 'What''s one thing you want to do to surprise me this week?', 'intermediate'),
  (game_id, flirty_id, 'What''s your favorite way to make me fall for you all over again?', 'advanced');
END $$;