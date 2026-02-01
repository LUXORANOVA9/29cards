// packages/security/src/encryption/index.ts

import crypto from 'crypto';
import { EncryptionConfig, EncryptionResult, DecryptionResult } from '../types';

export class EncryptionService {
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig) {
    this.config = config;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  encrypt(text: string): EncryptionResult {
    const salt = crypto.randomBytes(this.config.saltLength);
    const iv = crypto.randomBytes(this.config.ivLength);
    
    // Derive key using PBKDF2
    const key = crypto.pbkdf2Sync(
      this.config.secret,
      salt,
      this.config.iterations,
      this.config.keyLength,
      'sha256'
    );

    const cipher = crypto.createCipher(this.config.algorithm, key);
    cipher.setAAD(Buffer.from('29cards-v1')); // Additional authenticated data
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: EncryptionResult): DecryptionResult {
    try {
      const key = crypto.pbkdf2Sync(
        this.config.secret,
        Buffer.from(encryptedData.salt, 'hex'),
        this.config.iterations,
        this.config.keyLength,
        'sha256'
      );

      const decipher = crypto.createDecipher(this.config.algorithm, key);
      decipher.setAAD(Buffer.from('29cards-v1'));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return {
        success: true,
        data: decrypted
      };
    } catch (error) {
      return {
        success: false,
        error: `Decryption failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Hash passwords using bcrypt with salt rounds
   */
  async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(password, 12);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate cryptographically secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate SHA-256 hash for data integrity
   */
  generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify data integrity with hash
   */
  verifyHash(data: string, hash: string): boolean {
    return this.generateHash(data) === hash;
  }

  /**
   * Generate HMAC for API requests
   */
  generateHmac(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHmac(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHmac(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}