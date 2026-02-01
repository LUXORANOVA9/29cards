// packages/observability/src/health/index.ts

import { HealthCheck } from '../types';

export class HealthService {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  private interval: number;
  private timeout: number;

  constructor(interval: number = 30000, timeout: number = 5000) {
    this.interval = interval;
    this.timeout = timeout;
  }

  /**
   * Register a health check
   */
  register(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.checks.set(name, checkFn);
  }

  /**
   * Remove a health check
   */
  unregister(name: string): void {
    this.checks.delete(name);
  }

  /**
   * Run all health checks
   */
  async checkAll(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: Date;
    checks: HealthCheck[];
    uptime: number;
    version: string;
  }> {
    const results = await Promise.allSettled(
      Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
        try {
          const startTime = Date.now();
          const result = await Promise.race([
            checkFn(),
            new Promise<HealthCheck>((_, reject) => 
              setTimeout(() => reject(new Error('Health check timeout')), this.timeout)
            )
          ]);
          
          return {
            name,
            status: result.status,
            lastCheck: new Date(),
            responseTime: Date.now() - startTime,
            error: result.error,
            metadata: result.metadata
          };
        } catch (error) {
          return {
            name,
            status: 'unhealthy',
            lastCheck: new Date(),
            error: (error as Error).message
          };
        }
      })
    );

    const checks: HealthCheck[] = results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        name: result.reason?.name || 'unknown',
        status: 'unhealthy',
        lastCheck: new Date(),
        error: result.reason?.message || 'Unknown error'
      }
    );

    const overallStatus = this.calculateOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks,
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0'
    };
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallStatus(checks: HealthCheck[]): 'healthy' | 'unhealthy' | 'degraded' {
    if (checks.length === 0) return 'healthy';

    const healthy = checks.filter(c => c.status === 'healthy').length;
    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
    const total = checks.length;

    // If any check is unhealthy, overall status is unhealthy
    if (unhealthy > 0) return 'unhealthy';

    // If less than 80% are healthy, status is degraded
    if (healthy / total < 0.8) return 'degraded';

    return 'healthy';
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(): void {
    setInterval(async () => {
      try {
        const result = await this.checkAll();
        console.log('Health check result:', result.status);
        
        // Send to monitoring system
        if (result.status !== 'healthy') {
          console.error('Health check failed:', result.checks.filter(c => c.status !== 'healthy'));
        }
      } catch (error) {
        console.error('Health check error:', error);
      }
    }, this.interval);
  }

  /**
   * Create Express middleware for health endpoint
   */
  getMiddleware() {
    return async (req: any, res: any, next: any) => {
      if (req.path !== '/health') {
        return next();
      }

      try {
        const result = await this.checkAll();
        
        const statusCode = result.status === 'healthy' ? 200 : 
                         result.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(result);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date(),
          error: 'Health check failed',
          checks: []
        });
      }
    };
  }

  /**
   * Predefined health checks
   */
  static Checks = {
    /**
     * Database health check
     */
    database: (prisma: any): () => Promise<HealthCheck> => 
      async (): Promise<HealthCheck> => {
        try {
          const startTime = Date.now();
          await prisma.$queryRaw`SELECT 1`;
          const responseTime = Date.now() - startTime;
          
          return {
            name: 'database',
            status: 'healthy',
            lastCheck: new Date(),
            responseTime,
            metadata: {
              connectionPool: await prisma.$queryRaw`SHOW STATUS LIKE 'Threads_connected'`
            }
          };
        } catch (error) {
          return {
            name: 'database',
            status: 'unhealthy',
            lastCheck: new Date(),
            error: (error as Error).message
          };
        }
      },

    /**
     * Redis health check
     */
    redis: (redisClient: any): () => Promise<HealthCheck> =>
      async (): Promise<HealthCheck> => {
        try {
          const startTime = Date.now();
          await redisClient.ping();
          const responseTime = Date.now() - startTime;
          
          return {
            name: 'redis',
            status: 'healthy',
            lastCheck: new Date(),
            responseTime,
            metadata: {
              info: await redisClient.info('memory')
            }
          };
        } catch (error) {
          return {
            name: 'redis',
            status: 'unhealthy',
            lastCheck: new Date(),
            error: (error as Error).message
          };
        }
      },

    /**
     * External API health check
     */
    externalAPI: (url: string, serviceName: string): () => Promise<HealthCheck> =>
      async (): Promise<HealthCheck> => {
        try {
          const startTime = Date.now();
          const response = await fetch(`${url}/health`, {
            method: 'GET',
            timeout: 5000
          });
          const responseTime = Date.now() - startTime;
          
          return {
            name: serviceName,
            status: response.ok ? 'healthy' : 'unhealthy',
            lastCheck: new Date(),
            responseTime,
            metadata: {
              statusCode: response.status,
              url: `${url}/health`
            }
          };
        } catch (error) {
          return {
            name: serviceName,
            status: 'unhealthy',
            lastCheck: new Date(),
            error: (error as Error).message
          };
        }
      },

    /**
     * File system health check
     */
    filesystem: (path: string): () => Promise<HealthCheck> =>
      async (): Promise<HealthCheck> => {
        try {
          const startTime = Date.now();
          const fs = require('fs').promises;
          await fs.access(path, fs.constants.W_OK);
          const responseTime = Date.now() - startTime;
          
          // Get disk usage
          const stats = await fs.statfs(path);
          const free = stats.bavail * stats.bsize;
          const total = stats.blocks * stats.bsize;
          const used = total - free;
          const usagePercent = (used / total) * 100;
          
          return {
            name: 'filesystem',
            status: usagePercent > 90 ? 'degraded' : 'healthy',
            lastCheck: new Date(),
            responseTime,
            metadata: {
              path,
              usagePercent: Math.round(usagePercent * 100) / 100,
              freeBytes: free,
              totalBytes: total
            }
          };
        } catch (error) {
          return {
            name: 'filesystem',
            status: 'unhealthy',
            lastCheck: new Date(),
            error: (error as Error).message
          };
        }
      },

    /**
     * Memory usage health check
     */
    memory: (thresholdPercent: number = 85): () => Promise<HealthCheck> =>
      async (): Promise<HealthCheck> => {
        try {
          const startTime = Date.now();
          const memUsage = process.memoryUsage();
          const totalMemory = require('os').totalmem();
          const usedMemory = memUsage.heapUsed;
          const usagePercent = (usedMemory / totalMemory) * 100;
          
          return {
            name: 'memory',
            status: usagePercent > thresholdPercent ? 'degraded' : 'healthy',
            lastCheck: new Date(),
            responseTime: Date.now() - startTime,
            metadata: {
              usagePercent: Math.round(usagePercent * 100) / 100,
              heapUsed: memUsage.heapUsed,
              heapTotal: memUsage.heapTotal,
              external: memUsage.external,
              rss: memUsage.rss,
              thresholdPercent
            }
          };
        } catch (error) {
          return {
            name: 'memory',
            status: 'unhealthy',
            lastCheck: new Date(),
            error: (error as Error).message
          };
        }
      },

    /**
     * Custom check for game state
     */
    gameState: (gameServiceUrl: string): () => Promise<HealthCheck> =>
      async (): Promise<HealthCheck> => {
        try {
          const startTime = Date.now();
          const response = await fetch(`${gameServiceUrl}/health/game-state`, {
            method: 'GET',
            timeout: 3000
          });
          const responseTime = Date.now() - startTime;
          
          const data = response.ok ? await response.json() : null;
          const activeGames = data?.activeGames || 0;
          
          return {
            name: 'game-state',
            status: response.ok ? 'healthy' : 'unhealthy',
            lastCheck: new Date(),
            responseTime,
            metadata: {
              activeGames,
              avgGameStateSize: data?.avgGameStateSize || 0
            }
          };
        } catch (error) {
          return {
            name: 'game-state',
            status: 'unhealthy',
            lastCheck: new Date(),
            error: (error as Error).message
          };
        }
      }
  };
}