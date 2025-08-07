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
    
    // Calculate remaining needed for each type
    const remaining = {
      action: this.DISTRIBUTION_PER_10.action - currentDistribution.action,
      text: this.DISTRIBUTION_PER_10.text - currentDistribution.text,
      photo: this.DISTRIBUTION_PER_10.photo - currentDistribution.photo
    };
    
    // Calculate available cards by type
    const available = {
      action: availableCards.filter(c => c.response_type === 'action').length,
      text: availableCards.filter(c => c.response_type === 'text').length,
      photo: availableCards.filter(c => c.response_type === 'photo').length
    };
    
    // Calculate weights
    const weights = { action: 0, text: 0, photo: 0 };
    
    Object.keys(weights).forEach(type => {
      const typedType = type as keyof typeof weights;
      // Base weight on how many we still need
      let weight = remaining[typedType] / Math.max(1, (10 - cyclePosition));
      
      // Boost if we're behind schedule
      if (remaining[typedType] > (10 - cyclePosition) / 2) {
        weight *= 2;
      }
      
      // Reduce weight if consecutive limit reached
      const consecutiveCount = this.getConsecutiveCount(playedCards, allCards, type);
      if (consecutiveCount >= this.MAX_CONSECUTIVE) {
        weight = 0; // Block this type
      } else if (consecutiveCount === this.MAX_CONSECUTIVE - 1) {
        weight *= 0.3; // Reduce probability
      }
      
      // Ensure we have cards available
      if (available[typedType] === 0) {
        weight = 0;
      }
      
      // Special boost for photo cards if none played yet
      if (type === 'photo' && currentDistribution.photo === 0 && cyclePosition >= 3) {
        weight *= 3;
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
      // Fallback to equal distribution
      weights.action = weights.text = weights.photo = 1/3;
    }
    
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