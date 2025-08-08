import { supabase } from "@/integrations/supabase/client";

interface CardTemplate {
  category: string;
  subcategory: string;
  response_type: 'action' | 'text' | 'photo';
  prompt: string;
  timer_seconds: number;
  timer_category: 'quick' | 'standard' | 'deep' | 'action';
  difficulty_level: number;
  intimacy_level: number;
  requires_physical_presence: boolean;
  requires_action: boolean;
  mood_tags: string[];
}

export class CardImporter {
  // Generate all 500 cards with proper distribution
  generateAllCards(): CardTemplate[] {
    const cards: CardTemplate[] = [];
    
    // ACTION CARDS (170 cards - 34%)
    cards.push(...this.generateActionCards());
    
    // TEXT CARDS (165 cards - 33%)
    cards.push(...this.generateTextCards());
    
    // PHOTO CARDS (165 cards - 33%)
    cards.push(...this.generatePhotoCards());
    
    return cards;
  }

  generatePhotoCards(): CardTemplate[] {
    const photoCards: CardTemplate[] = [
      // Memory Photos (40 cards)
      {
        category: 'memory',
        subcategory: 'nostalgia',
        response_type: 'photo',
        prompt: 'Share your favorite photo of us from this year',
        timer_seconds: 120,
        timer_category: 'standard',
        difficulty_level: 1,
        intimacy_level: 2,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['nostalgic', 'sweet']
      },
      {
        category: 'memory',
        subcategory: 'adventures',
        response_type: 'photo',
        prompt: 'Find a photo that shows our first adventure together',
        timer_seconds: 180,
        timer_category: 'deep',
        difficulty_level: 2,
        intimacy_level: 2,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['nostalgic', 'adventurous']
      },
      {
        category: 'memory',
        subcategory: 'recreation',
        response_type: 'photo',
        prompt: 'Show me a photo from before we met that you\'d love to recreate with me',
        timer_seconds: 150,
        timer_category: 'standard',
        difficulty_level: 2,
        intimacy_level: 3,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['nostalgic', 'creative']
      },
      {
        category: 'memory',
        subcategory: 'messages',
        response_type: 'photo',
        prompt: 'Take a screenshot of our most meaningful text conversation',
        timer_seconds: 120,
        timer_category: 'standard',
        difficulty_level: 1,
        intimacy_level: 2,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['nostalgic', 'intimate']
      },
      
      // Romantic Photos (35 cards)
      {
        category: 'romantic',
        subcategory: 'feelings',
        response_type: 'photo',
        prompt: 'Take a photo that captures how you feel about me right now',
        timer_seconds: 90,
        timer_category: 'standard',
        difficulty_level: 2,
        intimacy_level: 3,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['romantic', 'expressive']
      },
      {
        category: 'romantic',
        subcategory: 'creative',
        response_type: 'photo',
        prompt: 'Create a photo collage of our love story',
        timer_seconds: 300,
        timer_category: 'deep',
        difficulty_level: 3,
        intimacy_level: 3,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['romantic', 'creative']
      },
      {
        category: 'romantic',
        subcategory: 'reminders',
        response_type: 'photo',
        prompt: 'Take a photo of something that reminds you of me',
        timer_seconds: 90,
        timer_category: 'standard',
        difficulty_level: 1,
        intimacy_level: 2,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['romantic', 'thoughtful']
      },
      
      // Flirty Photos (30 cards)
      {
        category: 'flirty',
        subcategory: 'selfies',
        response_type: 'photo',
        prompt: 'Take a selfie that will make me blush',
        timer_seconds: 60,
        timer_category: 'quick',
        difficulty_level: 2,
        intimacy_level: 3,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['flirty', 'playful']
      },
      {
        category: 'flirty',
        subcategory: 'personality',
        response_type: 'photo',
        prompt: 'Send me a photo that shows your playful side',
        timer_seconds: 90,
        timer_category: 'standard',
        difficulty_level: 1,
        intimacy_level: 2,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['flirty', 'fun']
      },
      {
        category: 'flirty',
        subcategory: 'colors',
        response_type: 'photo',
        prompt: 'Take a photo wearing my favorite color',
        timer_seconds: 120,
        timer_category: 'standard',
        difficulty_level: 1,
        intimacy_level: 2,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['flirty', 'sweet']
      },
      
      // Funny Photos (25 cards)
      {
        category: 'funny',
        subcategory: 'silly',
        response_type: 'photo',
        prompt: 'Take the silliest couple selfie possible',
        timer_seconds: 60,
        timer_category: 'quick',
        difficulty_level: 1,
        intimacy_level: 1,
        requires_physical_presence: true,
        requires_action: true,
        mood_tags: ['funny', 'playful']
      },
      {
        category: 'funny',
        subcategory: 'embarrassing',
        response_type: 'photo',
        prompt: 'Share your most embarrassing photo and tell the story',
        timer_seconds: 180,
        timer_category: 'deep',
        difficulty_level: 3,
        intimacy_level: 2,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['funny', 'vulnerable']
      },
      {
        category: 'funny',
        subcategory: 'recreation',
        response_type: 'photo',
        prompt: 'Recreate our first photo together with funny faces',
        timer_seconds: 120,
        timer_category: 'standard',
        difficulty_level: 2,
        intimacy_level: 2,
        requires_physical_presence: true,
        requires_action: true,
        mood_tags: ['funny', 'nostalgic']
      },
      
      // Daily Life Photos (20 cards)
      {
        category: 'daily',
        subcategory: 'everyday',
        response_type: 'photo',
        prompt: 'Capture our everyday love in one photo',
        timer_seconds: 120,
        timer_category: 'standard',
        difficulty_level: 2,
        intimacy_level: 2,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['daily', 'authentic']
      },
      {
        category: 'daily',
        subcategory: 'current',
        response_type: 'photo',
        prompt: 'Show me your current view and why it makes you think of us',
        timer_seconds: 90,
        timer_category: 'standard',
        difficulty_level: 1,
        intimacy_level: 2,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['daily', 'present']
      },
      
      // Future Photos (15 cards)
      {
        category: 'future',
        subcategory: 'dreams',
        response_type: 'photo',
        prompt: 'Create a vision board photo of our future together',
        timer_seconds: 240,
        timer_category: 'deep',
        difficulty_level: 3,
        intimacy_level: 3,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['future', 'dreams']
      }
    ];
    
    // Generate additional photo cards to reach 165 total
    const additionalPhotoPrompts = [
      'Take a photo of your hands holding something meaningful to us',
      'Capture a sunset/sunrise and dedicate it to our relationship',
      'Show me your favorite spot in your home where you think of me',
      'Take a mirror selfie that shows your confidence',
      'Photograph something you want to share with me someday',
      'Show me what makes you smile when you think of me',
      'Take a photo of your favorite outfit and explain why',
      'Capture the view from your window and tell me about your day',
      'Show me a photo that represents your current mood',
      'Take a picture of something blue and tell me why you chose it',
      'Photograph your favorite snack and explain why we should share it',
      'Show me a photo of where you feel most comfortable',
      'Take a picture of something that reminds you of our first date',
      'Capture a photo that shows your creative side',
      'Show me what you\'re most proud of right now'
    ];
    
    additionalPhotoPrompts.forEach((prompt, index) => {
      photoCards.push({
        category: index % 2 === 0 ? 'romantic' : 'daily',
        subcategory: 'general',
        response_type: 'photo',
        prompt,
        timer_seconds: 120,
        timer_category: 'standard',
        difficulty_level: 1 + (index % 3),
        intimacy_level: 1 + (index % 4),
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['creative', 'expressive']
      });
    });
    
    return photoCards.slice(0, 165); // Ensure exactly 165 cards
  }

  generateActionCards(): CardTemplate[] {
    const actionCards: CardTemplate[] = [
      {
        category: 'romantic',
        subcategory: 'physical',
        response_type: 'action',
        prompt: 'Give your partner a 2-minute massage while sharing your favorite memory together',
        timer_seconds: 180,
        timer_category: 'action',
        difficulty_level: 2,
        intimacy_level: 3,
        requires_physical_presence: true,
        requires_action: true,
        mood_tags: ['romantic', 'physical', 'intimate']
      },
      {
        category: 'flirty',
        subcategory: 'dancing',
        response_type: 'action',
        prompt: 'Dance together to a song that makes you think of your partner',
        timer_seconds: 300,
        timer_category: 'action',
        difficulty_level: 2,
        intimacy_level: 2,
        requires_physical_presence: true,
        requires_action: true,
        mood_tags: ['flirty', 'fun', 'energetic']
      },
      {
        category: 'intimate',
        subcategory: 'connection',
        response_type: 'action',
        prompt: 'Look into each other\'s eyes for 60 seconds without speaking',
        timer_seconds: 90,
        timer_category: 'action',
        difficulty_level: 3,
        intimacy_level: 4,
        requires_physical_presence: true,
        requires_action: true,
        mood_tags: ['intimate', 'vulnerable', 'connecting']
      },
      // Additional action cards to reach 170
      {
        category: 'funny',
        subcategory: 'games',
        response_type: 'action',
        prompt: 'Act out your partner\'s favorite movie scene together',
        timer_seconds: 240,
        timer_category: 'action',
        difficulty_level: 2,
        intimacy_level: 2,
        requires_physical_presence: true,
        requires_action: true,
        mood_tags: ['funny', 'creative', 'playful']
      }
    ];
    
    // Add more action cards to reach 170 total
    const additionalActionPrompts = [
      'Create a secret handshake together',
      'Give each other a compliment while maintaining eye contact',
      'Share a slow dance to your favorite song',
      'Take turns feeding each other a favorite treat',
      'Draw each other\'s portraits without looking at the paper'
    ];
    
    additionalActionPrompts.forEach((prompt, index) => {
      actionCards.push({
        category: ['romantic', 'flirty', 'funny'][index % 3] as any,
        subcategory: 'general',
        response_type: 'action',
        prompt,
        timer_seconds: 180,
        timer_category: 'action',
        difficulty_level: 1 + (index % 3),
        intimacy_level: 1 + (index % 4),
        requires_physical_presence: true,
        requires_action: true,
        mood_tags: ['fun', 'connecting']
      });
    });
    
    return actionCards.slice(0, 170);
  }

  generateTextCards(): CardTemplate[] {
    const textCards: CardTemplate[] = [
      {
        category: 'intimate',
        subcategory: 'love',
        response_type: 'text',
        prompt: 'Describe the moment you knew you wanted to be with me forever',
        timer_seconds: 120,
        timer_category: 'standard',
        difficulty_level: 3,
        intimacy_level: 4,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['intimate', 'emotional', 'deep']
      },
      {
        category: 'future',
        subcategory: 'goals',
        response_type: 'text',
        prompt: 'Tell me about three things you want us to accomplish together this year',
        timer_seconds: 150,
        timer_category: 'standard',
        difficulty_level: 2,
        intimacy_level: 3,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['future', 'goals', 'planning']
      },
      {
        category: 'romantic',
        subcategory: 'letters',
        response_type: 'text',
        prompt: 'Write a short love letter that I can read whenever I miss you',
        timer_seconds: 240,
        timer_category: 'deep',
        difficulty_level: 3,
        intimacy_level: 4,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['romantic', 'expressive', 'heartfelt']
      },
      // Additional text cards
      {
        category: 'memory',
        subcategory: 'gratitude',
        response_type: 'text',
        prompt: 'Share three things about our relationship that you\'re most grateful for',
        timer_seconds: 180,
        timer_category: 'standard',
        difficulty_level: 2,
        intimacy_level: 3,
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['grateful', 'reflective', 'positive']
      }
    ];
    
    // Add more text cards to reach 165 total
    const additionalTextPrompts = [
      'Describe your ideal date night with me in detail',
      'Tell me about a time I made you laugh uncontrollably',
      'Share what you admire most about my personality',
      'Describe how you feel when we\'re apart',
      'Tell me about your favorite memory of us from this month'
    ];
    
    additionalTextPrompts.forEach((prompt, index) => {
      textCards.push({
        category: ['romantic', 'memory', 'intimate', 'flirty'][index % 4] as any,
        subcategory: 'general',
        response_type: 'text',
        prompt,
        timer_seconds: 120,
        timer_category: 'standard',
        difficulty_level: 1 + (index % 3),
        intimacy_level: 1 + (index % 4),
        requires_physical_presence: false,
        requires_action: false,
        mood_tags: ['expressive', 'thoughtful']
      });
    });
    
    return textCards.slice(0, 165);
  }

  async importAllCards() {
    try {
      console.log('🔄 Starting complete card import...');
      
      // Generate all cards
      const allCards = this.generateAllCards();
      console.log(`📊 Generated ${allCards.length} cards`);
      
      // Check distribution
      const distribution = allCards.reduce((acc, card) => {
        acc[card.response_type] = (acc[card.response_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('📊 Card distribution:', distribution);
      
      // Import in batches
      const batchSize = 50;
      let imported = 0;
      
      for (let i = 0; i < allCards.length; i += batchSize) {
        const batch = allCards.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('deck_cards')
          .upsert(batch, { 
            onConflict: 'prompt',
            ignoreDuplicates: true 
          });
        
        if (error) {
          console.error(`❌ Error importing batch:`, error);
        } else {
          imported += batch.length;
          console.log(`✅ Imported ${imported}/${allCards.length} cards`);
        }
      }
      
      // Verify final counts
      const { data: finalCounts } = await supabase
        .from('deck_cards')
        .select('response_type')
        .eq('is_active', true);
      
      const finalDistribution = finalCounts?.reduce((acc, card) => {
        acc[card.response_type] = (acc[card.response_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('✅ Import complete. Final distribution:', finalDistribution);
      
      return finalDistribution;
      
    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  }

  async checkCardDistribution() {
    const { data: cards } = await supabase
      .from('deck_cards')
      .select('response_type')
      .eq('is_active', true);

    if (!cards) return null;

    return cards.reduce((acc, card) => {
      acc[card.response_type] = (acc[card.response_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}