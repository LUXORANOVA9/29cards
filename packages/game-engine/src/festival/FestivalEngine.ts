// packages/game-engine/src/festival/FestivalEngine.ts

import { Card } from '../core/Card';
import { HandEvaluator, EvaluatedHand, HandType } from '../core/HandEvaluator';

export enum FestivalPhase {
  NONE = 'NONE',
  PHASE_1_FOUR_CARD = 'PHASE_1_FOUR_CARD',
  PHASE_2_IMAGINARY = 'PHASE_2_IMAGINARY',
  PHASE_3_LOWEST = 'PHASE_3_LOWEST',
  PHASE_4_JOKER = 'PHASE_4_JOKER',
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
  evaluation: { value: number; isLowest: boolean };
}

export interface Phase4Result {
  cards: Card[];
  hasJoker: boolean;
  jokerCard: Card | null;
  sum: number;
  evaluation: { value: number; isLowest: boolean };
}

export class FestivalEngine {
  private state: FestivalState;

  constructor(existingState?: FestivalState) {
    this.state = existingState || this.createInitialState();
  }

  private createInitialState(): FestivalState {
    return {
      isActive: false,
      currentPhase: FestivalPhase.NONE,
      phasesRemaining: [],
      triggerTrailValue: null,
      jokerValue: null,
      startedAt: null,
      phasesCompleted: 0,
    };
  }

  /**
   * Trigger festival after a Trail occurs
   */
  triggerFestival(trailValue: number): FestivalState {
    this.state = {
      isActive: true,
      currentPhase: FestivalPhase.PHASE_1_FOUR_CARD,
      phasesRemaining: [
        FestivalPhase.PHASE_2_IMAGINARY,
        FestivalPhase.PHASE_3_LOWEST,
        FestivalPhase.PHASE_4_JOKER,
      ],
      triggerTrailValue: trailValue,
      jokerValue: trailValue, // Joker is the trail card value
      startedAt: new Date(),
      phasesCompleted: 0,
    };

    return { ...this.state };
  }

  /**
   * Advance to next festival phase
   */
  advancePhase(): FestivalState {
    if (!this.state.isActive) {
      return { ...this.state };
    }

    this.state.phasesCompleted++;

    if (this.state.phasesRemaining.length === 0) {
      // Festival complete, return to normal
      return this.endFestival();
    }

    const nextPhase = this.state.phasesRemaining.shift()!;
    this.state.currentPhase = nextPhase;

    return { ...this.state };
  }

  /**
   * End festival and return to normal mode
   */
  endFestival(): FestivalState {
    this.state = this.createInitialState();
    return { ...this.state };
  }

  /**
   * Get current festival state
   */
  getState(): FestivalState {
    return { ...this.state };
  }

  /**
   * Check if festival should trigger based on winning hand
   */
  static shouldTriggerFestival(hand: EvaluatedHand): boolean {
    return hand.type === HandType.TRAIL;
  }

  /**
   * Get cards per player for current phase
   */
  getCardsPerPlayer(): number {
    switch (this.state.currentPhase) {
      case FestivalPhase.PHASE_1_FOUR_CARD:
        return 4;
      case FestivalPhase.PHASE_2_IMAGINARY:
        return 2;
      default:
        return 3;
    }
  }
}
