import { Server, Socket } from 'socket.io';
import { JoinTablePayload, SocketEvents } from '../events';
import { GameStateManager } from '@29cards/game-engine';
import { loadGameState, saveGameState } from '../../store/gameStore';
import { broadcastGameState } from './actionHandler';
import { v4 as uuidv4 } from 'uuid';

export const handleJoinTable = async (
  io: Server,
  socket: Socket,
  payload: JoinTablePayload,
  user: any
) => {
  try {
    const { tableId } = payload;

    // 1. Load or Create Game State
    let gameState: GameStateManager;
    try {
      gameState = await loadGameState(tableId);
    } catch (e) {
      // Create new if not exists
      // In a real app, verify tableId exists in DB first
      console.log(`Initializing new game state for table ${tableId}`);
      gameState = new GameStateManager(tableId, uuidv4());
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
      return socket.emit(SocketEvents.ERROR, { message: 'Table is full' });
    }

    // 3. Add player
    const added = gameState.addPlayer(user.userId, seatNumber);
    if (!added) {
      // Check if already joined
      const existing = gameState.getSnapshot().players.get(user.userId);
      if (existing) {
        seatNumber = existing.seatNumber;
      } else {
        return socket.emit(SocketEvents.ERROR, { message: 'Failed to join table' });
      }
    } else {
      await saveGameState(tableId, gameState);
    }

    // 4. Join Socket Room
    socket.join(tableId);

    // 5. Notify User
    // Get player view
    const playerView = gameState.getPlayerView(user.userId);
    socket.emit(SocketEvents.TABLE_STATE, playerView);

    // 6. Notify Room
    if (added) {
        io.to(tableId).emit(SocketEvents.PLAYER_JOINED, {
            userId: user.userId,
            seatNumber,
            // Add other profile info if available in 'user' object
        });
        await broadcastGameState(io, tableId, gameState);
    }

    console.log(`User ${user.userId} joined table ${tableId} at seat ${seatNumber}`);

  } catch (error) {
    console.error('Join Table Error:', error);
    socket.emit(SocketEvents.ERROR, { message: 'Failed to join table' });
  }
};
