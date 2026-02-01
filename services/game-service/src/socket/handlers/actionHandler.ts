import { Server, Socket } from 'socket.io';
import { GameActionPayload, SocketEvents } from '../events';
import { loadGameState, saveGameState } from '../../store/gameStore';
import { PlayerAction, GameStateManager } from '@29cards/game-engine';
import { v4 as uuidv4 } from 'uuid';

const mapAction = (action: string): PlayerAction | null => {
  switch (action) {
    case 'blind': return PlayerAction.BLIND;
    case 'chaal': return PlayerAction.CHAAL;
    case 'plus_chaal': return PlayerAction.PLUS_CHAAL;
    case 'pack': return PlayerAction.FOLD;
    case 'side_show': return PlayerAction.SIDE_SHOW;
    case 'show': return PlayerAction.SHOW;
    default: return null;
  }
};

export const broadcastGameState = async (io: Server, tableId: string, gameState: GameStateManager) => {
  const sockets = await io.in(tableId).fetchSockets();
  for (const socket of sockets) {
    const userId = (socket as any).user?.userId;
    if (userId) {
      const view = gameState.getPlayerView(userId);
      socket.emit(SocketEvents.GAME_UPDATE, view);
    }
  }
};

export const handleGameAction = async (
  io: Server,
  socket: Socket,
  payload: GameActionPayload,
  user: any
) => {
  try {
    const { tableId, action: actionStr, amount } = payload;
    const action = mapAction(actionStr);

    if (!action) {
      return socket.emit(SocketEvents.ERROR, { message: 'Invalid action type' });
    }

    // 1. Fetch Game State (from Redis)
    const gameState = await loadGameState(tableId);

    // 2. Validate & Process Action
    const result = gameState.processAction(user.userId, action, amount);

    if (!result.success) {
      return socket.emit(SocketEvents.ERROR, { message: result.error });
    }

    // 3. Save State
    await saveGameState(tableId, gameState);

    // 4. Broadcast Update
    await broadcastGameState(io, tableId, gameState);

    // 5. Check for Showdown/Next Round
    if (result.isRoundComplete) {
      if (action === PlayerAction.SHOW || action === PlayerAction.SIDE_SHOW || action === PlayerAction.FOLD) {
        try {
          const showdownResult = gameState.evaluateShowdown();

          // Broadcast showdown result (careful not to expose cards unless intended)
          // Usually showdown reveals all active hands.
          // evaluateShowdown returns `allHands` which has EvaluatedHand.
          // We also need to send the actual cards of the players involved.
          // The clients need to see the cards to verify.
          // So we should construct a public "Showdown" event payload.

          io.to(tableId).emit(SocketEvents.GAME_UPDATE, {
            type: 'SHOWDOWN',
            data: showdownResult,
            // We might want to include the full cards of active players here
            playersCards: Object.fromEntries(
              [...gameState.getSnapshot().players.values()]
                .filter(p => p.isActive) // Only active players show cards? Or everyone? Usually active.
                .map(p => [p.id, p.cards])
            )
          });

        } catch (e) {
          console.log('Round complete, but showdown might not be applicable if won by fold');
          // If won by fold (only 1 player left), we just notify winner
          const winner = [...gameState.getSnapshot().players.values()].find(p => p.isActive);
          if (winner) {
            io.to(tableId).emit(SocketEvents.GAME_UPDATE, {
              type: 'ROUND_END',
              winnerId: winner.id,
              reason: 'FOLD'
            });
          }
        }
      }
    }

    console.log(`User ${user.userId} performed ${action} on table ${tableId}`);

  } catch (error) {
    console.error('Game Action Error:', error);
    socket.emit(SocketEvents.ERROR, { message: 'Failed to process action' });
  }
};

export const handleStartGame = async (
  io: Server,
  socket: Socket,
  payload: { tableId: string },
  user: any
) => {
  try {
    const { tableId } = payload;
    let oldState: GameStateManager | null = null;

    try {
      oldState = await loadGameState(tableId);
    } catch (e) {
      return socket.emit(SocketEvents.ERROR, { message: 'Table state not found' });
    }

    const snapshot = oldState.getSnapshot();

    if (snapshot.players.size < 2) {
      return socket.emit(SocketEvents.ERROR, { message: 'Not enough players to start' });
    }

    const newState = new GameStateManager(tableId, uuidv4());

    for (const [id, p] of snapshot.players) {
      newState.addPlayer(id, p.seatNumber);
    }

    const startResult = newState.startRound(snapshot.festivalState);

    if (!startResult.success) {
      return socket.emit(SocketEvents.ERROR, { message: 'Failed to start round' });
    }

    await saveGameState(tableId, newState);

    await broadcastGameState(io, tableId, newState);

    console.log(`Round started for table ${tableId}`);

  } catch (error) {
    console.error('Start Game Error:', error);
    socket.emit(SocketEvents.ERROR, { message: 'Failed to start game' });
  }
};
