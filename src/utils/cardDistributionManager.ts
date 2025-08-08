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

  // Calculate weight for each card type using EQUAL WEIGHTS (40% action, 30% text, 30% photo)
  calculateTypeWeights(
    playedCards: string[], 
    allCards: any[],
    availableCards: any[]
  ): { action: number; text: number; photo: number } {
    
    // Calculate available cards by type
    const available = {
      action: availableCards.filter(c => c.response_type === 'action').length,
      text: availableCards.filter(c => c.response_type === 'text').length,
      photo: availableCards.filter(c => c.response_type === 'photo').length
    };
    
    console.log('🎯 EQUAL WEIGHT DISTRIBUTION - Cards Available:', {
      action: available.action,
      text: available.text,
      photo: available.photo,
      total: available.action + available.text + available.photo
    });

    // Count what the user has played so far by type
    const userPlayedTypes = {
      action: 0,
      text: 0,
      photo: 0
    };

    allCards.forEach(card => {
      if (userPlayedTypes[card.response_type as keyof typeof userPlayedTypes] !== undefined) {
        userPlayedTypes[card.response_type as keyof typeof userPlayedTypes]++;
      }
    });

    console.log('📊 User played distribution:', userPlayedTypes);

    // Check consecutive cards to prevent more than 2 in a row
    const weights = { action: 0, text: 0, photo: 0 };
    
    Object.keys(weights).forEach(type => {
      const typedType = type as keyof typeof weights;
      
      // Skip if no cards available of this type
      if (available[typedType] === 0) {
        weights[typedType] = 0;
        console.log(`❌ No ${type} cards available`);
        return;
      }
      
      // Check consecutive limit (max 2 in a row)
      const consecutiveCount = this.getConsecutiveCount(playedCards, allCards, type);
      if (consecutiveCount >= this.MAX_CONSECUTIVE) {
        weights[typedType] = 0; // Block this type completely
        console.log(`🚫 Blocking ${type} (${consecutiveCount} consecutive)`);
        return;
      }
      
      // BASE WEIGHT DISTRIBUTION: 40% action, 30% text, 30% photo
      let baseWeight = 0;
      if (type === 'action') {
        baseWeight = 0.4; // 40%
      } else if (type === 'text') {
        baseWeight = 0.3; // 30%
      } else if (type === 'photo') {
        baseWeight = 0.3; // 30%
      }
      
      // BOOST UNDERREPRESENTED TYPES: If a user hasn't gotten enough of a type, boost it
      const totalPlayed = userPlayedTypes.action + userPlayedTypes.text + userPlayedTypes.photo;
      if (totalPlayed > 0) {
        const currentRatio = userPlayedTypes[typedType] / totalPlayed;
        const targetRatio = baseWeight;
        
        // If this type is underrepresented, boost it significantly
        if (currentRatio < targetRatio) {
          const boostMultiplier = Math.max(1.5, (targetRatio / Math.max(currentRatio, 0.01)) * 0.8);
          baseWeight *= boostMultiplier;
          console.log(`🚀 Boosting ${type}: current=${(currentRatio*100).toFixed(1)}%, target=${(targetRatio*100).toFixed(1)}%, boost=${boostMultiplier.toFixed(2)}x`);
        }
      }
      
      weights[typedType] = baseWeight;
      
      // Reduce weight for consecutive cards (but don't block completely unless at limit)
      if (consecutiveCount === this.MAX_CONSECUTIVE - 1) {
        weights[typedType] *= 0.5; // Reduce to 50% if one away from limit
        console.log(`⚠️ Reducing ${type} weight due to consecutive (${consecutiveCount})`);
      }
    });
    
    // Normalize weights so they add up to 1.0
    const totalWeight = weights.action + weights.text + weights.photo;
    if (totalWeight > 0) {
      weights.action /= totalWeight;
      weights.text /= totalWeight;
      weights.photo /= totalWeight;
    } else {
      // Emergency fallback: give equal weight to available types
      const availableTypes = Object.keys(available).filter(type => 
        available[type as keyof typeof available] > 0
      );
      const equalWeight = availableTypes.length > 0 ? 1 / availableTypes.length : 0;
      
      weights.action = available.action > 0 ? equalWeight : 0;
      weights.text = available.text > 0 ? equalWeight : 0;
      weights.photo = available.photo > 0 ? equalWeight : 0;
      
      console.log('🆘 Emergency fallback weights applied');
    }
    
    console.log('⚖️ Final normalized weights:', {
      action: `${(weights.action * 100).toFixed(1)}%`,
      text: `${(weights.text * 100).toFixed(1)}%`,
      photo: `${(weights.photo * 100).toFixed(1)}%`
    });
    
    return weights;
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