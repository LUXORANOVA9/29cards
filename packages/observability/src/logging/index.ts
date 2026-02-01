// packages/observability/src/logging/index.ts

import winston from 'winston';
import { LoggingConfig } from '../types';

export class LoggingService {
  private logger: winston.Logger;
  private config: LoggingConfig;

  constructor(config: LoggingConfig) {
    this.config = config;
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger with multiple outputs
   */
  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.outputs.includes('console')) {
      transports.push(
        new winston.transports.Console({
          format: this.config.format === 'json' 
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                  return `${timestamp} [${level}]: ${message} ${metaStr}`;
                })
              )
        })
      );
    }

    // File transport
    if (this.config.outputs.includes('file') && this.config.filePath) {
      transports.push(
        new winston.transports.File({
          filename: this.config.filePath,
          format: this.config.format === 'json' 
            ? winston.format.json()
            : winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                  return `${timestamp} [${level}]: ${message} ${metaStr}`;
                })
              ),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
        })
      );
    }

    // Elasticsearch transport
    if (this.config.outputs.includes('elasticsearch') && this.config.elasticsearchUrl) {
      try {
        const { ElasticsearchTransport } = require('winston-elasticsearch');
        transports.push(
          new ElasticsearchTransport({
            level: this.config.level,
            clientOpts: {
              node: this.config.elasticsearchUrl
            },
            index: '29cards-logs',
            format: winston.format.json()
          })
        );
      } catch (error) {
        console.warn('Elasticsearch transport not available:', error);
      }
    }

    // Loki transport
    if (this.config.outputs.includes('loki') && this.config.lokiUrl) {
      try {
        const { LokiTransport } = require('winston-loki');
        transports.push(
          new LokiTransport({
            host: this.config.lokiUrl,
            format: winston.format.json(),
            labels: {
              service: '29cards',
              environment: process.env.NODE_ENV || 'development'
            },
            json: true
          })
        );
      } catch (error) {
        console.warn('Loki transport not available:', error);
      }
    }

    return winston.createLogger({
      level: this.config.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: '29cards',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0'
      },
      transports,
      // Handle uncaught exceptions
      exceptionHandlers: [
        new winston.transports.Console(),
        ...(this.config.outputs.includes('file') && this.config.filePath
          ? [new winston.transports.File({ filename: this.config.filePath.replace('.log', '-exceptions.log') })]
          : [])
      ],
      rejectionHandlers: [
        new winston.transports.Console(),
        ...(this.config.outputs.includes('file') && this.config.filePath
          ? [new winston.transports.File({ filename: this.config.filePath.replace('.log', '-rejections.log') })]
          : [])
      ]
    });
  }

  /**
   * Log info message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log structured event with context
   */
  logEvent(event: {
    type: string;
    message: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    metadata?: any;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): void {
    const logEntry = {
      event_type: event.type,
      message: event.message,
      user_id: event.userId,
      session_id: event.sessionId,
      request_id: event.requestId,
      ip_address: event.ip,
      user_agent: event.userAgent,
      severity: event.severity || 'medium',
      timestamp: new Date().toISOString(),
      ...event.metadata
    };

    this.logger.info('Event', logEntry);
  }

  /**
   * Log HTTP request/response
   */
  logHttpRequest(req: {
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    userAgent?: string;
    ip?: string;
    userId?: string;
    requestId?: string;
    error?: string;
  }): void {
    const logEntry = {
      type: 'http_request',
      method: req.method,
      url: req.url,
      status_code: req.statusCode,
      response_time_ms: req.responseTime,
      user_agent: req.userAgent,
      ip_address: req.ip,
      user_id: req.userId,
      request_id: req.requestId,
      error: req.error,
      timestamp: new Date().toISOString()
    };

    if (req.statusCode >= 400) {
      this.logger.error('HTTP Request Error', logEntry);
    } else {
      this.logger.info('HTTP Request', logEntry);
    }
  }

  /**
   * Log WebSocket events
   */
  logWebSocketEvent(event: {
    type: string;
    connectionId?: string;
    userId?: string;
    tableId?: string;
    message?: any;
    error?: string;
    metadata?: any;
  }): void {
    const logEntry = {
      type: 'websocket_event',
      event_type: event.type,
      connection_id: event.connectionId,
      user_id: event.userId,
      table_id: event.tableId,
      message: event.message,
      error: event.error,
      timestamp: new Date().toISOString(),
      ...event.metadata
    };

    if (event.error) {
      this.logger.error('WebSocket Event Error', logEntry);
    } else {
      this.logger.info('WebSocket Event', logEntry);
    }
  }

  /**
   * Log database operations
   */
  logDatabaseOperation(operation: {
    type: 'query' | 'insert' | 'update' | 'delete';
    table: string;
    duration?: number;
    rowCount?: number;
    error?: string;
    metadata?: any;
  }): void {
    const logEntry = {
      type: 'database_operation',
      operation_type: operation.type,
      table: operation.table,
      duration_ms: operation.duration,
      row_count: operation.rowCount,
      error: operation.error,
      timestamp: new Date().toISOString(),
      ...operation.metadata
    };

    if (operation.error) {
      this.logger.error('Database Operation Error', logEntry);
    } else {
      this.logger.debug('Database Operation', logEntry);
    }
  }

  /**
   * Log authentication events
   */
  logAuthEvent(event: {
    type: 'login' | 'logout' | 'register' | 'password_reset' | 'token_refresh';
    result: 'success' | 'failure';
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    reason?: string;
    metadata?: any;
  }): void {
    const logEntry = {
      type: 'auth_event',
      auth_type: event.type,
      result: event.result,
      user_id: event.userId,
      email: event.email,
      ip_address: event.ip,
      user_agent: event.userAgent,
      reason: event.reason,
      timestamp: new Date().toISOString(),
      ...event.metadata
    };

    if (event.result === 'failure') {
      this.logger.warn('Authentication Event Failed', logEntry);
    } else {
      this.logger.info('Authentication Event', logEntry);
    }
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    ip?: string;
    userAgent?: string;
    description: string;
    metadata?: any;
  }): void {
    const logEntry = {
      type: 'security_event',
      event_type: event.type,
      severity: event.severity,
      user_id: event.userId,
      ip_address: event.ip,
      user_agent: event.userAgent,
      description: event.description,
      timestamp: new Date().toISOString(),
      ...event.metadata
    };

    if (event.severity === 'critical' || event.severity === 'high') {
      this.logger.error('Security Event Alert', logEntry);
    } else if (event.severity === 'medium') {
      this.logger.warn('Security Event Warning', logEntry);
    } else {
      this.logger.info('Security Event Info', logEntry);
    }
  }

  /**
   * Create child logger with additional context
   */
  child(defaultMeta: any): LoggingService {
    const childLogger = new LoggingService(this.config);
    childLogger.logger = this.logger.child(defaultMeta);
    return childLogger;
  }

  /**
   * Get middleware for Express
   */
  getMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      // Add logging method to request
      req.log = this.info.bind(this);
      
      // Log request
      this.info('Request started', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Capture response
      const originalEnd = res.end;
      res.end = function(chunk?: any) {
        const duration = Date.now() - startTime;
        
        // Log response
        this.logHttpRequest({
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime: duration,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          userId: req.securityContext?.user?.id,
          requestId: req.securityContext?.requestId
        });
        
        originalEnd.call(this, chunk);
      }.bind(this);
      
      next();
    }.bind(this);
  };
}