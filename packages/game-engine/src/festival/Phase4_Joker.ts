// packages/game-engine/src/festival/Phase4_Joker.ts

import { Card } from '../core/Card';
import { Phase4Result } from './FestivalEngine';

/**
 * Phase 4: Joker Variation
 * 
 * Rules:
 * 1. Player receives 3 cards.
 * 2. One rank is designated as the "Joker" (from the Festival Trigger state).
 * 3. Joker cards count as 0. All others count as face value.
 * 4. Goal: Lowest sum wins.
 */
export class Phase4Logic {

    static evaluate(cards: Card[], jokerRank: number): Phase4Result {
        if (cards.length !== 3) {
            throw new Error('Phase 4 requires exactly 3 cards');
        }

        // Calculate sum treating Joker as 0
        let sum = 0;
        let jokerCard: Card | null = null;
        let hasJoker = false;

        for (const card of cards) {
            if (card.rank === jokerRank) {
                // It's a joker! Value is 0.
                // Keep reference to at least one joker for display
                jokerCard = card;
                hasJoker = true;
                // sum += 0 (implicit)
            } else {
                sum += card.rank;
            }
        }

        // Invert value so that standard "Higher Value Wins" logic works
        // Max sum (no joker): 25. Min sum (3 jokers): 0.
        // 1000 - 0 = 1000 (Best)
        const value = 1000 - sum;

        return {
            cards,
            hasJoker,
            jokerCard,
            sum,
            evaluation: {
                value,
                isLowest: true,
            },
        };
    }
}
