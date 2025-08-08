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

  // Calculate weight for each card type
  calculateTypeWeights(
    playedCards: string[], 
    allCards: any[],
    availableCards: any[]
  ): { action: number; text: number; photo: number } {
    const currentDistribution = this.getCurrentCycleDistribution(playedCards, allCards);
    const cyclePosition = playedCards.length % 10;
    const cardsLeftInCycle = 10 - cyclePosition;
    
    // Calculate remaining needed for each type
    const remaining = {
      action: Math.max(0, this.DISTRIBUTION_PER_10.action - currentDistribution.action),
      text: Math.max(0, this.DISTRIBUTION_PER_10.text - currentDistribution.text),
      photo: Math.max(0, this.DISTRIBUTION_PER_10.photo - currentDistribution.photo)
    };
    
    // Calculate available cards by type
    const available = {
      action: availableCards.filter(c => c.response_type === 'action').length,
      text: availableCards.filter(c => c.response_type === 'text').length,
      photo: availableCards.filter(c => c.response_type === 'photo').length
    };
    
    console.log('📊 Distribution Debug:', {
      cyclePosition,
      cardsLeftInCycle,
      currentDistribution,
      remaining,
      available
    });
    
    // Calculate weights
    const weights = { action: 0, text: 0, photo: 0 };
    
    Object.keys(weights).forEach(type => {
      const typedType = type as keyof typeof weights;
      
      // Skip if no cards available of this type
      if (available[typedType] === 0) {
        weights[typedType] = 0;
        return;
      }
      
      // Check consecutive limit
      const consecutiveCount = this.getConsecutiveCount(playedCards, allCards, type);
      if (consecutiveCount >= this.MAX_CONSECUTIVE) {
        weights[typedType] = 0; // Block this type completely
        return;
      }
      
      // Base weight on remaining needed vs cards left in cycle
      let weight = remaining[typedType];
      
      // If we still need cards of this type
      if (remaining[typedType] > 0) {
        // Urgency factor: more urgent as cycle progresses
        const urgencyFactor = cardsLeftInCycle > 0 ? remaining[typedType] / cardsLeftInCycle : 1;
        weight = weight * (1 + urgencyFactor);
        
        // Extra boost if we're behind schedule
        if (remaining[typedType] > cardsLeftInCycle / 2) {
          weight *= 2;
        }
        
        // Special photo card boost if none played and cycle is progressing
        if (type === 'photo' && currentDistribution.photo === 0 && cyclePosition >= 4) {
          weight *= 3;
        }
      } else {
        // We've met the requirement, but still allow with lower weight
        weight = 0.1;
      }
      
      // Reduce weight for consecutive cards (but don't block completely unless at limit)
      if (consecutiveCount === this.MAX_CONSECUTIVE - 1) {
        weight *= 0.2;
      }
      
      weights[typedType] = Math.max(0, weight);
    });
    
    // Normalize weights
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
    }
    
    console.log('⚖️ Final weights:', weights);
    return weights;
  }

  // Select card type based on weights
  selectCardType(weights: { action: number; text: number; photo: number }): string {
    const random = Math.random();
    
    if (random < weights.action) {
      return 'action';
    } else if (random < weights.action + weights.text) {
      return 'text';
    } else {
      return 'photo';
    }
  }
}

export default CardDistributionManager;