"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStartGame = exports.handleGameAction = exports.broadcastGameState = void 0;
const events_1 = require("../events");
const gameStore_1 = require("../../store/gameStore");
const game_engine_1 = require("@29cards/game-engine");
const uuid_1 = require("uuid");
const mapAction = (action) => {
    switch (action) {
        case 'blind': return game_engine_1.PlayerAction.BLIND;
        case 'chaal': return game_engine_1.PlayerAction.CHAAL;
        case 'plus_chaal': return game_engine_1.PlayerAction.PLUS_CHAAL;
        case 'pack': return game_engine_1.PlayerAction.FOLD;
        case 'side_show': return game_engine_1.PlayerAction.SIDE_SHOW;
        case 'show': return game_engine_1.PlayerAction.SHOW;
        default: return null;
    }
};
const broadcastGameState = async (io, tableId, gameState) => {
    const sockets = await io.in(tableId).fetchSockets();
    for (const socket of sockets) {
        const userId = socket.user?.userId;
        if (userId) {
            const view = gameState.getPlayerView(userId);
            socket.emit(events_1.SocketEvents.GAME_UPDATE, view);
        }
    }
};
exports.broadcastGameState = broadcastGameState;
const handleGameAction = async (io, socket, payload, user) => {
    try {
        const { tableId, action: actionStr, amount } = payload;
        const action = mapAction(actionStr);
        if (!action) {
            return socket.emit(events_1.SocketEvents.ERROR, { message: 'Invalid action type' });
        }
        // 1. Fetch Game State (from Redis)
        const gameState = await (0, gameStore_1.loadGameState)(tableId);
        // 2. Validate & Process Action
        const result = gameState.processAction(user.userId, action, amount);
        if (!result.success) {
            return socket.emit(events_1.SocketEvents.ERROR, { message: result.error });
        }
        // 3. Save State
        await (0, gameStore_1.saveGameState)(tableId, gameState);
        // 4. Broadcast Update
        await (0, exports.broadcastGameState)(io, tableId, gameState);
        // 5. Check for Showdown/Next Round
        if (result.isRoundComplete) {
            if (action === game_engine_1.PlayerAction.SHOW || action === game_engine_1.PlayerAction.SIDE_SHOW || action === game_engine_1.PlayerAction.FOLD) {
                try {
                    const showdownResult = gameState.evaluateShowdown();
                    // Broadcast showdown result (careful not to expose cards unless intended)
                    // Usually showdown reveals all active hands.
                    // evaluateShowdown returns `allHands` which has EvaluatedHand.
                    // We also need to send the actual cards of the players involved.
                    // The clients need to see the cards to verify.
                    // So we should construct a public "Showdown" event payload.
                    io.to(tableId).emit(events_1.SocketEvents.GAME_UPDATE, {
                        type: 'SHOWDOWN',
                        data: showdownResult,
                        // We might want to include the full cards of active players here
                        playersCards: Object.fromEntries([...gameState.getSnapshot().players.values()]
                            .filter(p => p.isActive) // Only active players show cards? Or everyone? Usually active.
                            .map(p => [p.id, p.cards]))
                    });
                }
                catch (e) {
                    console.log('Round complete, but showdown might not be applicable if won by fold');
                    // If won by fold (only 1 player left), we just notify winner
                    const winner = [...gameState.getSnapshot().players.values()].find(p => p.isActive);
                    if (winner) {
                        io.to(tableId).emit(events_1.SocketEvents.GAME_UPDATE, {
                            type: 'ROUND_END',
                            winnerId: winner.id,
                            reason: 'FOLD'
                        });
                    }
                }
            }
        }
        console.log(`User ${user.userId} performed ${action} on table ${tableId}`);
    }
    catch (error) {
        console.error('Game Action Error:', error);
        socket.emit(events_1.SocketEvents.ERROR, { message: 'Failed to process action' });
    }
};
exports.handleGameAction = handleGameAction;
const handleStartGame = async (io, socket, payload, user) => {
    try {
        const { tableId } = payload;
        let oldState = null;
        try {
            oldState = await (0, gameStore_1.loadGameState)(tableId);
        }
        catch (e) {
            return socket.emit(events_1.SocketEvents.ERROR, { message: 'Table state not found' });
        }
        const snapshot = oldState.getSnapshot();
        if (snapshot.players.size < 2) {
            return socket.emit(events_1.SocketEvents.ERROR, { message: 'Not enough players to start' });
        }
        const newState = new game_engine_1.GameStateManager(tableId, (0, uuid_1.v4)());
        for (const [id, p] of snapshot.players) {
            newState.addPlayer(id, p.seatNumber);
        }
        const startResult = newState.startRound(snapshot.festivalState);
        if (!startResult.success) {
            return socket.emit(events_1.SocketEvents.ERROR, { message: 'Failed to start round' });
        }
        await (0, gameStore_1.saveGameState)(tableId, newState);
        await (0, exports.broadcastGameState)(io, tableId, newState);
        console.log(`Round started for table ${tableId}`);
    }
    catch (error) {
        console.error('Start Game Error:', error);
        socket.emit(events_1.SocketEvents.ERROR, { message: 'Failed to start game' });
    }
};
exports.handleStartGame = handleStartGame;
