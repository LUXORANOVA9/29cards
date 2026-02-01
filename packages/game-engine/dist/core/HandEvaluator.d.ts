import { Card } from './Card';
export declare enum HandType {
    TRAIL = "TRAIL",// Three of a Kind - HIGHEST
    NINE = "NINE",// Sum equals 9 (strict sum)
    HIGH_CARD = "HIGH_CARD"
}
export interface EvaluatedHand {
    type: HandType;
    value: number;
    tiebreaker: number;
    tertiaryBreaker: number;
    cards: Card[];
    description: string;
    sum: number;
}
export interface ComparisonResult {
    winner: 'hand1' | 'hand2' | 'tie';
    reason: string;
}
export declare class HandEvaluator {
    private static readonly PRIORITIES;
    /**
     * Evaluate a 3-card hand and return complete ranking info
     */
    static evaluate(cards: Card[]): EvaluatedHand;
    /**
     * Check for Trail: All three cards have the same rank
     */
    private static evaluateTrail;
    /**
     * Check for Nine: Sum of cards equals exactly 9
     * Examples: 2+3+4=9
     */
    private static evaluateNine;
    /**
     * High Card: No Trail or Nine, compare highest cards
     */
    private static evaluateHighCard;
    /**
     * Compare two evaluated hands and determine winner
     */
    static compare(hand1: EvaluatedHand, hand2: EvaluatedHand): ComparisonResult;
    /**
     * Find the winning hand among multiple players
     */
    static findWinner(hands: Map<string, EvaluatedHand>): {
        winnerId: string;
        hand: EvaluatedHand;
        tiedWith?: string[];
    } | null;
    /**
     * Check if a hand is a Trail (triggers Festival mode)
     */
    static isTrail(hand: EvaluatedHand): boolean;
    /**
     * Get Trail value if hand is a Trail
     */
    static getTrailValue(hand: EvaluatedHand): number | null;
}
