// services/api-gateway/src/server.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import winston from 'winston';
import client from 'prom-client';
import morgan from 'morgan';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

const app = express();

// Metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health Check
app.get('/health', (req, res) => res.json({ status: 'Gateway OK' }));

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Auth Service Proxy
app.use('/api/v1/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  changeOrigin: true,
}));

// Game Service Proxy (REST endpoints if any)
app.use('/api/v1/game', createProxyMiddleware({
  target: process.env.GAME_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: true,
}));

// Wallet Service Proxy
app.use('/api/v1/wallet', createProxyMiddleware({
  target: process.env.WALLET_SERVICE_URL || 'http://localhost:3003',
  changeOrigin: true,
}));

// Admin Service Proxy
app.use('/api/v1/admin', createProxyMiddleware({
  target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3004',
  changeOrigin: true,
}));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});
