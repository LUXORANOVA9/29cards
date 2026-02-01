import { Card } from '../core/Card';
import { EvaluatedHand } from '../core/HandEvaluator';
import { FestivalState } from '../festival/FestivalEngine';
export declare enum GamePhase {
    WAITING = "WAITING",
    DEALING = "DEALING",
    BETTING = "BETTING",
    SHOWDOWN = "SHOWDOWN",
    SETTLEMENT = "SETTLEMENT",
    FESTIVAL = "FESTIVAL"
}
export declare enum PlayerAction {
    BLIND = "BLIND",
    CHAAL = "CHAAL",
    PLUS_CHAAL = "PLUS_CHAAL",
    FOLD = "FOLD",
    SIDE_SHOW = "SIDE_SHOW",
    SHOW = "SHOW"
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
export declare class GameStateManager {
    private roundId;
    private tableId;
    private phase;
    private players;
    private deck;
    private shuffledCards;
    private pot;
    private currentBet;
    private dealerSeat;
    private currentTurn;
    private bettingRound;
    private actions;
    private seed;
    private seedHash;
    private festivalEngine;
    constructor(tableId: string, roundId: string);
    addPlayer(playerId: string, seatNumber: number): boolean;
    removePlayer(playerId: string): boolean;
    /**
     * Start a new round - shuffle and deal
     */
    startRound(existingFestivalState?: FestivalState): {
        success: boolean;
        seedHash: string;
        playerCards: Map<string, Card[]>;
    };
    private getCardsPerPlayer;
    /**
     * Process player action
     */
    processAction(playerId: string, action: PlayerAction, amount?: number): {
        success: boolean;
        error?: string;
        nextTurn?: number;
        isRoundComplete?: boolean;
    };
    private processBlind;
    private processChaal;
    private processPlusChaal;
    private processFold;
    private processSideShow;
    private processShow;
    private recordAction;
    private advanceTurn;
    private getNextActivePlayer;
    /**
     * Evaluate all hands and determine winner
     */
    evaluateShowdown(): {
        winnerId: string;
        winnerHand: EvaluatedHand;
        allHands: Map<string, EvaluatedHand>;
        triggersFestival: boolean;
        festivalState?: FestivalState;
    };
    /**
     * Calculate settlement amounts
     */
    calculateSettlement(winnerId: string, nullPercent: number): {
        winnerAmount: number;
        nullAmount: number;
        pot: number;
    };
    getSnapshot(): GameStateSnapshot;
    static restore(snapshot: GameStateSnapshot): GameStateManager;
    /**
     * Get state for specific player (hides other players' cards)
     */
    getPlayerView(playerId: string): Partial<GameStateSnapshot> & {
        myCards: Card[];
    };
}
