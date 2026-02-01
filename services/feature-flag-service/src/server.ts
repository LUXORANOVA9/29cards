// src/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'redis';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import { FeatureFlagService } from './services/FeatureFlagService';
import { FeatureFlagController } from './controllers/FeatureFlagController';
import { AnalyticsController } from './controllers/AnalyticsController';
import { FeatureFlagSocket } from './websocket/FeatureFlagSocket';
import { authenticateToken, requireRole } from './middleware/auth';

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize clients
const prisma = new PrismaClient();
const redis = new Redis({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

// Initialize services
const featureFlagService = new FeatureFlagService(prisma, redis);
const featureFlagController = new FeatureFlagController(featureFlagService);
const analyticsController = new AnalyticsController(prisma);

// Initialize WebSocket
const featureFlagSocket = new FeatureFlagSocket(server, featureFlagService);

// Make io available to controllers
app.set('io', featureFlagSocket.getServer());

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Flag evaluation rate limiting (more restrictive)
const evaluationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 evaluations per minute
  message: 'Too many flag evaluations, please try again later'
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'feature-flag-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.get('/api/v1/flags', authenticateToken, (req, res) => featureFlagController.getFlags(req as any, res as any));
app.get('/api/v1/flags/:key', authenticateToken, (req, res) => featureFlagController.getFlag(req as any, res as any));
app.post('/api/v1/flags', authenticateToken, requireRole(['ADMIN', 'PANEL_ADMIN']), (req, res) => 
  featureFlagController.createFlag(req as any, res as any));
app.put('/api/v1/flags/:key', authenticateToken, requireRole(['ADMIN', 'PANEL_ADMIN']), (req, res) => 
  featureFlagController.updateFlag(req as any, res as any));
app.delete('/api/v1/flags/:key', authenticateToken, requireRole(['ADMIN']), (req, res) => 
  featureFlagController.deleteFlag(req as any, res as any));

// Evaluation endpoints
app.post('/api/v1/evaluate/:key', authenticateToken, evaluationLimiter, (req, res) => 
  featureFlagController.evaluateFlag(req as any, res as any));
app.post('/api/v1/evaluate', authenticateToken, evaluationLimiter, (req, res) => 
  featureFlagController.evaluateMultipleFlags(req as any, res as any));

// Analytics endpoints
app.post('/api/v1/analytics/events', authenticateToken, (req, res) => 
  analyticsController.trackEvent(req as any, res as any));
app.get('/api/v1/analytics/flags/:featureKey', authenticateToken, requireRole(['ADMIN', 'PANEL_ADMIN']), (req, res) => 
  analyticsController.getFlagAnalytics(req as any, res as any));
app.get('/api/v1/analytics/users/:userId', authenticateToken, (req, res) => 
  analyticsController.getUserEvaluations(req as any, res as any));
app.get('/api/v1/analytics/ab-tests/:featureKey', authenticateToken, requireRole(['ADMIN', 'PANEL_ADMIN']), (req, res) => 
  analyticsController.getAbTestResults(req as any, res as any));

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  console.log(`Feature Flag Service running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});

export default app;