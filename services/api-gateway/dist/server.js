"use strict";
// services/api-gateway/src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const winston_1 = __importDefault(require("winston"));
const prom_client_1 = __importDefault(require("prom-client"));
const morgan_1 = __importDefault(require("morgan"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.simple(),
        }),
    ],
});
const app = (0, express_1.default)();
// Metrics
const collectDefaultMetrics = prom_client_1.default.collectDefaultMetrics;
collectDefaultMetrics({ register: prom_client_1.default.register });
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('combined', { stream: { write: message => logger.info(message.trim()) } }));
// Health Check
app.get('/health', (req, res) => res.json({ status: 'Gateway OK' }));
// Metrics Endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prom_client_1.default.register.contentType);
    res.end(await prom_client_1.default.register.metrics());
});
// Auth Service Proxy
app.use('/api/v1/auth', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
}));
// Game Service Proxy (REST endpoints if any)
app.use('/api/v1/game', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: process.env.GAME_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
}));
// Wallet Service Proxy
app.use('/api/v1/wallet', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: process.env.WALLET_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
}));
// Admin Service Proxy
app.use('/api/v1/admin', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
}));
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
});
