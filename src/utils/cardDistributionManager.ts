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

  // SIMPLE AND RELIABLE CARD DISTRIBUTION
  selectRandomCard(
    playedCards: string[], 
    allCards: any[],
    availableCards: any[]
  ): any | null {
    
    if (availableCards.length === 0) {
      console.log('❌ No cards available to draw');
      return null;
    }
    
    console.log('🎴 SIMPLE CARD DISTRIBUTION - Guaranteed Variety');
    
    // Group available cards by type
    const cardsByType = {
      action: availableCards.filter(c => c.response_type === 'action'),
      text: availableCards.filter(c => c.response_type === 'text'),
      photo: availableCards.filter(c => c.response_type === 'photo')
    };
    
    console.log('📦 Available cards by type:', {
      action: cardsByType.action.length,
      text: cardsByType.text.length,
      photo: cardsByType.photo.length,
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

    const totalPlayed = playedCards.length;
    console.log('📊 User distribution:', {
      totalPlayed,
      counts: userDistribution,
      percentages: {
        action: totalPlayed > 0 ? (userDistribution.action / totalPlayed * 100).toFixed(1) + '%' : '0%',
        text: totalPlayed > 0 ? (userDistribution.text / totalPlayed * 100).toFixed(1) + '%' : '0%',
        photo: totalPlayed > 0 ? (userDistribution.photo / totalPlayed * 100).toFixed(1) + '%' : '0%'
      }
    });

    // STRATEGY: Force balance after first few cards
    let selectedCard;
    
    if (totalPlayed >= 2) {
      // Find the most underrepresented type that has available cards
      const types = ['action', 'text', 'photo'] as const;
      const typesWithCards = types.filter(type => cardsByType[type].length > 0);
      
      if (typesWithCards.length === 0) {
        console.log('❌ No cards of any type available!');
        return null;
      }

      // Calculate deficit for each type (target 33% each)
      const deficits = typesWithCards.map(type => ({
        type,
        count: userDistribution[type],
        percent: totalPlayed > 0 ? userDistribution[type] / totalPlayed : 0,
        deficit: (1/3) - (totalPlayed > 0 ? userDistribution[type] / totalPlayed : 0),
        available: cardsByType[type].length
      }));

      // Sort by biggest deficit (most underrepresented)
      deficits.sort((a, b) => b.deficit - a.deficit);
      
      console.log('📈 Type deficits (biggest first):', deficits.map(d => ({
        type: d.type,
        deficit: (d.deficit * 100).toFixed(1) + '%',
        count: d.count,
        available: d.available
      })));

      // Pick the most underrepresented type
      const chosenType = deficits[0].type;
      const availableOfType = cardsByType[chosenType];
      
      console.log(`🎯 Selecting ${chosenType} card (biggest deficit: ${(deficits[0].deficit * 100).toFixed(1)}%)`);
      
      // Random card from chosen type
      selectedCard = availableOfType[Math.floor(Math.random() * availableOfType.length)];
      
    } else {
      // For first few cards, truly random
      console.log('🎲 Early game - truly random selection');
      selectedCard = availableCards[Math.floor(Math.random() * availableCards.length)];
    }

    // Avoid 3+ consecutive cards of same type
    if (totalPlayed >= 2) {
      const lastTwoCards = playedCards.slice(-2);
      const lastTwoTypes = lastTwoCards.map(cardId => {
        const card = allCards.find(c => c.id === cardId);
        return card?.response_type;
      }).filter(Boolean);
      
      // If last 2 cards are same type and we're about to make it 3, try different type
      if (lastTwoTypes.length === 2 && 
          lastTwoTypes[0] === lastTwoTypes[1] && 
          selectedCard.response_type === lastTwoTypes[0]) {
        
        console.log(`🚫 Would create 3rd consecutive ${selectedCard.response_type}, trying different type...`);
        
        // Try to find a different type
        const otherTypes = ['action', 'text', 'photo'].filter(type => 
          type !== selectedCard.response_type && cardsByType[type as keyof typeof cardsByType].length > 0
        );
        
        if (otherTypes.length > 0) {
          const alternativeType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
          const alternativeCards = cardsByType[alternativeType as keyof typeof cardsByType];
          selectedCard = alternativeCards[Math.floor(Math.random() * alternativeCards.length)];
          console.log(`✅ Switched to ${selectedCard.response_type} to avoid consecutive`);
        } else {
          console.log('⚠️ No alternative types available, keeping original selection');
        }
      }
    }
    
    console.log('✅ Final selection:', {
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