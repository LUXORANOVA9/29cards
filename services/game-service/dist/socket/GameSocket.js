"use strict";
// services/game-service/src/socket/GameSocket.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSocket = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const events_1 = require("./events");
const joinHandler_1 = require("./handlers/joinHandler");
const actionHandler_1 = require("./handlers/actionHandler");
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
class GameSocket {
    constructor(io) {
        this.io = io;
        this.initialize();
    }
    initialize() {
        // Middleware for Authentication
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: Token required'));
            }
            jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
                if (err)
                    return next(new Error('Authentication error: Invalid token'));
                socket.user = decoded;
                next();
            });
        });
        this.io.on('connection', (socket) => {
            const user = socket.user;
            console.log(`User connected: ${user.userId}`);
            // Join Table Handler
            socket.on(events_1.SocketEvents.JOIN_TABLE, (payload) => {
                (0, joinHandler_1.handleJoinTable)(this.io, socket, payload, user);
            });
            // Game Action Handler
            socket.on(events_1.SocketEvents.GAME_ACTION, (payload) => {
                (0, actionHandler_1.handleGameAction)(this.io, socket, payload, user);
            });
            // Start Game Handler
            socket.on(events_1.SocketEvents.START_GAME, (payload) => {
                Promise.resolve().then(() => __importStar(require('./handlers/actionHandler'))).then(({ handleStartGame }) => {
                    handleStartGame(this.io, socket, payload, user);
                });
            });
            // Chat Message
            socket.on(events_1.SocketEvents.CHAT_MESSAGE, (payload) => {
                // Broadcast to room
                if (payload.tableId) {
                    socket.to(payload.tableId).emit(events_1.SocketEvents.CHAT_MESSAGE, {
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
exports.GameSocket = GameSocket;
