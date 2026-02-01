import { redisClient } from '../redis';
import { GameStateManager, GameStateSnapshot } from '@29cards/game-engine';

const GAME_STATE_PREFIX = 'game:state:';
const STATE_TTL = 3600; // 1 hour

// Helper to deserialize
const parseGameState = (json: string): GameStateSnapshot => {
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

export const loadGameState = async (tableId: string): Promise<GameStateManager> => {
  const key = `${GAME_STATE_PREFIX}${tableId}`;
  const data = await redisClient.get(key);

  if (!data) {
    throw new Error(`Game state not found for table ${tableId}`);
  }

  try {
    const snapshot = parseGameState(data);
    return GameStateManager.restore(snapshot);
  } catch (error) {
    console.error('Failed to parse game state:', error);
    throw new Error('Corrupted game state');
  }
};

export const saveGameState = async (tableId: string, gameState: GameStateManager): Promise<void> => {
  const key = `${GAME_STATE_PREFIX}${tableId}`;
  const snapshot = gameState.getSnapshot();
  
  const serialized = JSON.stringify(snapshot, (key, value) => {
    if (value instanceof Map) {
      return Array.from(value.entries());
    }
    return value;
  });

  await redisClient.set(key, serialized, {
    EX: STATE_TTL
  });
};
