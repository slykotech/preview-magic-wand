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

  // BALANCED CARD DISTRIBUTION: Ensures fair distribution of card types
  selectRandomCard(
    playedCards: string[], 
    allCards: any[],
    availableCards: any[]
  ): any | null {
    
    if (availableCards.length === 0) {
      console.log('❌ No cards available to draw');
      return null;
    }
    
    console.log('🎴 BALANCED CARD DRAWING - Fair Distribution');
    console.log('📦 Available cards by type:', {
      action: availableCards.filter(c => c.response_type === 'action').length,
      text: availableCards.filter(c => c.response_type === 'text').length,
      photo: availableCards.filter(c => c.response_type === 'photo').length,
      total: availableCards.length
    });

    // Calculate user's current distribution
    const userDistribution = { action: 0, text: 0, photo: 0 };
    playedCards.forEach(cardId => {
      const card = allCards.find(c => c.id === cardId);
      if (card && userDistribution[card.response_type as keyof typeof userDistribution] !== undefined) {
        userDistribution[card.response_type as keyof typeof userDistribution]++;
      }
    });

    console.log('📊 User card distribution:', {
      totalPlayed: playedCards.length,
      distribution: userDistribution,
      lastCards: playedCards.slice(-3).map(id => {
        const card = allCards.find(c => c.id === id);
        return { id: id.substring(0, 8), type: card?.response_type };
      })
    });

    // STEP 1: Avoid 3+ consecutive cards of same type
    let eligibleCards = [...availableCards];
    
    if (playedCards.length >= 2) {
      const lastTwoCards = playedCards.slice(-2);
      const lastTwoTypes = lastTwoCards.map(cardId => {
        const card = allCards.find(c => c.id === cardId);
        return card?.response_type;
      }).filter(Boolean);
      
      // If last 2 cards are same type, avoid that type
      if (lastTwoTypes.length === 2 && lastTwoTypes[0] === lastTwoTypes[1]) {
        const typeToAvoid = lastTwoTypes[0];
        eligibleCards = eligibleCards.filter(c => c.response_type !== typeToAvoid);
        
        console.log(`🚫 Avoiding ${typeToAvoid} to prevent 3rd consecutive`);
        
        // If filtering removed all cards, ignore the rule
        if (eligibleCards.length === 0) {
          console.log('⚠️ All cards filtered out, ignoring consecutive rule');
          eligibleCards = [...availableCards];
        }
      }
    }

    // STEP 2: Apply distribution balancing
    const totalPlayed = playedCards.length;
    if (totalPlayed >= 3) { // Only balance after a few cards
      // Calculate which type is most underrepresented
      const actionPercent = userDistribution.action / totalPlayed;
      const textPercent = userDistribution.text / totalPlayed;
      const photoPercent = userDistribution.photo / totalPlayed;
      
      console.log('📈 Current percentages:', {
        action: `${(actionPercent * 100).toFixed(1)}%`,
        text: `${(textPercent * 100).toFixed(1)}%`, 
        photo: `${(photoPercent * 100).toFixed(1)}%`
      });

      // Target: 40% action, 30% text, 30% photo
      const targetAction = 0.4;
      const targetText = 0.3;
      const targetPhoto = 0.3;

      // Calculate how far each type is from target
      const actionDeficit = targetAction - actionPercent;
      const textDeficit = targetText - textPercent;
      const photoDeficit = targetPhoto - photoPercent;

      // Find the most underrepresented type
      let preferredType = null;
      let maxDeficit = 0.1; // Only prefer if deficit is significant

      if (actionDeficit > maxDeficit) {
        preferredType = 'action';
        maxDeficit = actionDeficit;
      }
      if (textDeficit > maxDeficit) {
        preferredType = 'text'; 
        maxDeficit = textDeficit;
      }
      if (photoDeficit > maxDeficit) {
        preferredType = 'photo';
        maxDeficit = photoDeficit;
      }

      if (preferredType) {
        const preferredCards = eligibleCards.filter(c => c.response_type === preferredType);
        if (preferredCards.length > 0) {
          console.log(`⚖️ Favoring ${preferredType} cards (deficit: ${(maxDeficit * 100).toFixed(1)}%)`);
          eligibleCards = preferredCards;
        }
      }
    }

    // STEP 3: Random selection from eligible cards
    const shuffledCards = this.shuffleArray(eligibleCards);
    const selectedCard = shuffledCards[0];
    
    console.log('✅ Card selected:', {
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