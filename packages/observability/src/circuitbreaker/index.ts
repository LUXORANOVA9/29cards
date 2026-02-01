// packages/observability/src/circuitbreaker/index.ts

import { CircuitBreakerConfig } from '../types';

export enum CircuitState {
  CLOSED = 'CLOSED',    // Normal operation
  OPEN = 'OPEN',        // Failing, rejecting calls
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
  totalRequests: number;
  failureRate: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime?: Date;
  private nextRetryTime?: Date;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, context?: any): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < (this.nextRetryTime?.getTime() || 0)) {
        throw new Error('Circuit breaker is OPEN');
      } else {
        // Transition to half-open
        this.state = CircuitState.HALF_OPEN;
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Circuit breaker timeout')), this.config.timeout)
        )
      ]);

      // Success
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Service recovered, close circuit
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      console.info('Circuit breaker CLOSED after successful test');
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    const errorType = this.getErrorType(error);
    
    // Check if failure is expected
    if (!this.config.expectedErrors.includes(errorType)) {
      if (this.state === CircuitState.HALF_OPEN) {
        // Still failing in half-open, reopen circuit
        this.state = CircuitState.OPEN;
        this.nextRetryTime = new Date(Date.now() + this.config.resetTimeout);
        console.warn('Circuit breaker REOPENED after half-open test failed');
      } else if (this.failureCount >= this.config.threshold) {
        // Too many failures, open circuit
        this.state = CircuitState.OPEN;
        this.nextRetryTime = new Date(Date.now() + this.config.resetTimeout);
        console.warn(`Circuit breaker OPENED after ${this.failureCount} failures`);
      }
    }
  }

  /**
   * Get current circuit state and statistics
   */
  getStats(): CircuitBreakerStats {
    const failureRate = this.totalRequests > 0 ? (this.failureCount / this.totalRequests) * 100 : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime,
      totalRequests: this.totalRequests,
      failureRate: Math.round(failureRate * 100) / 100
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    this.nextRetryTime = undefined;
    console.info('Circuit breaker manually reset to CLOSED');
  }

  /**
   * Force circuit to open state
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextRetryTime = new Date(Date.now() + this.config.resetTimeout);
    console.warn('Circuit breaker manually forced to OPEN');
  }

  /**
   * Check if circuit is allowing requests
   */
  isAvailable(): boolean {
    return this.state === CircuitState.CLOSED || 
           (this.state === CircuitState.HALF_OPEN && Date.now() >= (this.nextRetryTime?.getTime() || 0));
  }

  /**
   * Get error type string from error object
   */
  private getErrorType(error: Error): string {
    if (error.name) return error.name;
    if (error.constructor.name) return error.constructor.name;
    return error.message || 'Unknown';
  }

  /**
   * Create middleware for Express
   */
  getMiddleware(serviceName: string) {
    return (req: any, res: any, next: any) => {
      const circuitBreaker = new CircuitBreaker(this.config);
      
      // Store circuit breaker in request for reuse
      req.circuitBreakers = req.circuitBreakers || {};
      req.circuitBreakers[serviceName] = circuitBreaker;

      // Wrap the request handler
      const originalNext = next;
      next = async () => {
        try {
          await circuitBreaker.execute(() => {
            return new Promise<void>((resolve, reject) => {
              originalNext((error?: any) => {
                if (error) reject(error);
                else resolve();
              });
            });
          });
        } catch (error) {
          if (error.message === 'Circuit breaker is OPEN') {
            return res.status(503).json({
              error: 'Service temporarily unavailable',
              code: 'SERVICE_UNAVAILABLE',
              service: serviceName,
              circuitState: circuitBreaker.getStats()
            });
          } else {
            throw error;
          }
        }
      };

      next();
    };
  }

  /**
   * Factory for creating circuit breaker managers
   */
  static createManager(configs: Record<string, CircuitBreakerConfig>) {
    const manager = new Map<string, CircuitBreaker>();

    Object.entries(configs).forEach(([serviceName, config]) => {
      manager.set(serviceName, new CircuitBreaker(config));
    });

    return {
      get: (serviceName: string) => manager.get(serviceName),
      execute: async <T>(serviceName: string, fn: () => Promise<T>, context?: any) => {
        const circuitBreaker = manager.get(serviceName);
        if (!circuitBreaker) {
          throw new Error(`Circuit breaker for service '${serviceName}' not found`);
        }
        return circuitBreaker.execute(fn, context);
      },
      reset: (serviceName?: string) => {
        if (serviceName) {
          manager.get(serviceName)?.reset();
        } else {
          manager.forEach(cb => cb.reset());
        }
      },
      getAllStats: () => {
        const stats: Record<string, CircuitBreakerStats> = {};
        manager.forEach((circuitBreaker, name) => {
          stats[name] = circuitBreaker.getStats();
        });
        return stats;
      }
    };
  }

  /**
   * Default configurations for common scenarios
   */
  static DefaultConfigs = {
    /**
     * Database circuit breaker
     */
    database: {
      threshold: 5,
      timeout: 5000,
      resetTimeout: 60000,
      monitoringPeriod: 60000,
      expectedErrors: ['ConnectionTimeoutError', 'ConnectionLostError']
    },

    /**
     * External API circuit breaker
     */
    externalAPI: {
      threshold: 3,
      timeout: 10000,
      resetTimeout: 30000,
      monitoringPeriod: 60000,
      expectedErrors: ['ETIMEDOUT', 'ECONNREFUSED']
    },

    /**
     * Redis circuit breaker
     */
    redis: {
      threshold: 5,
      timeout: 2000,
      resetTimeout: 15000,
      monitoringPeriod: 60000,
      expectedErrors: ['RedisTimeoutError']
    },

    /**
     * Payment gateway circuit breaker
     */
    paymentGateway: {
      threshold: 2,
      timeout: 15000,
      resetTimeout: 120000,
      monitoringPeriod: 60000,
      expectedErrors: ['PaymentTimeoutError', 'InsufficientFundsError']
    }
  };
}