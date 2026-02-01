// packages/game-engine/src/game/GameState.ts

import { Card } from '../core/Card';
import { Deck } from '../core/Deck';
import { Shuffler } from '../core/Shuffler';
import { HandEvaluator, EvaluatedHand, HandType } from '../core/HandEvaluator';
import { FestivalEngine, FestivalPhase, FestivalState } from '../festival/FestivalEngine';
import { Phase2Logic } from '../festival/Phase2_ImaginaryCard';
import { Phase3Logic } from '../festival/Phase3_Lowest';
import { Phase4Logic } from '../festival/Phase4_Joker';

export enum GamePhase {
  WAITING = 'WAITING',
  DEALING = 'DEALING',
  BETTING = 'BETTING',
  SHOWDOWN = 'SHOWDOWN',
  SETTLEMENT = 'SETTLEMENT',
  FESTIVAL = 'FESTIVAL',
}

export enum PlayerAction {
  BLIND = 'BLIND',
  CHAAL = 'CHAAL',
  PLUS_CHAAL = 'PLUS_CHAAL',
  FOLD = 'FOLD',
  SIDE_SHOW = 'SIDE_SHOW',
  SHOW = 'SHOW',
}

export interface PlayerState {
  id: string;
  seatNumber: number;
  cards: Card[];
  hasSeen: boolean;
  isFolded: boolean;
  isActive: boolean;
  currentBet: number;
  totalBet: number;
}

export interface BetAction {
  playerId: string;
  action: PlayerAction;
  amount: number;
  timestamp: number;
}

export interface GameStateSnapshot {
  roundId: string;
  tableId: string;
  phase: GamePhase;
  festivalState: FestivalState;
  players: Map<string, PlayerState>;
  pot: number;
  currentBet: number;
  dealerSeat: number;
  currentTurn: number;
  bettingRound: number;
  actions: BetAction[];
  seedHash: string;
  createdAt: Date;
  shuffledCards?: Card[];
  seed?: string;
}

export class GameStateManager {
  private roundId: string;
  private tableId: string;
  private phase: GamePhase = GamePhase.WAITING;
  private players: Map<string, PlayerState> = new Map();
  private deck: Deck;
  private shuffledCards: Card[] = [];
  private pot: number = 0;
  private currentBet: number = 0;
  private dealerSeat: number = 0;
  private currentTurn: number = 0;
  private bettingRound: number = 1;
  private actions: BetAction[] = [];
  private seed: string = '';
  private seedHash: string = '';
  private festivalEngine: FestivalEngine;

  constructor(tableId: string, roundId: string) {
    this.tableId = tableId;
    this.roundId = roundId;
    this.deck = new Deck();
    this.festivalEngine = new FestivalEngine();
  }

  // ==================== PLAYER MANAGEMENT ====================

  addPlayer(playerId: string, seatNumber: number): boolean {
    if (this.players.has(playerId)) return false;
    if (this.phase !== GamePhase.WAITING) return false;
    if ([...this.players.values()].some(p => p.seatNumber === seatNumber)) return false;

    this.players.set(playerId, {
      id: playerId,
      seatNumber,
      cards: [],
      hasSeen: false,
      isFolded: false,
      isActive: true,
      currentBet: 0,
      totalBet: 0,
    });

    return true;
  }

  removePlayer(playerId: string): boolean {
    return this.players.delete(playerId);
  }

  // ==================== GAME FLOW ====================

  /**
   * Start a new round - shuffle and deal
   */
  startRound(existingFestivalState?: FestivalState): {
    success: boolean;
    seedHash: string;
    playerCards: Map<string, Card[]>;
  } {
    if (this.players.size < 2) {
      return { success: false, seedHash: '', playerCards: new Map() };
    }

    // Restore festival state if continuing
    if (existingFestivalState?.isActive) {
      this.festivalEngine = new FestivalEngine(); // Re-init
      // Note: Full restoration logic would involve setting internal state
      if (existingFestivalState.triggerTrailValue) {
        this.festivalEngine.triggerFestival(existingFestivalState.triggerTrailValue);
        // Advance to correct phase
        while (this.festivalEngine.getState().currentPhase !== existingFestivalState.currentPhase &&
          this.festivalEngine.getState().currentPhase !== FestivalPhase.NONE) {
          this.festivalEngine.advancePhase();
        }
      }
    }

    // Generate seed and shuffle
    this.seed = Shuffler.generateSeed();
    this.shuffledCards = this.deck.shuffle(this.seed);
    this.seedHash = Shuffler.generateProofHash(
      this.seed,
      this.shuffledCards.map(c => c.code),
      this.roundId
    );

    // Determine cards per player based on festival phase
    const festivalState = this.festivalEngine.getState();
    const cardsPerPlayer = this.getCardsPerPlayer(festivalState.currentPhase);

    // Deal cards
    const playerCards = new Map<string, Card[]>();
    let cardIndex = 0;

    for (const [playerId, player] of this.players) {
      const cards = this.shuffledCards.slice(cardIndex, cardIndex + cardsPerPlayer);
      player.cards = cards;
      playerCards.set(playerId, cards);
      cardIndex += cardsPerPlayer;
    }

    this.phase = GamePhase.DEALING;
    this.currentTurn = this.getNextActivePlayer(this.dealerSeat);

    return { success: true, seedHash: this.seedHash, playerCards };
  }

  private getCardsPerPlayer(festivalPhase: FestivalPhase): number {
    switch (festivalPhase) {
      case FestivalPhase.PHASE_1_FOUR_CARD:
        return 4;
      case FestivalPhase.PHASE_2_IMAGINARY:
        return 2;
      default:
        return 3;
    }
  }

  /**
   * Process player action
   */
  processAction(playerId: string, action: PlayerAction, amount?: number): {
    success: boolean;
    error?: string;
    nextTurn?: number;
    isRoundComplete?: boolean;
  } {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (player.seatNumber !== this.currentTurn) {
      return { success: false, error: 'Not your turn' };
    }

    if (player.isFolded) {
      return { success: false, error: 'Player already folded' };
    }

    // Process action
    switch (action) {
      case PlayerAction.BLIND:
        return this.processBlind(player);

      case PlayerAction.CHAAL:
        return this.processChaal(player, amount);

      case PlayerAction.PLUS_CHAAL:
        return this.processPlusChaal(player, amount);

      case PlayerAction.FOLD:
        return this.processFold(player);

      case PlayerAction.SIDE_SHOW:
        return this.processSideShow(player, amount); // amount used as targetSeat here potentially, or ignored if auto-previous

      case PlayerAction.SHOW:
        return this.processShow(player);

      default:
        return { success: false, error: 'Invalid action' };
    }
  }

  private processBlind(player: PlayerState): ReturnType<typeof this.processAction> {
    if (player.hasSeen) {
      return { success: false, error: 'Cannot play blind after seeing cards' };
    }

    const blindAmount = this.currentBet || 1; // Minimum bet
    player.currentBet = blindAmount;
    player.totalBet += blindAmount;
    this.pot += blindAmount;

    this.recordAction(player.id, PlayerAction.BLIND, blindAmount);

    return this.advanceTurn();
  }

  private processChaal(player: PlayerState, amount?: number): ReturnType<typeof this.processAction> {
    player.hasSeen = true;

    const requiredAmount = player.hasSeen ? this.currentBet * 2 : this.currentBet;
    const betAmount = amount || requiredAmount;

    if (betAmount < requiredAmount) {
      return { success: false, error: `Minimum bet is ${requiredAmount}` };
    }

    player.currentBet = betAmount;
    player.totalBet += betAmount;
    this.pot += betAmount;
    this.currentBet = Math.max(this.currentBet, betAmount);

    this.recordAction(player.id, PlayerAction.CHAAL, betAmount);

    return this.advanceTurn();
  }

  private processPlusChaal(player: PlayerState, amount?: number): ReturnType<typeof this.processAction> {
    player.hasSeen = true;

    const minRaise = this.currentBet * 2;
    const betAmount = amount || minRaise;

    if (betAmount <= this.currentBet) {
      return { success: false, error: 'Plus Chaal must be higher than current bet' };
    }

    player.currentBet = betAmount;
    player.totalBet += betAmount;
    this.pot += betAmount;
    this.currentBet = betAmount;

    this.recordAction(player.id, PlayerAction.PLUS_CHAAL, betAmount);

    return this.advanceTurn();
  }

  private processFold(player: PlayerState): ReturnType<typeof this.processAction> {
    player.isFolded = true;
    player.isActive = false;

    this.recordAction(player.id, PlayerAction.FOLD, 0);

    // Check if only one player remains
    const activePlayers = [...this.players.values()].filter(p => p.isActive);
    if (activePlayers.length === 1) {
      return {
        success: true,
        isRoundComplete: true,
      };
    }

    return this.advanceTurn();
  }

  private processSideShow(player: PlayerState, targetSeat?: number): ReturnType<typeof this.processAction> {
    if (this.currentBet === 0) {
      return { success: false, error: 'Cannot side show when no bet placed' };
    }

    // Previous player logic
    const activePlayers = [...this.players.values()]
      .filter(p => p.isActive)
      .sort((a, b) => a.seatNumber - b.seatNumber);

    const currentPlayerIndex = activePlayers.findIndex(p => p.id === player.id);
    // Wrap around to find previous
    const previousPlayerIndex = (currentPlayerIndex - 1 + activePlayers.length) % activePlayers.length;
    const previousPlayer = activePlayers[previousPlayerIndex];

    if (!previousPlayer) {
      return { success: false, error: 'No previous player found' };
    }

    if (targetSeat && previousPlayer.seatNumber !== targetSeat) {
      return { success: false, error: 'Side show can only be done with previous player' };
    }

    // Pay for Side Show (same as current bet)
    const cost = this.currentBet;
    player.currentBet = cost;
    player.totalBet += cost;
    this.pot += cost;

    // Compare Hands
    const myHand = HandEvaluator.evaluate(player.cards);
    const prevHand = HandEvaluator.evaluate(previousPlayer.cards);

    // Result: "If equal, previous player wins (challenger loses)" - standard Teen Patti rule
    const comparison = HandEvaluator.compare(myHand, prevHand);
    const iWin = comparison.winner === 'hand1';

    let loserId = iWin ? previousPlayer.id : player.id;
    let loser = this.players.get(loserId)!;

    // Fold the loser
    loser.isFolded = true;
    loser.isActive = false;

    this.recordAction(player.id, PlayerAction.SIDE_SHOW, cost);
    this.recordAction(loserId, PlayerAction.FOLD, 0); // System fold

    // Check if only 1 remains (Game Over)
    const remainingPlayers = [...this.players.values()].filter(p => p.isActive);
    if (remainingPlayers.length === 1) {
      return { success: true, isRoundComplete: true };
    }

    return this.advanceTurn();
  }

  private processShow(player: PlayerState): ReturnType<typeof this.processAction> {
    // Show can only be called when 2 players remain
    const activePlayers = [...this.players.values()].filter(p => p.isActive);
    if (activePlayers.length !== 2) {
      return { success: false, error: 'Show only available with 2 players' };
    }

    player.hasSeen = true;
    this.recordAction(player.id, PlayerAction.SHOW, 0);

    return {
      success: true,
      isRoundComplete: true,
    };
  }

  private recordAction(playerId: string, action: PlayerAction, amount: number): void {
    this.actions.push({
      playerId,
      action,
      amount,
      timestamp: Date.now(),
    });
  }

  private advanceTurn(): ReturnType<typeof this.processAction> {
    const nextTurn = this.getNextActivePlayer(this.currentTurn);
    this.currentTurn = nextTurn;

    // Check if betting round is complete
    const activePlayers = [...this.players.values()].filter(p => p.isActive);
    const allMatched = activePlayers.every(p => p.currentBet >= this.currentBet);

    if (allMatched) {
      this.bettingRound++;
    }

    return {
      success: true,
      nextTurn,
      isRoundComplete: false,
    };
  }

  private getNextActivePlayer(currentSeat: number): number {
    const seats = [...this.players.values()]
      .filter(p => p.isActive)
      .map(p => p.seatNumber)
      .sort((a, b) => a - b);

    for (const seat of seats) {
      if (seat > currentSeat) return seat;
    }

    return seats[0]; // Wrap around
  }

  // ==================== SHOWDOWN & SETTLEMENT ====================

  /**
   * Evaluate all hands and determine winner
   */
  evaluateShowdown(): {
    winnerId: string;
    winnerHand: EvaluatedHand;
    allHands: Map<string, EvaluatedHand>;
    triggersFestival: boolean;
    festivalState?: FestivalState;
  } {
    const activePlayers = [...this.players.values()].filter(p => p.isActive);
    const hands = new Map<string, EvaluatedHand>();

    for (const player of activePlayers) {
      const festivalState = this.festivalEngine.getState();
      let evaluated: EvaluatedHand;

      if (festivalState.isActive && festivalState.currentPhase !== FestivalPhase.NONE) {
        // --- FESTIVAL MODE EVALUATION ---
        switch (festivalState.currentPhase) {
          case FestivalPhase.PHASE_2_IMAGINARY:
            const p2Result = Phase2Logic.evaluate(player.cards);
            if (p2Result.evaluation) {
              evaluated = p2Result.evaluation;
            } else {
              // Failed to make 9, fallback to high card logic (but with 2 cards)
              // Currently Phase2Logic doesn't return a fallback hand, we might need to construct one
              // For now, treat as extremely low value
              evaluated = {
                type: HandType.HIGH_CARD,
                value: 0, // Failed hand
                tiebreaker: 0,
                tertiaryBreaker: 0,
                cards: player.cards,
                description: 'Failed Phase 2',
                sum: 0
              };
            }
            break;

          case FestivalPhase.PHASE_3_LOWEST:
            const p3Result = Phase3Logic.evaluate(player.cards);
            evaluated = {
              type: HandType.HIGH_CARD, // Type doesn't matter much here, value does
              value: p3Result.evaluation.value,
              tiebreaker: 0, // No tiebreaker defined yet for Phase 3
              tertiaryBreaker: 0,
              cards: player.cards,
              description: `Phase 3 Sum: ${p3Result.sum}`,
              sum: p3Result.sum
            };
            break;

          case FestivalPhase.PHASE_4_JOKER:
            const jokerRank = festivalState.jokerValue || 0;
            const p4Result = Phase4Logic.evaluate(player.cards, jokerRank);
            evaluated = {
              type: HandType.HIGH_CARD,
              value: p4Result.evaluation.value,
              tiebreaker: 0,
              tertiaryBreaker: 0,
              cards: player.cards,
              description: `Phase 4 Sum: ${p4Result.sum} (Joker: ${jokerRank})`,
              sum: p4Result.sum
            };
            break;

          default:
            // Phase 1 is standard evaluation (Trail > 9 > High)
            evaluated = HandEvaluator.evaluate(player.cards);
            break;
        }
      } else {
        // --- NORMAL MODE ---
        evaluated = HandEvaluator.evaluate(player.cards);
      }

      hands.set(player.id, evaluated);
    }

    const winner = HandEvaluator.findWinner(hands);

    if (!winner) {
      throw new Error('No winner found');
    }

    // Check if festival should trigger
    const triggersFestival = FestivalEngine.shouldTriggerFestival(winner.hand);
    let festivalState: FestivalState | undefined;

    if (triggersFestival) {
      festivalState = this.festivalEngine.triggerFestival(winner.hand.tiebreaker);
    }

    return {
      winnerId: winner.winnerId,
      winnerHand: winner.hand,
      allHands: hands,
      triggersFestival,
      festivalState,
    };
  }

  /**
   * Calculate settlement amounts
   */
  calculateSettlement(winnerId: string, nullPercent: number): {
    winnerAmount: number;
    nullAmount: number;
    pot: number;
  } {
    const nullAmount = Math.floor(this.pot * (nullPercent / 100));
    const winnerAmount = this.pot - nullAmount;

    return {
      winnerAmount,
      nullAmount,
      pot: this.pot,
    };
  }

  // ==================== STATE SNAPSHOTS ====================

  getSnapshot(): GameStateSnapshot {
    return {
      roundId: this.roundId,
      tableId: this.tableId,
      phase: this.phase,
      festivalState: this.festivalEngine.getState(),
      players: new Map(this.players),
      pot: this.pot,
      currentBet: this.currentBet,
      dealerSeat: this.dealerSeat,
      currentTurn: this.currentTurn,
      bettingRound: this.bettingRound,
      actions: [...this.actions],
      seedHash: this.seedHash,
      createdAt: new Date(),
      shuffledCards: this.shuffledCards,
      seed: this.seed,
    };
  }

  static restore(snapshot: GameStateSnapshot): GameStateManager {
    const manager = new GameStateManager(snapshot.tableId, snapshot.roundId);
    manager.phase = snapshot.phase;
    manager.pot = snapshot.pot;
    manager.currentBet = snapshot.currentBet;
    manager.dealerSeat = snapshot.dealerSeat;
    manager.currentTurn = snapshot.currentTurn;
    manager.bettingRound = snapshot.bettingRound;
    manager.actions = snapshot.actions;
    manager.seedHash = snapshot.seedHash;
    manager.seed = snapshot.seed || '';
    manager.shuffledCards = snapshot.shuffledCards || [];

    // Restore players
    snapshot.players.forEach((p, id) => {
      manager.players.set(id, { ...p });
    });

    // Restore festival state
    if (snapshot.festivalState) {
      manager.festivalEngine = new FestivalEngine(snapshot.festivalState);
    }

    return manager;
  }

  /**
   * Get state for specific player (hides other players' cards)
   */
  getPlayerView(playerId: string): Partial<GameStateSnapshot> & { myCards: Card[] } {
    const snapshot = this.getSnapshot();
    const player = this.players.get(playerId);

    // Hide other players' cards
    const sanitizedPlayers = new Map<string, Partial<PlayerState>>();
    for (const [id, p] of snapshot.players) {
      sanitizedPlayers.set(id, {
        id: p.id,
        seatNumber: p.seatNumber,
        hasSeen: p.hasSeen,
        isFolded: p.isFolded,
        isActive: p.isActive,
        totalBet: p.totalBet,
        // Cards hidden for other players
        cards: id === playerId ? p.cards : [],
      });
    }

    return {
      ...snapshot,
      players: sanitizedPlayers as any,
      myCards: player?.cards || [],
    };
  }
}
