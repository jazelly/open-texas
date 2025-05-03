import { Card } from '../models/TexasHoldemGame';

// Hand rankings
enum HandRank {
  HighCard = 1,
  Pair,
  TwoPair,
  ThreeOfAKind,
  Straight,
  Flush,
  FullHouse,
  FourOfAKind,
  StraightFlush,
  RoyalFlush
}

// Card value mapping for comparison
const VALUES_MAP: { [key: string]: number } = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14
};

export class HandEvaluator {
  // Evaluate the best 5-card hand from the 7 cards available
  evaluateHand(cards: Card[]): { value: number; description: string } {
    if (cards.length < 5) {
      throw new Error('Not enough cards to evaluate');
    }

    // Get all possible 5-card combinations
    const combinations = this.getCombinations(cards, 5);
    
    // Evaluate each combination and find the best one
    let bestHand = { value: 0, description: '' };
    
    for (const combo of combinations) {
      const evaluation = this.evaluateCombo(combo);
      if (evaluation.value > bestHand.value) {
        bestHand = evaluation;
      }
    }
    
    return bestHand;
  }

  // Evaluate a specific 5-card combination
  private evaluateCombo(cards: Card[]): { value: number; description: string } {
    // Sort cards by value, high to low
    const sortedCards = [...cards].sort((a, b) => 
      VALUES_MAP[b.value] - VALUES_MAP[a.value]
    );
    
    // Check for each hand type from highest to lowest
    if (this.isRoyalFlush(sortedCards)) {
      return { value: HandRank.RoyalFlush * 10000000000, description: 'Royal Flush' };
    }
    
    const straightFlush = this.isStraightFlush(sortedCards);
    if (straightFlush.is) {
      return { 
        value: HandRank.StraightFlush * 10000000000 + straightFlush.highCard,
        description: `Straight Flush, ${this.getCardName(straightFlush.highCard)} high`
      };
    }
    
    const fourOfAKind = this.isFourOfAKind(sortedCards);
    if (fourOfAKind.is) {
      return { 
        value: HandRank.FourOfAKind * 10000000000 + fourOfAKind.value * 100 + fourOfAKind.kicker,
        description: `Four of a Kind, ${this.getCardName(fourOfAKind.value)}s`
      };
    }
    
    const fullHouse = this.isFullHouse(sortedCards);
    if (fullHouse.is) {
      return { 
        value: HandRank.FullHouse * 10000000000 + fullHouse.three * 100 + fullHouse.pair,
        description: `Full House, ${this.getCardName(fullHouse.three)}s over ${this.getCardName(fullHouse.pair)}s`
      };
    }
    
    const flush = this.isFlush(sortedCards);
    if (flush.is) {
      return { 
        value: HandRank.Flush * 10000000000 + this.getHighCardValue(sortedCards),
        description: `Flush, ${this.getCardName(sortedCards[0].value)} high`
      };
    }
    
    const straight = this.isStraight(sortedCards);
    if (straight.is) {
      return { 
        value: HandRank.Straight * 10000000000 + straight.highCard,
        description: `Straight, ${this.getCardName(straight.highCard)} high`
      };
    }
    
    const threeOfAKind = this.isThreeOfAKind(sortedCards);
    if (threeOfAKind.is) {
      return { 
        value: HandRank.ThreeOfAKind * 10000000000 + threeOfAKind.value * 10000 + threeOfAKind.kickers[0] * 100 + threeOfAKind.kickers[1],
        description: `Three of a Kind, ${this.getCardName(threeOfAKind.value)}s`
      };
    }
    
    const twoPair = this.isTwoPair(sortedCards);
    if (twoPair.is) {
      return { 
        value: HandRank.TwoPair * 10000000000 + twoPair.high * 10000 + twoPair.low * 100 + twoPair.kicker,
        description: `Two Pair, ${this.getCardName(twoPair.high)}s and ${this.getCardName(twoPair.low)}s`
      };
    }
    
    const pair = this.isPair(sortedCards);
    if (pair.is) {
      return { 
        value: HandRank.Pair * 10000000000 + pair.value * 1000000 + pair.kickers[0] * 10000 + pair.kickers[1] * 100 + pair.kickers[2],
        description: `Pair of ${this.getCardName(pair.value)}s`
      };
    }
    
    return { 
      value: HandRank.HighCard * 10000000000 + this.getHighCardValue(sortedCards),
      description: `High Card, ${this.getCardName(sortedCards[0].value)}`
    };
  }

  // Check for Royal Flush
  private isRoyalFlush(cards: Card[]): boolean {
    const straightFlush = this.isStraightFlush(cards);
    return straightFlush.is && straightFlush.highCard === VALUES_MAP['A'];
  }

  // Check for Straight Flush
  private isStraightFlush(cards: Card[]): { is: boolean; highCard: number } {
    const flush = this.isFlush(cards);
    const straight = this.isStraight(cards);
    
    return {
      is: flush.is && straight.is,
      highCard: straight.highCard
    };
  }

  // Check for Four of a Kind
  private isFourOfAKind(cards: Card[]): { is: boolean; value: number; kicker: number } {
    const valueCounts = this.getValueCounts(cards);
    
    for (const value in valueCounts) {
      if (valueCounts[value] === 4) {
        // Find the kicker (the highest card that's not part of the four of a kind)
        const kickers = cards.filter(card => VALUES_MAP[card.value] !== parseInt(value))
          .map(card => VALUES_MAP[card.value]);
        
        return { 
          is: true, 
          value: parseInt(value), 
          kicker: kickers[0] || 0
        };
      }
    }
    
    return { is: false, value: 0, kicker: 0 };
  }

  // Check for Full House
  private isFullHouse(cards: Card[]): { is: boolean; three: number; pair: number } {
    const valueCounts = this.getValueCounts(cards);
    let threeOfAKindValue = 0;
    let pairValue = 0;
    
    for (const value in valueCounts) {
      const numValue = parseInt(value);
      if (valueCounts[value] === 3) {
        if (numValue > threeOfAKindValue) {
          threeOfAKindValue = numValue;
        }
      } else if (valueCounts[value] === 2) {
        if (numValue > pairValue) {
          pairValue = numValue;
        }
      }
    }
    
    return { 
      is: threeOfAKindValue > 0 && pairValue > 0, 
      three: threeOfAKindValue, 
      pair: pairValue 
    };
  }

  // Check for Flush
  private isFlush(cards: Card[]): { is: boolean; suit: string } {
    const suitCounts: { [key: string]: number } = {};
    
    for (const card of cards) {
      suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    }
    
    for (const suit in suitCounts) {
      if (suitCounts[suit] >= 5) {
        return { is: true, suit };
      }
    }
    
    return { is: false, suit: '' };
  }

  // Check for Straight
  private isStraight(cards: Card[]): { is: boolean; highCard: number } {
    const values = cards.map(card => VALUES_MAP[card.value]).sort((a, b) => b - a);
    const uniqueValues = [...new Set(values)]; // Remove duplicates
    
    // Check for A-5 straight
    if (uniqueValues.includes(14) && uniqueValues.includes(5) && uniqueValues.includes(4) && 
        uniqueValues.includes(3) && uniqueValues.includes(2)) {
      return { is: true, highCard: 5 };
    }
    
    // Check for regular straights
    let streak = 1;
    let highCard = uniqueValues[0];
    
    for (let i = 1; i < uniqueValues.length; i++) {
      if (uniqueValues[i - 1] - uniqueValues[i] === 1) {
        streak++;
        if (streak === 5) {
          return { is: true, highCard };
        }
      } else if (uniqueValues[i - 1] - uniqueValues[i] > 1) {
        streak = 1;
        highCard = uniqueValues[i];
      }
      // Equal cards (already filtered by uniqueValues) don't break the streak
    }
    
    return { is: false, highCard: 0 };
  }

  // Check for Three of a Kind
  private isThreeOfAKind(cards: Card[]): { is: boolean; value: number; kickers: number[] } {
    const valueCounts = this.getValueCounts(cards);
    
    for (const value in valueCounts) {
      if (valueCounts[value] === 3) {
        // Find kickers (the 2 highest cards that aren't part of the three of a kind)
        const kickers = cards.filter(card => VALUES_MAP[card.value] !== parseInt(value))
          .map(card => VALUES_MAP[card.value])
          .sort((a, b) => b - a)
          .slice(0, 2);
        
        return { 
          is: true, 
          value: parseInt(value), 
          kickers: kickers.length === 2 ? kickers : [0, 0]
        };
      }
    }
    
    return { is: false, value: 0, kickers: [0, 0] };
  }

  // Check for Two Pair
  private isTwoPair(cards: Card[]): { is: boolean; high: number; low: number; kicker: number } {
    const valueCounts = this.getValueCounts(cards);
    const pairs: number[] = [];
    
    for (const value in valueCounts) {
      if (valueCounts[value] === 2) {
        pairs.push(parseInt(value));
      }
    }
    
    if (pairs.length >= 2) {
      pairs.sort((a, b) => b - a);
      
      // Find kicker (the highest card that's not part of either pair)
      const kickers = cards.filter(
        card => VALUES_MAP[card.value] !== pairs[0] && VALUES_MAP[card.value] !== pairs[1]
      ).map(card => VALUES_MAP[card.value])
      .sort((a, b) => b - a);
      
      return { 
        is: true, 
        high: pairs[0], 
        low: pairs[1],
        kicker: kickers[0] || 0
      };
    }
    
    return { is: false, high: 0, low: 0, kicker: 0 };
  }

  // Check for One Pair
  private isPair(cards: Card[]): { is: boolean; value: number; kickers: number[] } {
    const valueCounts = this.getValueCounts(cards);
    
    for (const value in valueCounts) {
      if (valueCounts[value] === 2) {
        // Find kickers (the 3 highest cards that aren't part of the pair)
        const kickers = cards.filter(card => VALUES_MAP[card.value] !== parseInt(value))
          .map(card => VALUES_MAP[card.value])
          .sort((a, b) => b - a)
          .slice(0, 3);
        
        return { 
          is: true, 
          value: parseInt(value), 
          kickers: kickers.length === 3 ? kickers : [0, 0, 0]
        };
      }
    }
    
    return { is: false, value: 0, kickers: [0, 0, 0] };
  }

  // Helper function to count the occurrences of each card value
  private getValueCounts(cards: Card[]): { [key: string]: number } {
    const valueCounts: { [key: string]: number } = {};
    
    for (const card of cards) {
      const value = VALUES_MAP[card.value].toString();
      valueCounts[value] = (valueCounts[value] || 0) + 1;
    }
    
    return valueCounts;
  }

  // Helper function to calculate a value for high card comparisons
  private getHighCardValue(cards: Card[]): number {
    let value = 0;
    let multiplier = 1;
    
    for (let i = Math.min(5, cards.length) - 1; i >= 0; i--) {
      value += VALUES_MAP[cards[i].value] * multiplier;
      multiplier *= 100;
    }
    
    return value;
  }

  // Get all possible combinations of n elements from an array
  private getCombinations<T>(array: T[], n: number): T[][] {
    if (n === 1) return array.map(item => [item]);
    
    return array.flatMap((item, i) => 
      this.getCombinations(array.slice(i + 1), n - 1).map(combo => [item, ...combo])
    );
  }

  // Helper to get the name of a card based on its value
  private getCardName(value: number | string): string {
    if (typeof value === 'string') {
      return value;
    }
    
    for (const [cardValue, numValue] of Object.entries(VALUES_MAP)) {
      if (numValue === value) {
        return cardValue;
      }
    }
    
    return value.toString();
  }
} 