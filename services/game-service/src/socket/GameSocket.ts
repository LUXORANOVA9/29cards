// services/game-service/src/socket/GameSocket.ts

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SocketEvents, JoinTablePayload, GameActionPayload } from './events';
import { handleJoinTable } from './handlers/joinHandler';
import { handleGameAction } from './handlers/actionHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export class GameSocket {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.initialize();
  }

  private initialize(): void {
    // Middleware for Authentication
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (err) return next(new Error('Authentication error: Invalid token'));
        (socket as any).user = decoded;
        next();
      });
    });

    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user;
      console.log(`User connected: ${user.userId}`);

      // Join Table Handler
      socket.on(SocketEvents.JOIN_TABLE, (payload: JoinTablePayload) => {
        handleJoinTable(this.io, socket, payload, user);
      });

      // Game Action Handler
      socket.on(SocketEvents.GAME_ACTION, (payload: GameActionPayload) => {
        handleGameAction(this.io, socket, payload, user);
      });

      // Start Game Handler
      socket.on(SocketEvents.START_GAME, (payload: any) => {
        import('./handlers/actionHandler').then(({ handleStartGame }) => {
          handleStartGame(this.io, socket, payload, user);
        });
      });

      // Chat Message
      socket.on(SocketEvents.CHAT_MESSAGE, (payload: any) => {
        // Broadcast to room
        if (payload.tableId) {
          socket.to(payload.tableId).emit(SocketEvents.CHAT_MESSAGE, {
            userId: user.userId,
            message: payload.message,
            timestamp: Date.now(),
          });
        }
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${user.userId}`);
        // Handle player leaving logic if needed (handled via timeouts usually)
      });
    });
  }
}
