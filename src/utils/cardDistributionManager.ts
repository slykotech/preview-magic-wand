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
    
    console.log('🎴 REAL-LIFE CARD DRAWING - Simple & Random');
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

    // STEP 1: Check if we need to avoid consecutive cards (only rule)
    let eligibleCards = [...availableCards];
    
    if (playedCards.length >= 2) {
      // Get last 2 cards this user played
      const lastTwoCards = playedCards.slice(-2);
      const lastTwoTypes = lastTwoCards.map(cardId => {
        const card = allCards.find(c => c.id === cardId);
        return card?.response_type;
      }).filter(Boolean);
      
      console.log('🔍 Checking last 2 user cards:', {
        lastTwoCards: lastTwoCards.map(id => id.substring(0, 8)),
        lastTwoTypes,
        userTotalPlayed: playedCards.length
      });
      
      // If last 2 cards are same type, avoid that type
      if (lastTwoTypes.length === 2 && lastTwoTypes[0] === lastTwoTypes[1]) {
        const typeToAvoid = lastTwoTypes[0];
        const beforeFilter = eligibleCards.length;
        const cardsOfTypeToAvoid = eligibleCards.filter(c => c.response_type === typeToAvoid).length;
        eligibleCards = eligibleCards.filter(c => c.response_type !== typeToAvoid);
        
        console.log(`🚫 Avoiding ${typeToAvoid} to prevent 3rd consecutive:`, {
          totalBefore: beforeFilter,
          cardsOfTypeAvoid: cardsOfTypeToAvoid, 
          totalAfter: eligibleCards.length,
          userLastTwo: lastTwoTypes
        });
        
        // If filtering removed all cards, ignore the rule (emergency fallback)
        if (eligibleCards.length === 0) {
          console.log('⚠️ All cards filtered out, ignoring consecutive rule');
          eligibleCards = [...availableCards];
        }
      }
    }
    
    // STEP 2: BALANCED RANDOM SELECTION (ensure fair distribution)
    console.log(`🎲 Selecting card with balanced distribution from ${eligibleCards.length} eligible cards...`);
    
    // Calculate user's current distribution
    const userDistribution = { action: 0, text: 0, photo: 0 };
    playedCards.forEach(cardId => {
      const card = allCards.find(c => c.id === cardId);
      if (card && userDistribution[card.response_type as keyof typeof userDistribution] !== undefined) {
        userDistribution[card.response_type as keyof typeof userDistribution]++;
      }
    });

    console.log('📊 User distribution:', {
      current: userDistribution,
      target: this.DISTRIBUTION_PER_10,
      totalPlayed: playedCards.length
    });

    // Calculate weights to balance distribution
    const totalPlayed = playedCards.length || 1;
    const weights = {
      action: Math.max(0.1, (this.DISTRIBUTION_PER_10.action / 10) - (userDistribution.action / totalPlayed)),
      text: Math.max(0.1, (this.DISTRIBUTION_PER_10.text / 10) - (userDistribution.text / totalPlayed)),
      photo: Math.max(0.1, (this.DISTRIBUTION_PER_10.photo / 10) - (userDistribution.photo / totalPlayed))
    };

    // Normalize weights
    const weightSum = weights.action + weights.text + weights.photo;
    const normalizedWeights = {
      action: weights.action / weightSum,
      text: weights.text / weightSum,
      photo: weights.photo / weightSum
    };

    console.log('⚖️ Card type weights:', normalizedWeights);

    // Select card type based on weights
    const selectedType = this.selectCardType(normalizedWeights);
    const cardsOfSelectedType = eligibleCards.filter(c => c.response_type === selectedType);
    
    let selectedCard;
    if (cardsOfSelectedType.length === 0) {
      console.log(`⚠️ No ${selectedType} cards available, falling back to random`);
      const shuffledCards = this.shuffleArray(eligibleCards);
      selectedCard = shuffledCards[0];
    } else {
      console.log(`✅ Selecting from ${cardsOfSelectedType.length} ${selectedType} cards`);
      selectedCard = this.selectRandomCardFromType(cardsOfSelectedType, true);
    }
    
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