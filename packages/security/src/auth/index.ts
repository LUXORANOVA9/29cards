// packages/security/src/auth/index.ts

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UserPayload, SecurityConfig } from '../types';

export class AuthService {
  private config: SecurityConfig['jwt'];

  constructor(config: SecurityConfig['jwt']) {
    this.config = config;
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(payload: Omit<UserPayload, 'iat' | 'exp'>): string {
    const tokenPayload: UserPayload = {
      ...payload,
      sessionId: uuidv4(),
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(tokenPayload, this.config.secret, {
      expiresIn: this.config.expiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience,
      algorithm: 'HS256',
      keyid: 'access-key-v1'
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(payload: Omit<UserPayload, 'iat' | 'exp'>): string {
    const tokenPayload = {
      id: payload.id,
      type: 'refresh',
      sessionId: uuidv4(),
    };

    return jwt.sign(tokenPayload, this.config.secret, {
      expiresIn: this.config.refreshExpiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience,
      algorithm: 'HS256',
      keyid: 'refresh-key-v1'
    });
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): UserPayload | null {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['HS256'],
      }) as UserPayload;

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): { accessToken?: string; error?: string } {
    try {
      const decoded = jwt.verify(refreshToken, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['HS256'],
      }) as any;

      if (decoded.type !== 'refresh') {
        return { error: 'Invalid refresh token' };
      }

      // Get user from database (would be injected)
      // For now, create minimal payload
      const payload: Omit<UserPayload, 'iat' | 'exp'> = {
        id: decoded.id,
        email: '', // Would fetch from DB
        role: '', // Would fetch from DB
        permissions: [],
      };

      return {
        accessToken: this.generateAccessToken(payload)
      };
    } catch (error) {
      return { error: 'Invalid refresh token' };
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Check if user has required permission
   */
  hasPermission(user: UserPayload, permission: string): boolean {
    return user.permissions.includes(permission) || 
           user.permissions.includes('*') || 
           user.role === 'SUPER_ADMIN';
  }

  /**
   * Check if user has required role
   */
  hasRole(user: UserPayload, role: string): boolean {
    return user.role === role || user.role === 'SUPER_ADMIN';
  }

  /**
   * Generate session ID for tracking
   */
  generateSessionId(): string {
    return uuidv4();
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
}