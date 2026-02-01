// packages/observability/src/metrics/index.ts

import client from 'prom-client';
import { register } from 'prom-client';
import { MetricsConfig, PerformanceMetrics, SystemMetrics, BusinessMetrics } from '../types';

export class MetricsService {
  private config: MetricsConfig;
  private metrics: Map<string, any> = new Map();

  constructor(config: MetricsConfig) {
    this.config = config;
    this.initializeMetrics();
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics(): void {
    // Clear existing metrics
    register.clear();

    // HTTP metrics
    this.metrics.set('http_requests_total', new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', ...Object.keys(this.config.labels)]
    }));

    this.metrics.set('http_request_duration_seconds', new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code', ...Object.keys(this.config.labels)],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
    }));

    // WebSocket metrics
    this.metrics.set('websocket_connections_total', new client.Gauge({
      name: 'websocket_connections_total',
      help: 'Total number of active WebSocket connections',
      labelNames: ['table_id', 'room_type', ...Object.keys(this.config.labels)]
    }));

    this.metrics.set('websocket_messages_total', new client.Counter({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['message_type', 'direction', ...Object.keys(this.config.labels)]
    }));

    // Business metrics
    this.metrics.set('active_games_total', new client.Gauge({
      name: 'active_games_total',
      help: 'Total number of active games',
      labelNames: ['room_type', 'panel_id', ...Object.keys(this.config.labels)]
    }));

    this.metrics.set('total_players_online', new client.Gauge({
      name: 'total_players_online',
      help: 'Total number of online players',
      labelNames: ['panel_id', ...Object.keys(this.config.labels)]
    }));

    this.metrics.set('bets_total', new client.Counter({
      name: 'bets_total',
      help: 'Total number of bets placed',
      labelNames: ['room_type', 'bet_type', 'panel_id', ...Object.keys(this.config.labels)]
    }));

    this.metrics.set('revenue_total', new client.Counter({
      name: 'revenue_total',
      help: 'Total revenue generated',
      labelNames: ['revenue_type', 'panel_id', ...Object.keys(this.config.labels)]
    }));

    // System metrics
    this.metrics.set('node_memory_usage_bytes', new client.Gauge({
      name: 'node_memory_usage_bytes',
      help: 'Node.js memory usage in bytes',
      labelNames: ['type', ...Object.keys(this.config.labels)]
    }));

    this.metrics.set('node_cpu_usage_percent', new client.Gauge({
      name: 'node_cpu_usage_percent',
      help: 'Node.js CPU usage percentage',
      labelNames: [...Object.keys(this.config.labels)]
    }));

    this.metrics.set('database_connections_active', new client.Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      labelNames: [...Object.keys(this.config.labels)]
    }));

    // Error metrics
    this.metrics.set('errors_total', new client.Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['error_type', 'severity', 'service', ...Object.keys(this.config.labels)]
    }));

    // Security metrics
    this.metrics.set('auth_attempts_total', new client.Counter({
      name: 'auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['result', 'auth_type', 'ip_address', ...Object.keys(this.config.labels)]
    }));

    this.metrics.set('security_events_total', new client.Counter({
      name: 'security_events_total',
      help: 'Total security events',
      labelNames: ['event_type', 'severity', 'ip_address', ...Object.keys(this.config.labels)]
    }));
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    customLabels?: Record<string, string>
  ): void {
    const labels = {
      method,
      route: this.sanitizeRoute(route),
      status_code: statusCode.toString(),
      ...this.config.labels,
      ...customLabels
    };

    this.metrics.get('http_requests_total')?.inc(labels);
    this.metrics.get('http_request_duration_seconds')?.observe(labels, duration / 1000);
  }

  /**
   * Record WebSocket connection metrics
   */
  recordWebSocketConnection(
    tableId?: string,
    roomType?: string,
    connected: boolean
  ): void {
    if (!connected) return;

    const labels = {
      table_id: tableId || 'unknown',
      room_type: roomType || 'unknown',
      ...this.config.labels
    };

    this.metrics.get('websocket_connections_total')?.inc(labels);
  }

  /**
   * Record WebSocket message metrics
   */
  recordWebSocketMessage(
    messageType: string,
    direction: 'in' | 'out',
    customLabels?: Record<string, string>
  ): void {
    const labels = {
      message_type: messageType,
      direction,
      ...this.config.labels,
      ...customLabels
    };

    this.metrics.get('websocket_messages_total')?.inc(labels);
  }

  /**
   * Record game metrics
   */
  recordGameMetrics(
    activeGames: number,
    roomType: string,
    panelId?: string
  ): void {
    const labels = {
      room_type: roomType,
      panel_id: panelId || 'unknown',
      ...this.config.labels
    };

    this.metrics.get('active_games_total')?.set(labels, activeGames);
  }

  /**
   * Record player metrics
   */
  recordPlayerMetrics(
    onlinePlayers: number,
    panelId?: string
  ): void {
    const labels = {
      panel_id: panelId || 'unknown',
      ...this.config.labels
    };

    this.metrics.get('total_players_online')?.set(labels, onlinePlayers);
  }

  /**
   * Record bet metrics
   */
  recordBet(
    betType: string,
    roomType: string,
    amount: number,
    panelId?: string
  ): void {
    const labels = {
      bet_type: betType,
      room_type: roomType,
      panel_id: panelId || 'unknown',
      ...this.config.labels
    };

    this.metrics.get('bets_total')?.inc(labels);
    
    // Also record as revenue (for house edge)
    this.metrics.get('revenue_total')?.inc({
      revenue_type: 'bet',
      ...labels
    }, amount);
  }

  /**
   * Record revenue metrics
   */
  recordRevenue(
    revenueType: string,
    amount: number,
    panelId?: string
  ): void {
    const labels = {
      revenue_type: revenueType,
      panel_id: panelId || 'unknown',
      ...this.config.labels
    };

    this.metrics.get('revenue_total')?.inc(labels, amount);
  }

  /**
   * Record error metrics
   */
  recordError(
    errorType: string,
    severity: string,
    service: string,
    customLabels?: Record<string, string>
  ): void {
    const labels = {
      error_type: errorType,
      severity,
      service,
      ...this.config.labels,
      ...customLabels
    };

    this.metrics.get('errors_total')?.inc(labels);
  }

  /**
   * Record authentication metrics
   */
  recordAuthAttempt(
    result: 'success' | 'failure',
    authType: string,
    ipAddress?: string,
    customLabels?: Record<string, string>
  ): void {
    const labels = {
      result,
      auth_type: authType,
      ip_address: ipAddress || 'unknown',
      ...this.config.labels,
      ...customLabels
    };

    this.metrics.get('auth_attempts_total')?.inc(labels);
  }

  /**
   * Record security events
   */
  recordSecurityEvent(
    eventType: string,
    severity: string,
    ipAddress?: string,
    customLabels?: Record<string, string>
  ): void {
    const labels = {
      event_type: eventType,
      severity,
      ip_address: ipAddress || 'unknown',
      ...this.config.labels,
      ...customLabels
    };

    this.metrics.get('security_events_total')?.inc(labels);
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(metrics: SystemMetrics): void {
    const labels = { ...this.config.labels };

    // Memory metrics
    this.metrics.get('node_memory_usage_bytes')?.set({ type: 'used', ...labels }, metrics.memoryUsed);
    this.metrics.get('node_memory_usage_bytes')?.set({ type: 'total', ...labels }, metrics.memoryTotal);

    // CPU metrics
    this.metrics.get('node_cpu_usage_percent')?.set(labels, metrics.cpuUsage);

    // Database connections
    this.metrics.get('database_connections_active')?.set(labels, metrics.databaseConnections);

    // Custom metrics for disk and network
    register.setGauge({
      name: 'disk_usage_percent',
      help: 'Disk usage percentage',
      labelNames: Object.keys(this.config.labels)
    }).set(labels, metrics.diskUsage);

    register.setGauge({
      name: 'network_io_bytes_total',
      help: 'Network I/O bytes',
      labelNames: ['direction', ...Object.keys(this.config.labels)]
    }).set({ direction: 'in', ...labels }, metrics.networkIO.bytesIn);
    register.setGauge({
      name: 'network_io_bytes_total',
      help: 'Network I/O bytes',
      labelNames: ['direction', ...Object.keys(this.config.labels)]
    }).set({ direction: 'out', ...labels }, metrics.networkIO.bytesOut);
  }

  /**
   * Get metrics for Prometheus
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get performance metrics snapshot
   */
  getPerformanceMetrics(): PerformanceMetrics {
    // This would aggregate recent metrics
    // For now, return placeholder data
    return {
      timestamp: Date.now(),
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      activeConnections: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  /**
   * Get business metrics snapshot
   */
  getBusinessMetrics(): BusinessMetrics {
    // This would aggregate business metrics
    return {
      timestamp: Date.now(),
      activeGames: 0,
      totalPlayers: 0,
      concurrentUsers: 0,
      totalBets: 0,
      totalRevenue: 0,
      avgSessionDuration: 0,
      playerRetentionRate: 0
    };
  }

  /**
   * Sanitize route for metrics (remove dynamic parts)
   */
  private sanitizeRoute(route: string): string {
    if (!route) return 'unknown';
    
    // Replace UUIDs and IDs with placeholders
    return route
      .replace(/\/[a-f0-9-]{8}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{12}/g, '/:uuid')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');
  }

  /**
   * Create a timer for measuring duration
   */
  startTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1000000; // Convert to milliseconds
    };
  }

  /**
   * Get middleware for Express
   */
  getMiddleware() {
    return (req: any, res: any, next: any) => {
      const timer = this.startTimer();
      
      // Record request count
      this.recordHttpRequest(req.method, req.route?.path || req.path, 'unknown', 0);
      
      // Capture response
      const originalEnd = res.end;
      res.end = function(chunk?: any) {
        const duration = timer();
        
        // Record final metrics
        this.recordHttpRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          duration,
          {
            user_id: req.securityContext?.user?.id,
            ip_address: req.securityContext?.ip
          }
        );
        
        originalEnd.call(this, chunk);
      }.bind(this);
      
      next();
    };
  }
}