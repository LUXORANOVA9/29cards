// services/game-service/src/server.ts

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import helmet from 'helmet';
import cors from 'cors';
import { GameSocket } from './socket/GameSocket';
import { connectRedis } from './redis';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Redis Client for Pub/Sub
const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, set to specific domains
    methods: ['GET', 'POST'],
  },
  adapter: createAdapter(pubClient, subClient),
});

// Initialize Socket Manager
const gameSocket = new GameSocket(io);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connections: io.engine.clientsCount });
});

const PORT = process.env.PORT || 3002;

Promise.all([
  pubClient.connect(), 
  subClient.connect(),
  connectRedis()
]).then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Game Service running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to Redis:', err);
});
