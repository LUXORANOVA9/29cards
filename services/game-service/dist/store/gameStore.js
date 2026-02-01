"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveGameState = exports.loadGameState = void 0;
const redis_1 = require("../redis");
const game_engine_1 = require("@29cards/game-engine");
const GAME_STATE_PREFIX = 'game:state:';
const STATE_TTL = 3600; // 1 hour
// Helper to deserialize
const parseGameState = (json) => {
    return JSON.parse(json, (key, value) => {
        if (key === 'players' && Array.isArray(value)) {
            return new Map(value);
        }
        if (key === 'createdAt' || key === 'startedAt') {
            return new Date(value);
        }
        return value;
    });
};
const loadGameState = async (tableId) => {
    const key = `${GAME_STATE_PREFIX}${tableId}`;
    const data = await redis_1.redisClient.get(key);
    if (!data) {
        throw new Error(`Game state not found for table ${tableId}`);
    }
    try {
        const snapshot = parseGameState(data);
        return game_engine_1.GameStateManager.restore(snapshot);
    }
    catch (error) {
        console.error('Failed to parse game state:', error);
        throw new Error('Corrupted game state');
    }
};
exports.loadGameState = loadGameState;
const saveGameState = async (tableId, gameState) => {
    const key = `${GAME_STATE_PREFIX}${tableId}`;
    const snapshot = gameState.getSnapshot();
    const serialized = JSON.stringify(snapshot, (key, value) => {
        if (value instanceof Map) {
            return Array.from(value.entries());
        }
        return value;
    });
    await redis_1.redisClient.set(key, serialized, {
        EX: STATE_TTL
    });
};
exports.saveGameState = saveGameState;
