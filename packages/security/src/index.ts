// packages/security/src/index.ts

export * from './types';
export * from './auth';
export * from './encryption';
export * from './middleware/security';
export * from './middleware/ratelimit';
export * from './audit';

// Factory function for easy setup
import { SecurityConfig } from './types';
import { SecurityMiddleware } from './middleware/security';
import { RateLimitMiddleware } from './middleware/ratelimit';
import { AuthService } from './auth';
import { EncryptionService } from './encryption';
import { AuditService } from './audit';

export class SecurityFactory {
  /**
   * Create complete security setup for Express app
   */
  static create(config: SecurityConfig) {
    const authService = new AuthService(config.jwt);
    const encryptionService = new EncryptionService(config.encryption);
    const auditService = new AuditService();
    const securityMiddleware = new SecurityMiddleware(config);
    const rateLimitMiddleware = new RateLimitMiddleware(config.rateLimit);

    return {
      authService,
      encryptionService,
      auditService,
      securityMiddleware,
      rateLimitMiddleware,
      
      // Middleware shortcuts
      helmet: securityMiddleware.helmet(),
      cors: securityMiddleware.cors(),
      requestContext: securityMiddleware.requestContext(),
      authenticate: securityMiddleware.authenticate(),
      authorize: securityMiddleware.authorize.bind(securityMiddleware),
      requirePermission: securityMiddleware.requirePermission.bind(securityMiddleware),
      optionalAuth: securityMiddleware.optionalAuth(),
      validateSession: securityMiddleware.validateSession(),
      
      // Rate limiting
      rateLimit: rateLimitMiddleware.basic(),
      strictRateLimit: rateLimitMiddleware.strict(),
      authRateLimit: rateLimitMiddleware.auth(),
      userRateLimit: rateLimitMiddleware.perUser(),
      ipRateLimit: rateLimitMiddleware.ipBased(),
      webSocketRateLimit: rateLimitMiddleware.webSocket()
    };
  }

  /**
   * Default production configuration
   */
  static defaultProductionConfig(): SecurityConfig {
    return {
      jwt: {
        secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
        issuer: '29cards-platform',
        audience: '29cards-users'
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: 'Too many requests',
        standardHeaders: true,
        legacyHeaders: false
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        saltLength: 32,
        iterations: 100000,
        secret: process.env.ENCRYPTION_KEY || 'CHANGE_ME_IN_PRODUCTION'
      },
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
        optionsSuccessStatus: 204
      },
      helmet: {
        contentSecurityPolicy: true,
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: true,
        dnsPrefetchControl: true,
        frameguard: true,
        hidePoweredBy: true,
        hsts: true,
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: true,
        referrerPolicy: true,
        xssFilter: true
      }
    };
  }

  /**
   * Development configuration (more permissive)
   */
  static developmentConfig(): SecurityConfig {
    const config = this.defaultProductionConfig();
    
    // More permissive rate limiting for development
    config.rateLimit.max = 1000;
    config.rateLimit.windowMs = 60 * 1000; // 1 minute
    
    // Allow all origins in development
    config.cors.origin = '*';
    
    // Disable some security features for easier debugging
    config.helmet.hsts = false;
    config.helmet.contentSecurityPolicy = false;
    
    return config;
  }
}