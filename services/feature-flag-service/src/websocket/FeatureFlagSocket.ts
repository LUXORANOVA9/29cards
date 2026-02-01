// src/websocket/FeatureFlagSocket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { FeatureFlagService } from '../services/FeatureFlagService';

export class FeatureFlagSocket {
  private io: SocketIOServer;

  constructor(
    httpServer: HTTPServer,
    private featureFlagService: FeatureFlagService
  ) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as any;
        socket.data.user = decoded;
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.data.user.userId}`);

      // Join user-specific room for personalized updates
      socket.join(`user:${socket.data.user.userId}`);
      
      // Join role-based rooms
      socket.join(`role:${socket.data.user.role}`);
      
      // Join panel-specific room if applicable
      if (socket.data.user.panelId) {
        socket.join(`panel:${socket.data.user.panelId}`);
      }

      // Handle flag evaluation requests
      socket.on('evaluate_flag', async (data, callback) => {
        try {
          const { featureKey, context } = data;
          
          const evaluationContext = {
            user: {
              ...socket.data.user,
              ...context?.user
            },
            environment: context?.environment || 'production',
            customAttributes: context?.customAttributes,
            timestamp: Date.now(),
            sessionId: socket.id,
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
          };

          const result = await this.featureFlagService.evaluateFlag(featureKey, evaluationContext);
          callback({ success: true, result });
        } catch (error) {
          console.error('Socket evaluation error:', error);
          callback({ success: false, error: 'Evaluation failed' });
        }
      });

      // Handle multiple flag evaluations
      socket.on('evaluate_flags', async (data, callback) => {
        try {
          const { keys, context } = data;
          
          const evaluationContext = {
            user: {
              ...socket.data.user,
              ...context?.user
            },
            environment: context?.environment || 'production',
            customAttributes: context?.customAttributes,
            timestamp: Date.now(),
            sessionId: socket.id,
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
          };

          const results = await Promise.all(
            keys.map(async (key: string) => {
              const result = await this.featureFlagService.evaluateFlag(key, evaluationContext);
              return { key, result };
            })
          );

          callback({ success: true, results });
        } catch (error) {
          console.error('Socket multiple evaluation error:', error);
          callback({ success: false, error: 'Evaluation failed' });
        }
      });

      // Handle analytics events
      socket.on('track_event', async (data) => {
        try {
          const { type, featureKey, variantKey, metadata } = data;
          
          // Emit to analytics room for processing
          this.io.to('analytics').emit('analytics_event', {
            type,
            featureKey,
            userId: socket.data.user.userId,
            variantKey,
            timestamp: Date.now(),
            metadata: {
              ...metadata,
              socketId: socket.id,
              userAgent: socket.handshake.headers['user-agent']
            }
          });
        } catch (error) {
          console.error('Socket analytics error:', error);
          socket.emit('error', { message: 'Failed to track event' });
        }
      });

      // Handle subscription to flag updates
      socket.on('subscribe_flags', async (data) => {
        try {
          const { flags, environment } = data;
          
          if (flags) {
            // Subscribe to specific flags
            flags.forEach((flagKey: string) => {
              socket.join(`flag:${flagKey}:${environment || 'production'}`);
            });
          } else {
            // Subscribe to all flags
            socket.join(`flags:${environment || 'production'}`);
          }
          
          socket.emit('subscribed', { flags, environment });
        } catch (error) {
          console.error('Socket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      // Handle unsubscribe
      socket.on('unsubscribe_flags', async (data) => {
        try {
          const { flags, environment } = data;
          
          if (flags) {
            flags.forEach((flagKey: string) => {
              socket.leave(`flag:${flagKey}:${environment || 'production'}`);
            });
          } else {
            socket.leave(`flags:${environment || 'production'}`);
          }
          
          socket.emit('unsubscribed', { flags, environment });
        } catch (error) {
          console.error('Socket unsubscribe error:', error);
          socket.emit('error', { message: 'Failed to unsubscribe' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.data.user.userId}, reason: ${reason}`);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.data.user.userId}:`, error);
      });
    });

    // Set up analytics listener (in a real implementation, this would be a separate service)
    this.io.of('/analytics').on('connection', (socket) => {
      socket.join('analytics');
    });
  }

  // Public methods for broadcasting updates
  public broadcastFlagUpdate(flagKey: string, flag: any, environment: string): void {
    // Broadcast to all subscribers
    this.io.to(`flag:${flagKey}:${environment}`).emit('flag_update', {
      type: 'flag_update',
      data: {
        flag,
        timestamp: Date.now()
      }
    });

    // Broadcast to general flag subscribers
    this.io.to(`flags:${environment}`).emit('flag_update', {
      type: 'flag_update',
      data: {
        flag,
        timestamp: Date.now()
      }
    });
  }

  public broadcastFlagCreated(flagKey: string, flag: any, environment: string): void {
    this.io.to(`flags:${environment}`).emit('flag_created', {
      type: 'flag_created',
      data: {
        flag,
        timestamp: Date.now()
      }
    });
  }

  public broadcastFlagDeleted(flagKey: string, environment: string): void {
    this.io.to(`flag:${flagKey}:${environment}`).emit('flag_deleted', {
      type: 'flag_deleted',
      data: {
        flagKey,
        environment,
        timestamp: Date.now()
      }
    });

    this.io.to(`flags:${environment}`).emit('flag_deleted', {
      type: 'flag_deleted',
      data: {
        flagKey,
        environment,
        timestamp: Date.now()
      }
    });
  }

  public broadcastToUsers(userIds: string[], event: string, data: any): void {
    userIds.forEach(userId => {
      this.io.to(`user:${userId}`).emit(event, data);
    });
  }

  public broadcastToRole(role: string, event: string, data: any): void {
    this.io.to(`role:${role}`).emit(event, data);
  }

  public broadcastToPanel(panelId: string, event: string, data: any): void {
    this.io.to(`panel:${panelId}`).emit(event, data);
  }

  public getServer(): SocketIOServer {
    return this.io;
  }
}