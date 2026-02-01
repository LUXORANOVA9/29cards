import { Card } from '../core/Card';
import { EvaluatedHand } from '../core/HandEvaluator';
export declare enum FestivalPhase {
    NONE = "NONE",
    PHASE_1_FOUR_CARD = "PHASE_1_FOUR_CARD",
    PHASE_2_IMAGINARY = "PHASE_2_IMAGINARY",
    PHASE_3_LOWEST = "PHASE_3_LOWEST",
    PHASE_4_JOKER = "PHASE_4_JOKER"
}
export interface FestivalState {
    isActive: boolean;
    currentPhase: FestivalPhase;
    phasesRemaining: FestivalPhase[];
    triggerTrailValue: number | null;
    jokerValue: number | null;
    startedAt: Date | null;
    phasesCompleted: number;
}
export interface Phase1Result {
    selectedCards: Card[];
    discardedCard: Card;
    evaluation: EvaluatedHand;
}
export interface Phase2Result {
    originalCards: Card[];
    imaginaryCard: Card | null;
    canComplete: boolean;
    evaluation: EvaluatedHand | null;
}
export interface Phase3Result {
    cards: Card[];
    sum: number;
    evaluation: {
        value: number;
        isLowest: boolean;
    };
}
export interface Phase4Result {
    cards: Card[];
    hasJoker: boolean;
    jokerCard: Card | null;
    sum: number;
    evaluation: {
        value: number;
        isLowest: boolean;
    };
}
export declare class FestivalEngine {
    private state;
    constructor(existingState?: FestivalState);
    private createInitialState;
    /**
     * Trigger festival after a Trail occurs
     */
    triggerFestival(trailValue: number): FestivalState;
    /**
     * Advance to next festival phase
     */
    advancePhase(): FestivalState;
    /**
     * End festival and return to normal mode
     */
    endFestival(): FestivalState;
    /**
     * Get current festival state
     */
    getState(): FestivalState;
    /**
     * Check if festival should trigger based on winning hand
     */
    static shouldTriggerFestival(hand: EvaluatedHand): boolean;
    /**
     * Get cards per player for current phase
     */
    getCardsPerPlayer(): number;
}
