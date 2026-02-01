// packages/security/src/types/index.ts

export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    issuer: string;
    audience: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    saltLength: number;
    iterations: number;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
    optionsSuccessStatus: number;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
}

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  panelId?: string;
  permissions: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface SecurityContext {
  user?: UserPayload;
  ip: string;
  userAgent: string;
  requestId: string;
  timestamp: number;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

export interface SecurityMetrics {
  timestamp: number;
  totalRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  suspiciousIps: string[];
  activeSessions: number;
  blockedRequests: number;
  avgResponseTime: number;
}

export interface EncryptionResult {
  data: string;
  iv: string;
  salt: string;
  tag: string;
}

export interface DecryptionResult {
  success: boolean;
  data?: string;
  error?: string;
}