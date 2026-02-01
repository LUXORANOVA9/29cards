// packages/game-engine/src/core/Card.ts

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Card {
  rank: Rank;
  suit: Suit;
  code: string;
}

export class CardUtils {
  /**
   * Create a card from rank and suit
   */
  static create(rank: Rank, suit: Suit): Card {
    return {
      rank,
      suit,
      code: `${rank}${suit}`,
    };
  }

  /**
   * Parse a card code string (e.g., "9♥") into a Card object
   */
  static parse(code: string): Card {
    const rank = parseInt(code.slice(0, -1)) as Rank;
    const suit = code.slice(-1) as Suit;
    return { rank, suit, code };
  }

  /**
   * Check if card is the special 9 of Hearts
   */
  static isNineOfHearts(card: Card): boolean {
    return card.rank === 9 && card.suit === '♥';
  }

  /**
   * Get the numeric value of a card for comparison
   * 9♥ is the highest card with value 100
   */
  static getValue(card: Card): number {
    if (this.isNineOfHearts(card)) return 100;
    return card.rank;
  }

  /**
   * Compare two cards by value
   */
  static compare(a: Card, b: Card): number {
    return this.getValue(a) - this.getValue(b);
  }

  /**
   * Sort cards by value (descending)
   */
  static sortByValue(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => this.getValue(b) - this.getValue(a));
  }

  /**
   * Get display string for a card
   */
  static display(card: Card): string {
    return card.code;
  }
}
