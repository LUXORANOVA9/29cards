// packages/game-engine/src/festival/Phase2_ImaginaryCard.ts

import { Card, CardUtils, Rank, Suit } from '../core/Card';
import { EvaluatedHand, HandType, HandEvaluator } from '../core/HandEvaluator';
import { Phase2Result } from './FestivalEngine';

/**
 * Phase 2: Imaginary Card Evaluation
 * 
 * Rules:
 * 1. Player receives 2 cards.
 * 2. System checks if a 3rd "imaginary" card can make the sum exactly 9.
 * 3. Option A: If 2 cards already sum to 9, it counts as a Nine hand (imaginary card is null).
 * 4. Tie-breaker: Based on the highest VISIBLE card only.
 */
export class Phase2Logic {

  static evaluate(cards: Card[]): Phase2Result {
    if (cards.length !== 2) {
      throw new Error('Phase 2 requires exactly 2 cards');
    }

    // Strict sum check (No Modulo)
    const sum2 = cards[0].rank + cards[1].rank;

    // Calculate highest visible card for tie-breaker
    const values = cards.map(c => CardUtils.getValue(c));
    const sortedValues = [...values].sort((a, b) => b - a);
    const highestVisible = sortedValues[0];
    const secondVisible = sortedValues.length > 1 ? sortedValues[1] : 0;

    // CASE 1: Sum is already 9 (Option A)
    if (sum2 === 9) {
      return {
        originalCards: cards,
        imaginaryCard: null,
        canComplete: true,
        evaluation: {
          type: HandType.NINE,
          value: 500 + highestVisible,
          tiebreaker: highestVisible,
          tertiaryBreaker: secondVisible,
          cards: cards,
          description: `Nine via 2 cards (sum=9), high=${highestVisible}`,
          sum: sum2,
        },
      };
    }

    // CASE 2: Sum != 9, check if we can add a valid card
    const needed = 9 - sum2;

    // Valid ranks in deck: 2, 3, 4, 5, 6, 7, 8, 9
    // Note: 1 (Ace) and 0 are NOT in the deck. 
    // needed must be > 0 and <= 9, but also must exist in the deck.
    // 9 is valid (9H). 2-8 are valid.
    const isValidRank = (needed >= 2 && needed <= 8) || needed === 9;

    if (!isValidRank) {
      // Cannot complete (e.g., sum is 8 -> needed is 1 (Ace not in deck))
      // Or sum > 9 -> needed is negative
      return {
        originalCards: cards,
        imaginaryCard: null,
        canComplete: false,
        evaluation: null, // Failed phase 2 implies reverting to High Card logic elsewhere
      };
    }

    // Create Imaginary Card
    const imaginaryCard: Card = {
      rank: needed as Rank,
      suit: needed === 9 ? '♥' : '♠', // Default suit, doesn't impact value usually
      code: `${needed}${needed === 9 ? '♥' : '♠'}`,
    };

    // Construct full hand for evaluation context (though logic is custom)
    const allCards = [...cards, imaginaryCard];

    return {
      originalCards: cards,
      imaginaryCard,
      canComplete: true,
      evaluation: {
        type: HandType.NINE,
        value: 500 + highestVisible, // NINE type
        tiebreaker: highestVisible,  // Important: Only visible cards count for tie-breaker
        tertiaryBreaker: secondVisible,
        cards: allCards,
        description: `Nine completed with imaginary ${imaginaryCard.code}, high=${highestVisible}`,
        sum: 9,
      },
    };
  }
}
