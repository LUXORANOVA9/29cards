// packages/observability/src/index.ts

export * from './types';
export * from './metrics';
export * from './logging';
export * from './health';
export * from './circuitbreaker';

// Factory function for easy setup
import { ObservabilityConfig } from './types';
import { MetricsService } from './metrics';
import { LoggingService } from './logging';
import { HealthService } from './health';
import { CircuitBreaker } from './circuitbreaker';

export class ObservabilityFactory {
  /**
   * Create complete observability setup
   */
  static create(config: ObservabilityConfig) {
    const metricsService = new MetricsService(config.metrics);
    const loggingService = new LoggingService(config.logging);
    const healthService = new HealthService(
      config.healthChecks.interval,
      config.healthChecks.timeout
    );
    const circuitBreakers = CircuitBreaker.createManager(config.circuitBreakers);

    return {
      metrics: metricsService,
      logger: loggingService,
      health: healthService,
      circuitBreakers,
      
      // Middleware shortcuts
      metricsMiddleware: metricsService.getMiddleware(),
      loggingMiddleware: loggingService.getMiddleware(),
      healthMiddleware: healthService.getMiddleware(),
      circuitBreakerMiddleware: (serviceName: string) => 
        CircuitBreaker.createManager(config.circuitBreakers).getMiddleware(serviceName)
    };
  }

  /**
   * Default production configuration
   */
  static defaultProductionConfig(): ObservabilityConfig {
    return {
      service: {
        name: '29cards-platform',
        version: '1.0.0',
        environment: 'production'
      },
      metrics: {
        enabled: true,
        port: 9090,
        endpoint: '/metrics',
        labels: {
          service: '29cards',
          environment: 'production'
        }
      },
      logging: {
        level: 'info',
        format: 'json',
        outputs: ['console', 'elasticsearch'],
        elasticsearchUrl: process.env.ELASTICSEARCH_URL,
        filePath: '/var/log/29cards/app.log'
      },
      tracing: {
        enabled: true,
        serviceName: '29cards-platform',
        serviceVersion: '1.0.0',
        jaegerEndpoint: process.env.JAEGER_ENDPOINT,
        samplingRate: 0.1, // 10% sampling
        environment: 'production'
      },
      healthChecks: {
        enabled: true,
        endpoint: '/health',
        interval: 30000 // 30 seconds
      },
      circuitBreakers: {
        database: CircuitBreaker.DefaultConfigs.database,
        redis: CircuitBreaker.DefaultConfigs.redis,
        externalAPI: CircuitBreaker.DefaultConfigs.externalAPI,
        paymentGateway: CircuitBreaker.DefaultConfigs.paymentGateway
      },
      alerts: {
        enabled: true,
        webhookUrl: process.env.ALERT_WEBHOOK_URL,
        emailRecipients: process.env.ALERT_EMAILS?.split(','),
        slackChannel: process.env.SLACK_ALERT_CHANNEL,
        escalationRules: [
          {
            severity: 'critical',
            threshold: 1,
            timeWindow: 300000, // 5 minutes
            actions: ['email', 'slack']
          },
          {
            severity: 'high',
            threshold: 3,
            timeWindow: 600000, // 10 minutes
            actions: ['email']
          }
        ]
      }
    };
  }

  /**
   * Development configuration
   */
  static developmentConfig(): ObservabilityConfig {
    const config = this.defaultProductionConfig();
    
    // Adjust for development
    config.service.environment = 'development';
    config.metrics.labels.environment = 'development';
    config.logging.level = 'debug';
    config.logging.outputs = ['console', 'file'];
    config.tracing.samplingRate = 1.0; // 100% sampling in dev
    config.healthChecks.interval = 10000; // 10 seconds
    
    return config;
  }
}