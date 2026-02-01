// packages/game-engine/src/core/HandEvaluator.ts

import { Card, CardUtils } from './Card';

export enum HandType {
  TRAIL = 'TRAIL',           // Three of a Kind - HIGHEST
  NINE = 'NINE',             // Sum equals 9 (strict sum)
  HIGH_CARD = 'HIGH_CARD',   // Highest card wins
}

export interface EvaluatedHand {
  type: HandType;
  value: number;              // Primary comparison value
  tiebreaker: number;         // Secondary comparison
  tertiaryBreaker: number;    // Tertiary comparison
  cards: Card[];
  description: string;
  sum: number;                // Actual sum of cards
}

export interface ComparisonResult {
  winner: 'hand1' | 'hand2' | 'tie';
  reason: string;
}

export class HandEvaluator {
  // Priority values ensure correct ordering
  private static readonly PRIORITIES = {
    [HandType.TRAIL]: 10000,
    [HandType.NINE]: 5000,
    [HandType.HIGH_CARD]: 0,
  };

  /**
   * Evaluate a 3-card hand and return complete ranking info
   */
  static evaluate(cards: Card[]): EvaluatedHand {
    if (cards.length !== 3) {
      throw new Error(`Hand must contain exactly 3 cards, got ${cards.length}`);
    }
    
    // Sort cards by value (descending) for consistent evaluation
    const sortedCards = CardUtils.sortByValue(cards);
    // Strict sum calculation
    const sum = cards.reduce((acc, c) => acc + c.rank, 0);
    
    // Check for Trail (Three of a Kind) - HIGHEST PRIORITY
    const trailResult = this.evaluateTrail(sortedCards, sum);
    if (trailResult) return trailResult;
    
    // Check for Nine completion (strict sum = 9)
    const nineResult = this.evaluateNine(sortedCards, sum);
    if (nineResult) return nineResult;
    
    // Default to High Card
    return this.evaluateHighCard(sortedCards, sum);
  }
  
  /**
   * Check for Trail: All three cards have the same rank
   */
  private static evaluateTrail(cards: Card[], sum: number): EvaluatedHand | null {
    const [a, b, c] = cards;
    
    if (a.rank === b.rank && b.rank === c.rank) {
      const trailRank = a.rank;
      
      return {
        type: HandType.TRAIL,
        value: this.PRIORITIES[HandType.TRAIL] + trailRank,
        tiebreaker: trailRank,
        tertiaryBreaker: 0,
        cards,
        description: `Trail of ${trailRank}s`,
        sum,
      };
    }
    
    return null;
  }
  
  /**
   * Check for Nine: Sum of cards equals exactly 9
   * Examples: 2+3+4=9
   */
  private static evaluateNine(cards: Card[], sum: number): EvaluatedHand | null {
    // STRICT CHECK: Sum must be exactly 9 (NO Modulo)
    if (sum === 9) {
      // Among Nines, higher visible card wins
      const values = cards.map(c => CardUtils.getValue(c));
      const sortedValues = [...values].sort((a, b) => b - a);
      
      return {
        type: HandType.NINE,
        value: this.PRIORITIES[HandType.NINE] + sortedValues[0],
        tiebreaker: sortedValues[0],
        tertiaryBreaker: sortedValues[1],
        cards,
        description: `Nine (sum=${sum}) with high card ${sortedValues[0]}`,
        sum,
      };
    }
    
    return null;
  }
  
  /**
   * High Card: No Trail or Nine, compare highest cards
   */
  private static evaluateHighCard(cards: Card[], sum: number): EvaluatedHand {
    const values = cards.map(c => CardUtils.getValue(c));
    const sortedValues = [...values].sort((a, b) => b - a);
    
    return {
      type: HandType.HIGH_CARD,
      value: this.PRIORITIES[HandType.HIGH_CARD] + sortedValues[0],
      tiebreaker: sortedValues[1],
      tertiaryBreaker: sortedValues[2],
      cards,
      description: `High card ${sortedValues[0]}`,
      sum,
    };
  }
  
  /**
   * Compare two evaluated hands and determine winner
   */
  static compare(hand1: EvaluatedHand, hand2: EvaluatedHand): ComparisonResult {
    // Compare primary value (hand type + strength)
    if (hand1.value > hand2.value) {
      return {
        winner: 'hand1',
        reason: `${hand1.description} beats ${hand2.description}`
      };
    }
    if (hand2.value > hand1.value) {
      return {
        winner: 'hand2',
        reason: `${hand2.description} beats ${hand1.description}`
      };
    }
    
    // Compare tiebreaker
    if (hand1.tiebreaker > hand2.tiebreaker) {
      return {
        winner: 'hand1',
        reason: `Tiebreaker: ${hand1.tiebreaker} > ${hand2.tiebreaker}`
      };
    }
    if (hand2.tiebreaker > hand1.tiebreaker) {
      return {
        winner: 'hand2',
        reason: `Tiebreaker: ${hand2.tiebreaker} > ${hand1.tiebreaker}`
      };
    }
    
    // Compare tertiary breaker
    if (hand1.tertiaryBreaker > hand2.tertiaryBreaker) {
      return {
        winner: 'hand1',
        reason: `Second tiebreaker: ${hand1.tertiaryBreaker} > ${hand2.tertiaryBreaker}`
      };
    }
    if (hand2.tertiaryBreaker > hand1.tertiaryBreaker) {
      return {
        winner: 'hand2',
        reason: `Second tiebreaker: ${hand2.tertiaryBreaker} > ${hand1.tertiaryBreaker}`
      };
    }
    
    return { winner: 'tie', reason: 'Hands are exactly equal' };
  }
  
  /**
   * Find the winning hand among multiple players
   */
  static findWinner(hands: Map<string, EvaluatedHand>): {
    winnerId: string;
    hand: EvaluatedHand;
    tiedWith?: string[];
  } | null {
    if (hands.size === 0) return null;
    
    let winnerId: string | null = null;
    let winningHand: EvaluatedHand | null = null;
    const tiedPlayers: string[] = [];
    
    for (const [playerId, hand] of hands) {
      if (!winningHand) {
        winnerId = playerId;
        winningHand = hand;
        continue;
      }
      
      const result = this.compare(hand, winningHand);
      
      if (result.winner === 'hand1') {
        // New winner found
        winnerId = playerId;
        winningHand = hand;
        tiedPlayers.length = 0;
      } else if (result.winner === 'tie') {
        // Add to tied players
        if (!tiedPlayers.includes(winnerId!)) {
          tiedPlayers.push(winnerId!);
        }
        tiedPlayers.push(playerId);
      }
    }
    
    if (!winnerId || !winningHand) return null;
    
    return {
      winnerId,
      hand: winningHand,
      tiedWith: tiedPlayers.length > 0 ? tiedPlayers : undefined,
    };
  }
  
  /**
   * Check if a hand is a Trail (triggers Festival mode)
   */
  static isTrail(hand: EvaluatedHand): boolean {
    return hand.type === HandType.TRAIL;
  }
  
  /**
   * Get Trail value if hand is a Trail
   */
  static getTrailValue(hand: EvaluatedHand): number | null {
    if (hand.type !== HandType.TRAIL) return null;
    return hand.tiebreaker;
  }
}
