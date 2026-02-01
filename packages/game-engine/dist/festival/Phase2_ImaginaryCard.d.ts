import { Card } from '../core/Card';
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
export declare class Phase2Logic {
    static evaluate(cards: Card[]): Phase2Result;
}
