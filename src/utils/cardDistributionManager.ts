interface CardDistribution {
  action: number;
  text: number;
  photo: number;
}

interface CardHistoryEntry {
  type: string;
  cardId: string;
}

class CardDistributionManager {
  private readonly DISTRIBUTION_PER_10 = {
    action: 4,
    text: 3,
    photo: 3
  };
  
  private readonly MAX_CONSECUTIVE = 2;

  // Get distribution for current cycle (every 10 cards)
  getCurrentCycleDistribution(playedCards: string[], allCards: any[]): CardDistribution {
    const cyclePosition = playedCards.length % 10;
    const cycleStart = Math.floor(playedCards.length / 10) * 10;
    
    // Get cards played in current cycle
    const currentCycleCards = playedCards.slice(cycleStart);
    
    // Count types in current cycle
    const distribution = {
      action: 0,
      text: 0,
      photo: 0
    };
    
    currentCycleCards.forEach(cardId => {
      const card = allCards.find(c => c.id === cardId);
      if (card && distribution[card.response_type as keyof CardDistribution] !== undefined) {
        distribution[card.response_type as keyof CardDistribution]++;
      }
    });
    
    return distribution;
  }

  // Get last N cards of same type
  getConsecutiveCount(playedCards: string[], allCards: any[], type: string): number {
    if (playedCards.length === 0) return 0;
    
    let count = 0;
    for (let i = playedCards.length - 1; i >= 0; i--) {
      const card = allCards.find(c => c.id === playedCards[i]);
      if (card?.response_type === type) {
        count++;
      } else {
        break;
      }
    }
    
    return count;
  }

  // SIMPLE REAL-LIFE APPROACH: Just like shuffling actual cards
  selectRandomCard(
    playedCards: string[], 
    allCards: any[],
    availableCards: any[]
  ): any | null {
    
    if (availableCards.length === 0) {
      console.log('❌ No cards available to draw');
      return null;
    }
    
    console.log('🎴 PURE RANDOM CARD DRAWING - No Restrictions');
    console.log('📦 Available cards by type:', {
      action: availableCards.filter(c => c.response_type === 'action').length,
      text: availableCards.filter(c => c.response_type === 'text').length,
      photo: availableCards.filter(c => c.response_type === 'photo').length,
      total: availableCards.length
    });

    // Debug: Show user's card history
    console.log('👤 User card history:', {
      totalPlayed: playedCards.length,
      last5Cards: playedCards.slice(-5).map(id => {
        const card = allCards.find(c => c.id === id);
        return { id: id.substring(0, 8), type: card?.response_type };
      })
    });

    // STEP 1: NO RESTRICTIONS - Use all available cards
    let eligibleCards = [...availableCards];
    
    console.log('✅ All cards eligible - no filtering applied');
    console.log(`🎲 Drawing randomly from ${eligibleCards.length} total cards...`);
    
    // STEP 2: TRUE RANDOM SELECTION (like real life)
    // Shuffle the eligible cards for true randomness
    const shuffledCards = this.shuffleArray(eligibleCards);
    const selectedCard = shuffledCards[0];
    
    console.log('✅ Card drawn:', {
      type: selectedCard.response_type,
      category: selectedCard.category,
      id: selectedCard.id.substring(0, 8),
      prompt: selectedCard.prompt.substring(0, 50) + '...'
    });
    
    return selectedCard;
  }

  // Remove the complex weight calculation - not needed anymore
  calculateTypeWeights(): { action: number; text: number; photo: number } {
    // This method is no longer used but kept for compatibility
    return { action: 0.4, text: 0.3, photo: 0.3 };
  }

  // Select card type based on weights with improved randomness
  selectCardType(weights: { action: number; text: number; photo: number }): string {
    const random = Math.random();
    
    console.log('🎲 Random selection:', { random, weights });
    
    // Create cumulative probability ranges
    const actionRange = weights.action;
    const textRange = actionRange + weights.text;
    const photoRange = textRange + weights.photo; // Should be 1.0
    
    console.log('📊 Probability ranges:', {
      action: `0 - ${actionRange.toFixed(3)}`,
      text: `${actionRange.toFixed(3)} - ${textRange.toFixed(3)}`,
      photo: `${textRange.toFixed(3)} - ${photoRange.toFixed(3)}`
    });
    
    if (random < actionRange) {
      console.log('✅ Selected: ACTION');
      return 'action';
    } else if (random < textRange) {
      console.log('✅ Selected: TEXT');
      return 'text';
    } else {
      console.log('✅ Selected: PHOTO');
      return 'photo';
    }
  }

  // Shuffle array using Fisher-Yates algorithm for true randomness
  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Enhanced card selection with optional shuffle
  selectRandomCardFromType(cards: any[], shouldShuffle: boolean = false): any {
    if (cards.length === 0) return null;
    
    if (shouldShuffle) {
      console.log('🎲 Shuffling card pool for enhanced randomness...');
      const shuffledCards = this.shuffleArray(cards);
      return shuffledCards[0]; // Take first card from shuffled array
    }
    
    return cards[Math.floor(Math.random() * cards.length)];
  }
}

export default CardDistributionManager;