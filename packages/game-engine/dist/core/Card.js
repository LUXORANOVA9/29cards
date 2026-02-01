"use strict";
// packages/game-engine/src/core/Card.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardUtils = void 0;
class CardUtils {
    /**
     * Create a card from rank and suit
     */
    static create(rank, suit) {
        return {
            rank,
            suit,
            code: `${rank}${suit}`,
        };
    }
    /**
     * Parse a card code string (e.g., "9♥") into a Card object
     */
    static parse(code) {
        const rank = parseInt(code.slice(0, -1));
        const suit = code.slice(-1);
        return { rank, suit, code };
    }
    /**
     * Check if card is the special 9 of Hearts
     */
    static isNineOfHearts(card) {
        return card.rank === 9 && card.suit === '♥';
    }
    /**
     * Get the numeric value of a card for comparison
     * 9♥ is the highest card with value 100
     */
    static getValue(card) {
        if (this.isNineOfHearts(card))
            return 100;
        return card.rank;
    }
    /**
     * Compare two cards by value
     */
    static compare(a, b) {
        return this.getValue(a) - this.getValue(b);
    }
    /**
     * Sort cards by value (descending)
     */
    static sortByValue(cards) {
        return [...cards].sort((a, b) => this.getValue(b) - this.getValue(a));
    }
    /**
     * Get display string for a card
     */
    static display(card) {
        return card.code;
    }
}
exports.CardUtils = CardUtils;
