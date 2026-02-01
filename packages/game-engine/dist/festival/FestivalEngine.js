"use strict";
// packages/game-engine/src/festival/FestivalEngine.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FestivalEngine = exports.FestivalPhase = void 0;
const HandEvaluator_1 = require("../core/HandEvaluator");
var FestivalPhase;
(function (FestivalPhase) {
    FestivalPhase["NONE"] = "NONE";
    FestivalPhase["PHASE_1_FOUR_CARD"] = "PHASE_1_FOUR_CARD";
    FestivalPhase["PHASE_2_IMAGINARY"] = "PHASE_2_IMAGINARY";
    FestivalPhase["PHASE_3_LOWEST"] = "PHASE_3_LOWEST";
    FestivalPhase["PHASE_4_JOKER"] = "PHASE_4_JOKER";
})(FestivalPhase || (exports.FestivalPhase = FestivalPhase = {}));
class FestivalEngine {
    constructor(existingState) {
        this.state = existingState || this.createInitialState();
    }
    createInitialState() {
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
    triggerFestival(trailValue) {
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
    advancePhase() {
        if (!this.state.isActive) {
            return { ...this.state };
        }
        this.state.phasesCompleted++;
        if (this.state.phasesRemaining.length === 0) {
            // Festival complete, return to normal
            return this.endFestival();
        }
        const nextPhase = this.state.phasesRemaining.shift();
        this.state.currentPhase = nextPhase;
        return { ...this.state };
    }
    /**
     * End festival and return to normal mode
     */
    endFestival() {
        this.state = this.createInitialState();
        return { ...this.state };
    }
    /**
     * Get current festival state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Check if festival should trigger based on winning hand
     */
    static shouldTriggerFestival(hand) {
        return hand.type === HandEvaluator_1.HandType.TRAIL;
    }
    /**
     * Get cards per player for current phase
     */
    getCardsPerPlayer() {
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
exports.FestivalEngine = FestivalEngine;
