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
export declare class Phase4Logic {
    static evaluate(cards: Card[], jokerRank: number): Phase4Result;
}
