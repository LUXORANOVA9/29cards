import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';

const GAME_SERVICE_URL = process.env.NEXT_PUBLIC_GAME_SERVICE_URL || 'http://localhost:3002';

export const useGameSocket = (tableId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();
  const { setGameState } = useGameStore();

  useEffect(() => {
    if (!accessToken) return;

    // Initialize Socket
    socketRef.current = io(GAME_SERVICE_URL, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to Game Server');
      if (tableId) {
        socket.emit('JOIN_TABLE', { tableId, authToken: accessToken });
      }
    });

    socket.on('TABLE_STATE', (state: any) => {
      console.log('Received Table State:', state);
      // Map server state to client store
      setGameState({
        tableId: state.tableId,
        roundId: state.roundId,
        phase: state.phase,
        players: Array.from(state.players.values()), // Map -> Array
        pot: state.pot,
        currentBet: state.currentBet,
        currentTurn: state.currentTurn,
      });
    });

    socket.on('GAME_UPDATE', (state: any) => {
      console.log('Game Update:', state);
      setGameState({
        phase: state.phase,
        pot: state.pot,
        currentBet: state.currentBet,
        currentTurn: state.currentTurn,
        players: Array.from(state.players.values()),
      });
    });

    socket.on('PLAYER_JOINED', (data: any) => {
      console.log('Player Joined:', data);
      // Trigger refetch or optimistic update
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Game Server');
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, tableId, setGameState]);

  const sendAction = (action: string, payload: any = {}) => {
    if (socketRef.current) {
      socketRef.current.emit('GAME_ACTION', {
        tableId,
        action,
        ...payload,
      });
    }
  };

  return { socket: socketRef.current, sendAction };
};
