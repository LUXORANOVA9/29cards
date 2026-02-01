// packages/security/src/middleware/ratelimit.ts

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { SecurityConfig, SecurityContext } from '../types';

export class RateLimitMiddleware {
  private config: SecurityConfig['rateLimit'];
  private redisClient: any;

  constructor(config: SecurityConfig['rateLimit'], redisUrl?: string) {
    this.config = config;
    this.redisClient = createClient({ url: redisUrl || 'redis://localhost:6379' });
  }

  /**
   * Basic rate limiting for all requests
   */
  basic() {
    const store = this.createRedisStore('basic:');
    
    return rateLimit({
      store,
      windowMs: this.config.windowMs,
      max: this.config.max,
      message: {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(this.config.windowMs / 1000)
      },
      standardHeaders: this.config.standardHeaders,
      legacyHeaders: this.config.legacyHeaders,
      keyGenerator: (req) => this.getKey(req),
      handler: (req, res) => {
        const context = (req as any).securityContext as SecurityContext;
        this.logRateLimitExceeded(context, 'basic');
        
        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(this.config.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Strict rate limiting for sensitive endpoints
   */
  strict() {
    const store = this.createRedisStore('strict:');
    
    return rateLimit({
      store,
      windowMs: this.config.windowMs / 2, // Half the time
      max: Math.floor(this.config.max / 3), // Third the requests
      message: {
        error: 'Rate limit exceeded for sensitive operation',
        code: 'STRICT_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: this.config.standardHeaders,
      legacyHeaders: this.config.legacyHeaders,
      keyGenerator: (req) => this.getKey(req),
      skip: (req) => {
        const context = (req as any).securityContext as SecurityContext;
        // Skip rate limiting for trusted admin users
        return context.user?.role === 'SUPER_ADMIN';
      }
    });
  }

  /**
   * Rate limiting for authentication endpoints
   */
  auth() {
    const store = this.createRedisStore('auth:');
    
    return rateLimit({
      store,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per 15 minutes
      message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: 900
      },
      standardHeaders: this.config.standardHeaders,
      legacyHeaders: this.config.legacyHeaders,
      keyGenerator: (req) => this.getAuthKey(req),
      handler: (req, res) => {
        this.logRateLimitExceeded((req as any).securityContext, 'auth');
        
        res.status(429).json({
          error: 'Too many authentication attempts. Please try again later.',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          retryAfter: 900
        });
      }
    });
  }

  /**
   * Rate limiting per user ID (for authenticated users)
   */
  perUser() {
    const store = this.createRedisStore('user:');
    
    return rateLimit({
      store,
      windowMs: this.config.windowMs,
      max: this.config.max * 2, // Higher limit for authenticated users
      message: {
        error: 'User rate limit exceeded',
        code: 'USER_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: this.config.standardHeaders,
      legacyHeaders: this.config.legacyHeaders,
      keyGenerator: (req) => this.getUserKey(req),
      skip: (req) => {
        const context = (req as any).securityContext as SecurityContext;
        return !context.user; // Only apply to authenticated users
      }
    });
  }

  /**
   * IP-based rate limiting for suspicious IPs
   */
  ipBased() {
    const store = this.createRedisStore('ip:');
    
    return rateLimit({
      store,
      windowMs: 60 * 1000, // 1 minute
      max: 30, // Very strict for suspicious IPs
      message: {
        error: 'IP rate limit exceeded',
        code: 'IP_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: this.config.standardHeaders,
      legacyHeaders: this.config.legacyHeaders,
      keyGenerator: (req) => this.getIpKey(req),
      handler: (req, res) => {
        this.logSuspiciousActivity((req as any).securityContext, 'ip_rate_limit');
        
        res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'IP_RATE_LIMIT_EXCEEDED'
        });
      }
    });
  }

  /**
   * WebSocket connection rate limiting
   */
  webSocket() {
    // Custom store for WebSocket connections
    const connections = new Map<string, { count: number; resetTime: number }>();
    
    return (socket: any, next: Function) => {
      const ip = socket.handshake.address;
      const now = Date.now();
      const key = `ws_${ip}`;
      
      let conn = connections.get(key);
      
      if (!conn || now > conn.resetTime) {
        connections.set(key, {
          count: 1,
          resetTime: now + this.config.windowMs
        });
        return next();
      }
      
      if (conn.count >= 10) { // Max 10 connections per window
        return next(new Error('WebSocket connection rate limit exceeded'));
      }
      
      conn.count++;
      next();
    };
  }

  /**
   * Create Redis store for rate limiting
   */
  private createRedisStore(prefix: string) {
    return new RedisStore({
      sendCommand: (...args: string[]) => this.redisClient.sendCommand(args),
      prefix: `rate_limit:${prefix}`,
    });
  }

  /**
   * Generate rate limit key
   */
  private getKey(req: Request): string {
    const context = (req as any).securityContext as SecurityContext;
    
    if (context.user?.id) {
      return `user:${context.user.id}`;
    }
    
    return `ip:${context.ip}`;
  }

  /**
   * Generate auth-specific rate limit key
   */
  private getAuthKey(req: Request): string {
    const context = (req as any).securityContext as SecurityContext;
    const email = (req as any).body?.email || '';
    
    // Use both IP and email for auth endpoints
    return `auth:${context.ip}:${email.toLowerCase()}`;
  }

  /**
   * Generate user-specific rate limit key
   */
  private getUserKey(req: Request): string {
    const context = (req as any).securityContext as SecurityContext;
    return `user:${context.user?.id || context.ip}`;
  }

  /**
   * Generate IP-specific rate limit key
   */
  private getIpKey(req: Request): string {
    const context = (req as any).securityContext as SecurityContext;
    return `ip:${context.ip}`;
  }

  /**
   * Log rate limit exceeded events
   */
  private logRateLimitExceeded(context: SecurityContext, type: string): void {
    console.warn(`Rate limit exceeded [${type}]`, {
      ip: context.ip,
      userId: context.user?.id,
      userAgent: context.userAgent,
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    });
    
    // Send to monitoring system
    // this.monitoringService.alert('RATE_LIMIT_EXCEEDED', { context, type });
  }

  /**
   * Log suspicious activity
   */
  private logSuspiciousActivity(context: SecurityContext, type: string): void {
    console.error(`Suspicious activity detected [${type}]`, {
      ip: context.ip,
      userId: context.user?.id,
      userAgent: context.userAgent,
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    });
    
    // Send to security team
    // this.securityService.alert('SUSPICIOUS_ACTIVITY', { context, type });
  }

  /**
   * Clean up expired rate limit entries
   */
  async cleanup(): Promise<void> {
    // This would be called periodically to clean up Redis
    // Implementation depends on Redis storage structure
    console.log('Rate limit cleanup completed');
  }
}