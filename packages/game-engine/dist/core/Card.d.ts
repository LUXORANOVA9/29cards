export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export interface Card {
    rank: Rank;
    suit: Suit;
    code: string;
}
export declare class CardUtils {
    /**
     * Create a card from rank and suit
     */
    static create(rank: Rank, suit: Suit): Card;
    /**
     * Parse a card code string (e.g., "9♥") into a Card object
     */
    static parse(code: string): Card;
    /**
     * Check if card is the special 9 of Hearts
     */
    static isNineOfHearts(card: Card): boolean;
    /**
     * Get the numeric value of a card for comparison
     * 9♥ is the highest card with value 100
     */
    static getValue(card: Card): number;
    /**
     * Compare two cards by value
     */
    static compare(a: Card, b: Card): number;
    /**
     * Sort cards by value (descending)
     */
    static sortByValue(cards: Card[]): Card[];
    /**
     * Get display string for a card
     */
    static display(card: Card): string;
}
