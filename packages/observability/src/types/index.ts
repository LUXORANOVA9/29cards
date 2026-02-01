// packages/observability/src/types/index.ts

export interface MetricsConfig {
  enabled: boolean;
  port: number;
  endpoint: string;
  labels: Record<string, string>;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'text';
  outputs: ('console' | 'file' | 'elasticsearch' | 'loki')[];
  filePath?: string;
  elasticsearchUrl?: string;
  lokiUrl?: string;
}

export interface TracingConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  jaegerEndpoint?: string;
  samplingRate: number;
  environment: string;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedErrors: string[];
}

export interface AlertConfig {
  enabled: boolean;
  webhookUrl?: string;
  emailRecipients?: string[];
  slackChannel?: string;
  escalationRules: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    threshold: number;
    timeWindow: number;
    actions: ('email' | 'slack' | 'webhook')[];
  }[];
}

export interface PerformanceMetrics {
  timestamp: number;
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface BusinessMetrics {
  timestamp: number;
  activeGames: number;
  totalPlayers: number;
  concurrentUsers: number;
  totalBets: number;
  totalRevenue: number;
  avgSessionDuration: number;
  playerRetentionRate: number;
}

export interface SystemMetrics {
  timestamp: number;
  uptime: number;
  memoryUsed: number;
  memoryTotal: number;
  cpuUsage: number;
  diskUsage: number;
  networkIO: {
    bytesIn: number;
    bytesOut: number;
  };
  databaseConnections: number;
  redisConnections: number;
}

export interface AlertEvent {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  source: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface ObservabilityConfig {
  service: {
    name: string;
    version: string;
    environment: string;
  };
  metrics: MetricsConfig;
  logging: LoggingConfig;
  tracing: TracingConfig;
  healthChecks: {
    enabled: boolean;
    endpoint: string;
    interval: number;
  };
  circuitBreakers: Record<string, CircuitBreakerConfig>;
  alerts: AlertConfig;
}