// packages/security/src/middleware/security.ts

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { SecurityConfig, SecurityContext } from '../types';
import { AuthService } from '../auth';

export class SecurityMiddleware {
  private authService: AuthService;
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.authService = new AuthService(config.jwt);
  }

  /**
   * Apply comprehensive security headers
   */
  helmet() {
    const helmetConfig: any = {};

    if (this.config.helmet.contentSecurityPolicy) {
      helmetConfig.contentSecurityPolicy = {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "wss:", "https:"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
        },
      };
    }

    if (this.config.helmet.hsts) {
      helmetConfig.hsts = {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      };
    }

    return helmet(helmetConfig);
  }

  /**
   * CORS configuration
   */
  cors() {
    return cors({
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials,
      optionsSuccessStatus: this.config.cors.optionsSuccessStatus,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    });
  }

  /**
   * Add request ID and security context
   */
  requestContext() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string || this.generateRequestId();
      
      // Add to request headers for downstream services
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-ID', requestId);

      // Create security context
      const context: SecurityContext = {
        ip: this.getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        requestId,
        timestamp: Date.now(),
      };

      (req as any).securityContext = context;
      next();
    };
  }

  /**
   * JWT authentication middleware
   */
  authenticate() {
    return (req: Request, res: Response, next: NextFunction) => {
      const token = this.authService.extractTokenFromHeader(req.headers.authorization);
      
      if (!token) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_MISSING_TOKEN'
        });
      }

      const user = this.authService.verifyToken(token);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid or expired token',
          code: 'AUTH_INVALID_TOKEN'
        });
      }

      // Add user to security context
      const context = (req as any).securityContext as SecurityContext;
      context.user = user;

      next();
    };
  }

  /**
   * Role-based authorization
   */
  authorize(requiredRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const context = (req as any).securityContext as SecurityContext;
      
      if (!context.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasRole = requiredRoles.some(role => 
        this.authService.hasRole(context.user!, role)
      );

      if (!hasRole) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          required: requiredRoles
        });
      }

      next();
    };
  }

  /**
   * Permission-based authorization
   */
  requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const context = (req as any).securityContext as SecurityContext;
      
      if (!context.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!this.authService.hasPermission(context.user!, permission)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          required: permission
        });
      }

      next();
    };
  }

  /**
   * Optional authentication (guest allowed)
   */
  optionalAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
      const token = this.authService.extractTokenFromHeader(req.headers.authorization);
      
      if (token) {
        const user = this.authService.verifyToken(token);
        const context = (req as any).securityContext as SecurityContext;
        if (user) {
          context.user = user;
        }
      }

      next();
    };
  }

  /**
   * Validate session integrity
   */
  validateSession() {
    return (req: Request, res: Response, next: NextFunction) => {
      const context = (req as any).securityContext as SecurityContext;
      
      if (!context.user) {
        return next();
      }

      // Check session age (24 hours max)
      const sessionAge = Date.now() - (context.user.iat! * 1000);
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

      if (sessionAge > maxSessionAge) {
        return res.status(401).json({
          error: 'Session expired',
          code: 'AUTH_SESSION_EXPIRED'
        });
      }

      // Check for suspicious activity (IP change, etc.)
      // This would integrate with a session store
      if (this.isSuspiciousActivity(context)) {
        return res.status(403).json({
          error: 'Suspicious activity detected',
          code: 'AUTH_SUSPICIOUS_ACTIVITY'
        });
      }

      next();
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client IP address (including proxy headers)
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
      return realIp;
    }
    
    return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Detect suspicious activity patterns
   */
  private isSuspiciousActivity(context: SecurityContext): boolean {
    // Add logic to detect:
    // - IP changes during session
    // - User agent changes
    // - Impossible travel times
    // - Request patterns indicative of bots
    
    // For now, always return false
    // In production, integrate with fraud detection service
    return false;
  }
}