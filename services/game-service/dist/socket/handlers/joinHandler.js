"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleJoinTable = void 0;
const events_1 = require("../events");
const game_engine_1 = require("@29cards/game-engine");
const gameStore_1 = require("../../store/gameStore");
const actionHandler_1 = require("./actionHandler");
const uuid_1 = require("uuid");
const handleJoinTable = async (io, socket, payload, user) => {
    try {
        const { tableId } = payload;
        // 1. Load or Create Game State
        let gameState;
        try {
            gameState = await (0, gameStore_1.loadGameState)(tableId);
        }
        catch (e) {
            // Create new if not exists
            // In a real app, verify tableId exists in DB first
            console.log(`Initializing new game state for table ${tableId}`);
            gameState = new game_engine_1.GameStateManager(tableId, (0, uuid_1.v4)());
        }
        // 2. Find Seat
        // Simple seat assignment logic: find first available 0-5
        const existingSeats = new Set([...gameState.getSnapshot().players.values()].map(p => p.seatNumber));
        let seatNumber = -1;
        for (let i = 0; i < 6; i++) { // Max 6 players
            if (!existingSeats.has(i)) {
                seatNumber = i;
                break;
            }
        }
        if (seatNumber === -1) {
            return socket.emit(events_1.SocketEvents.ERROR, { message: 'Table is full' });
        }
        // 3. Add player
        const added = gameState.addPlayer(user.userId, seatNumber);
        if (!added) {
            // Check if already joined
            const existing = gameState.getSnapshot().players.get(user.userId);
            if (existing) {
                seatNumber = existing.seatNumber;
            }
            else {
                return socket.emit(events_1.SocketEvents.ERROR, { message: 'Failed to join table' });
            }
        }
        else {
            await (0, gameStore_1.saveGameState)(tableId, gameState);
        }
        // 4. Join Socket Room
        socket.join(tableId);
        // 5. Notify User
        // Get player view
        const playerView = gameState.getPlayerView(user.userId);
        socket.emit(events_1.SocketEvents.TABLE_STATE, playerView);
        // 6. Notify Room
        if (added) {
            io.to(tableId).emit(events_1.SocketEvents.PLAYER_JOINED, {
                userId: user.userId,
                seatNumber,
                // Add other profile info if available in 'user' object
            });
            await (0, actionHandler_1.broadcastGameState)(io, tableId, gameState);
        }
        console.log(`User ${user.userId} joined table ${tableId} at seat ${seatNumber}`);
    }
    catch (error) {
        console.error('Join Table Error:', error);
        socket.emit(events_1.SocketEvents.ERROR, { message: 'Failed to join table' });
    }
};
exports.handleJoinTable = handleJoinTable;
