"use strict";
// packages/game-engine/src/festival/Phase3_Lowest.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.Phase3Logic = void 0;
/**
 * Phase 3: Lowest Wins
 *
 * Rules:
 * 1. Player receives 3 cards.
 * 2. Goal: Lowest sum wins.
 * 3. 2 (lowest rank) is valued as 2. 9 is valued as 9.
 * 4. Value formula for comparator: 1000 - sum (so lower sum = higher value).
 */
class Phase3Logic {
    static evaluate(cards) {
        if (cards.length !== 3) {
            throw new Error('Phase 3 requires exactly 3 cards');
        }
        const sum = cards.reduce((acc, c) => acc + c.rank, 0);
        // Invert value so that standard "Higher Value Wins" logic works
        // Max possible sum: 8+8+9 = 25. Min possible: 2+2+2 = 6.
        // 1000 - 6 = 994 (Best)
        // 1000 - 25 = 975 (Worst)
        const value = 1000 - sum;
        return {
            cards,
            sum,
            evaluation: {
                value,
                isLowest: true, // Marker for UI
            },
        };
    }
}
exports.Phase3Logic = Phase3Logic;
