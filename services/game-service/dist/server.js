"use strict";
// services/game-service/src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const GameSocket_1 = require("./socket/GameSocket");
const redis_2 = require("./redis");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Redis Client for Pub/Sub
const pubClient = (0, redis_1.createClient)({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const subClient = pubClient.duplicate();
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*', // In production, set to specific domains
        methods: ['GET', 'POST'],
    },
    adapter: (0, redis_adapter_1.createAdapter)(pubClient, subClient),
});
// Initialize Socket Manager
const gameSocket = new GameSocket_1.GameSocket(io);
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', connections: io.engine.clientsCount });
});
const PORT = process.env.PORT || 3002;
Promise.all([
    pubClient.connect(),
    subClient.connect(),
    (0, redis_2.connectRedis)()
]).then(() => {
    httpServer.listen(PORT, () => {
        console.log(`Game Service running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to connect to Redis:', err);
});
