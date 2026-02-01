"use strict";
// packages/game-engine/src/game/GameState.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStateManager = exports.PlayerAction = exports.GamePhase = void 0;
const Deck_1 = require("../core/Deck");
const Shuffler_1 = require("../core/Shuffler");
const HandEvaluator_1 = require("../core/HandEvaluator");
const FestivalEngine_1 = require("../festival/FestivalEngine");
const Phase2_ImaginaryCard_1 = require("../festival/Phase2_ImaginaryCard");
const Phase3_Lowest_1 = require("../festival/Phase3_Lowest");
const Phase4_Joker_1 = require("../festival/Phase4_Joker");
var GamePhase;
(function (GamePhase) {
    GamePhase["WAITING"] = "WAITING";
    GamePhase["DEALING"] = "DEALING";
    GamePhase["BETTING"] = "BETTING";
    GamePhase["SHOWDOWN"] = "SHOWDOWN";
    GamePhase["SETTLEMENT"] = "SETTLEMENT";
    GamePhase["FESTIVAL"] = "FESTIVAL";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
var PlayerAction;
(function (PlayerAction) {
    PlayerAction["BLIND"] = "BLIND";
    PlayerAction["CHAAL"] = "CHAAL";
    PlayerAction["PLUS_CHAAL"] = "PLUS_CHAAL";
    PlayerAction["FOLD"] = "FOLD";
    PlayerAction["SIDE_SHOW"] = "SIDE_SHOW";
    PlayerAction["SHOW"] = "SHOW";
})(PlayerAction || (exports.PlayerAction = PlayerAction = {}));
class GameStateManager {
    constructor(tableId, roundId) {
        this.phase = GamePhase.WAITING;
        this.players = new Map();
        this.shuffledCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.dealerSeat = 0;
        this.currentTurn = 0;
        this.bettingRound = 1;
        this.actions = [];
        this.seed = '';
        this.seedHash = '';
        this.tableId = tableId;
        this.roundId = roundId;
        this.deck = new Deck_1.Deck();
        this.festivalEngine = new FestivalEngine_1.FestivalEngine();
    }
    // ==================== PLAYER MANAGEMENT ====================
    addPlayer(playerId, seatNumber) {
        if (this.players.has(playerId))
            return false;
        if (this.phase !== GamePhase.WAITING)
            return false;
        if ([...this.players.values()].some(p => p.seatNumber === seatNumber))
            return false;
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
    removePlayer(playerId) {
        return this.players.delete(playerId);
    }
    // ==================== GAME FLOW ====================
    /**
     * Start a new round - shuffle and deal
     */
    startRound(existingFestivalState) {
        if (this.players.size < 2) {
            return { success: false, seedHash: '', playerCards: new Map() };
        }
        // Restore festival state if continuing
        if (existingFestivalState?.isActive) {
            this.festivalEngine = new FestivalEngine_1.FestivalEngine(); // Re-init
            // Note: Full restoration logic would involve setting internal state
            if (existingFestivalState.triggerTrailValue) {
                this.festivalEngine.triggerFestival(existingFestivalState.triggerTrailValue);
                // Advance to correct phase
                while (this.festivalEngine.getState().currentPhase !== existingFestivalState.currentPhase &&
                    this.festivalEngine.getState().currentPhase !== FestivalEngine_1.FestivalPhase.NONE) {
                    this.festivalEngine.advancePhase();
                }
            }
        }
        // Generate seed and shuffle
        this.seed = Shuffler_1.Shuffler.generateSeed();
        this.shuffledCards = this.deck.shuffle(this.seed);
        this.seedHash = Shuffler_1.Shuffler.generateProofHash(this.seed, this.shuffledCards.map(c => c.code), this.roundId);
        // Determine cards per player based on festival phase
        const festivalState = this.festivalEngine.getState();
        const cardsPerPlayer = this.getCardsPerPlayer(festivalState.currentPhase);
        // Deal cards
        const playerCards = new Map();
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
    getCardsPerPlayer(festivalPhase) {
        switch (festivalPhase) {
            case FestivalEngine_1.FestivalPhase.PHASE_1_FOUR_CARD:
                return 4;
            case FestivalEngine_1.FestivalPhase.PHASE_2_IMAGINARY:
                return 2;
            default:
                return 3;
        }
    }
    /**
     * Process player action
     */
    processAction(playerId, action, amount) {
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
    processBlind(player) {
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
    processChaal(player, amount) {
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
    processPlusChaal(player, amount) {
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
    processFold(player) {
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
    processSideShow(player, targetSeat) {
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
        const myHand = HandEvaluator_1.HandEvaluator.evaluate(player.cards);
        const prevHand = HandEvaluator_1.HandEvaluator.evaluate(previousPlayer.cards);
        // Result: "If equal, previous player wins (challenger loses)" - standard Teen Patti rule
        const comparison = HandEvaluator_1.HandEvaluator.compare(myHand, prevHand);
        const iWin = comparison.winner === 'hand1';
        let loserId = iWin ? previousPlayer.id : player.id;
        let loser = this.players.get(loserId);
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
    processShow(player) {
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
    recordAction(playerId, action, amount) {
        this.actions.push({
            playerId,
            action,
            amount,
            timestamp: Date.now(),
        });
    }
    advanceTurn() {
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
    getNextActivePlayer(currentSeat) {
        const seats = [...this.players.values()]
            .filter(p => p.isActive)
            .map(p => p.seatNumber)
            .sort((a, b) => a - b);
        for (const seat of seats) {
            if (seat > currentSeat)
                return seat;
        }
        return seats[0]; // Wrap around
    }
    // ==================== SHOWDOWN & SETTLEMENT ====================
    /**
     * Evaluate all hands and determine winner
     */
    evaluateShowdown() {
        const activePlayers = [...this.players.values()].filter(p => p.isActive);
        const hands = new Map();
        for (const player of activePlayers) {
            const festivalState = this.festivalEngine.getState();
            let evaluated;
            if (festivalState.isActive && festivalState.currentPhase !== FestivalEngine_1.FestivalPhase.NONE) {
                // --- FESTIVAL MODE EVALUATION ---
                switch (festivalState.currentPhase) {
                    case FestivalEngine_1.FestivalPhase.PHASE_2_IMAGINARY:
                        const p2Result = Phase2_ImaginaryCard_1.Phase2Logic.evaluate(player.cards);
                        if (p2Result.evaluation) {
                            evaluated = p2Result.evaluation;
                        }
                        else {
                            // Failed to make 9, fallback to high card logic (but with 2 cards)
                            // Currently Phase2Logic doesn't return a fallback hand, we might need to construct one
                            // For now, treat as extremely low value
                            evaluated = {
                                type: HandEvaluator_1.HandType.HIGH_CARD,
                                value: 0, // Failed hand
                                tiebreaker: 0,
                                tertiaryBreaker: 0,
                                cards: player.cards,
                                description: 'Failed Phase 2',
                                sum: 0
                            };
                        }
                        break;
                    case FestivalEngine_1.FestivalPhase.PHASE_3_LOWEST:
                        const p3Result = Phase3_Lowest_1.Phase3Logic.evaluate(player.cards);
                        evaluated = {
                            type: HandEvaluator_1.HandType.HIGH_CARD, // Type doesn't matter much here, value does
                            value: p3Result.evaluation.value,
                            tiebreaker: 0, // No tiebreaker defined yet for Phase 3
                            tertiaryBreaker: 0,
                            cards: player.cards,
                            description: `Phase 3 Sum: ${p3Result.sum}`,
                            sum: p3Result.sum
                        };
                        break;
                    case FestivalEngine_1.FestivalPhase.PHASE_4_JOKER:
                        const jokerRank = festivalState.jokerValue || 0;
                        const p4Result = Phase4_Joker_1.Phase4Logic.evaluate(player.cards, jokerRank);
                        evaluated = {
                            type: HandEvaluator_1.HandType.HIGH_CARD,
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
                        evaluated = HandEvaluator_1.HandEvaluator.evaluate(player.cards);
                        break;
                }
            }
            else {
                // --- NORMAL MODE ---
                evaluated = HandEvaluator_1.HandEvaluator.evaluate(player.cards);
            }
            hands.set(player.id, evaluated);
        }
        const winner = HandEvaluator_1.HandEvaluator.findWinner(hands);
        if (!winner) {
            throw new Error('No winner found');
        }
        // Check if festival should trigger
        const triggersFestival = FestivalEngine_1.FestivalEngine.shouldTriggerFestival(winner.hand);
        let festivalState;
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
    calculateSettlement(winnerId, nullPercent) {
        const nullAmount = Math.floor(this.pot * (nullPercent / 100));
        const winnerAmount = this.pot - nullAmount;
        return {
            winnerAmount,
            nullAmount,
            pot: this.pot,
        };
    }
    // ==================== STATE SNAPSHOTS ====================
    getSnapshot() {
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
    static restore(snapshot) {
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
            manager.festivalEngine = new FestivalEngine_1.FestivalEngine(snapshot.festivalState);
        }
        return manager;
    }
    /**
     * Get state for specific player (hides other players' cards)
     */
    getPlayerView(playerId) {
        const snapshot = this.getSnapshot();
        const player = this.players.get(playerId);
        // Hide other players' cards
        const sanitizedPlayers = new Map();
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
            players: sanitizedPlayers,
            myCards: player?.cards || [],
        };
    }
}
exports.GameStateManager = GameStateManager;
