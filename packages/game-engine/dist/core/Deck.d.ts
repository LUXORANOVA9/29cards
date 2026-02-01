import { Card } from './Card';
export declare class Deck {
    private cards;
    private static readonly STANDARD_RANKS;
    private static readonly SUITS;
    private static readonly TOTAL_CARDS;
    constructor();
    /**
     * Initialize a fresh deck with all 29 cards
     */
    private initialize;
    /**
     * Shuffle deck using cryptographic seed
     * Returns a new shuffled array (does not mutate original)
     */
    shuffle(seed: string): Card[];
    /**
     * Get all cards in current order
     */
    getCards(): Card[];
    /**
     * Reset deck to initial state
     */
    reset(): void;
    /**
     * Validate that a set of cards forms a valid complete deck
     */
    static validateDeck(cards: Card[]): boolean;
    /**
     * Get total card count
     */
    static getTotalCards(): number;
    /**
     * Get maximum players that can be dealt 3 cards
     */
    static getMaxPlayers(): number;
}
