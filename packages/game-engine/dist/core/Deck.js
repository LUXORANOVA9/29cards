"use strict";
// packages/game-engine/src/core/Deck.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deck = void 0;
const Card_1 = require("./Card");
const Shuffler_1 = require("./Shuffler");
class Deck {
    constructor() {
        this.cards = [];
        this.initialize();
    }
    /**
     * Initialize a fresh deck with all 29 cards
     */
    initialize() {
        this.cards = [];
        // Add standard ranks (2-8) in all suits
        for (const rank of Deck.STANDARD_RANKS) {
            for (const suit of Deck.SUITS) {
                this.cards.push(Card_1.CardUtils.create(rank, suit));
            }
        }
        // Add the special 9 of Hearts (highest card)
        this.cards.push(Card_1.CardUtils.create(9, '♥'));
    }
    /**
     * Shuffle deck using cryptographic seed
     * Returns a new shuffled array (does not mutate original)
     */
    shuffle(seed) {
        return Shuffler_1.Shuffler.deterministicShuffle([...this.cards], seed);
    }
    /**
     * Get all cards in current order
     */
    getCards() {
        return [...this.cards];
    }
    /**
     * Reset deck to initial state
     */
    reset() {
        this.initialize();
    }
    /**
     * Validate that a set of cards forms a valid complete deck
     */
    static validateDeck(cards) {
        if (cards.length !== this.TOTAL_CARDS)
            return false;
        const cardSet = new Set(cards.map(c => c.code));
        if (cardSet.size !== this.TOTAL_CARDS)
            return false;
        // Verify all expected cards exist
        for (const rank of this.STANDARD_RANKS) {
            for (const suit of this.SUITS) {
                if (!cardSet.has(`${rank}${suit}`))
                    return false;
            }
        }
        // Verify 9♥ exists
        if (!cardSet.has('9♥'))
            return false;
        return true;
    }
    /**
     * Get total card count
     */
    static getTotalCards() {
        return this.TOTAL_CARDS;
    }
    /**
     * Get maximum players that can be dealt 3 cards
     */
    static getMaxPlayers() {
        return Math.floor(this.TOTAL_CARDS / 3);
    }
}
exports.Deck = Deck;
// Sindhi Patta deck configuration
// Cards: 2-8 in all 4 suits (28 cards) + 9♥ (1 card) = 29 total
Deck.STANDARD_RANKS = [2, 3, 4, 5, 6, 7, 8];
Deck.SUITS = ['♠', '♥', '♦', '♣'];
Deck.TOTAL_CARDS = 29;
