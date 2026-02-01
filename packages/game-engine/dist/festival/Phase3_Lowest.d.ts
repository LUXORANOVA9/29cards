import { Card } from '../core/Card';
import { Phase3Result } from './FestivalEngine';
/**
 * Phase 3: Lowest Wins
 *
 * Rules:
 * 1. Player receives 3 cards.
 * 2. Goal: Lowest sum wins.
 * 3. 2 (lowest rank) is valued as 2. 9 is valued as 9.
 * 4. Value formula for comparator: 1000 - sum (so lower sum = higher value).
 */
export declare class Phase3Logic {
    static evaluate(cards: Card[]): Phase3Result;
}
