// packages/security/src/audit/index.ts

import { AuditLog, SecurityContext } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  private auditLogs: AuditLog[] = [];
  private maxLogs = 10000; // Rotate after 10k logs

  /**
   * Log security-relevant events
   */
  async log(
    context: SecurityContext,
    action: string,
    resource: string,
    resourceId?: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    oldValue?: any,
    newValue?: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: uuidv4(),
      userId: context.user?.id,
      action,
      resource,
      resourceId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
      timestamp: new Date(),
      severity,
      oldValue,
      newValue,
      metadata
    };

    // Add to memory (in production, write to database/external system)
    this.auditLogs.push(auditLog);
    
    // Keep only recent logs
    if (this.auditLogs.length > this.maxLogs) {
      this.auditLogs = this.auditLogs.slice(-this.maxLogs);
    }

    // Console logging for development
    console.log(`[AUDIT] ${severity}: ${action} on ${resource}`, {
      userId: context.user?.id,
      ip: context.ip,
      requestId: context.requestId,
      timestamp: auditLog.timestamp.toISOString(),
      metadata
    });

    // In production, send to centralized logging system
    await this.persistAuditLog(auditLog);
  }

  /**
   * Log authentication attempts
   */
  async logAuth(
    context: SecurityContext,
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'TOKEN_REFRESH',
    email?: string,
    reason?: string
  ): Promise<void> {
    await this.log(context, action, 'AUTH_SESSION', undefined, 
      action === 'LOGIN_SUCCESS' ? 'LOW' : 'MEDIUM',
      undefined,
      { email, reason }
    );
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    context: SecurityContext,
    resource: string,
    resourceId: string,
    action: 'READ' | 'WRITE' | 'DELETE' | 'EXPORT',
    recordCount?: number
  ): Promise<void> {
    await this.log(context, `DATA_${action}`, resource, resourceId, 'LOW',
      undefined,
      undefined,
      { recordCount, action }
    );
  }

  /**
   * Log financial transactions
   */
  async logFinancial(
    context: SecurityContext,
    action: string,
    amount: number,
    currency: string,
    fromWallet?: string,
    toWallet?: string,
    roundId?: string
  ): Promise<void> {
    await this.log(context, action, 'FINANCIAL_TRANSACTION', roundId, 'HIGH',
      undefined,
      { amount, currency, fromWallet, toWallet, roundId }
    );
  }

  /**
   * Log permission changes
   */
  async logPermissionChange(
    context: SecurityContext,
    targetUserId: string,
    oldPermissions: string[],
    newPermissions: string[],
    reason?: string
  ): Promise<void> {
    await this.log(context, 'PERMISSIONS_CHANGED', 'USER', targetUserId, 'HIGH',
      { permissions: oldPermissions },
      { permissions: newPermissions, reason }
    );
  }

  /**
   * Log security violations
   */
  async logSecurityViolation(
    context: SecurityContext,
    violation: string,
    severity: 'HIGH' | 'CRITICAL',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log(context, violation, 'SECURITY_VIOLATION', undefined, severity,
      undefined,
      details
    );

    // For critical violations, trigger immediate alerts
    if (severity === 'CRITICAL') {
      await this.triggerSecurityAlert(context, violation, details);
    }
  }

  /**
   * Log system changes
   */
  async logSystemChange(
    context: SecurityContext,
    component: string,
    change: string,
    oldValue?: any,
    newValue?: any
  ): Promise<void> {
    await this.log(context, 'SYSTEM_CHANGE', component, undefined, 'MEDIUM',
      oldValue,
      { newValue, change }
    );
  }

  /**
   * Search audit logs
   */
  async search(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    dateFrom?: Date;
    dateTo?: Date;
    severity?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    let filteredLogs = [...this.auditLogs];

    // Apply filters
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(filters.action!.toLowerCase())
      );
    }

    if (filters.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
    }

    if (filters.dateFrom) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.dateTo!);
    }

    if (filters.severity) {
      filteredLogs = filteredLogs.filter(log => filters.severity!.includes(log.severity));
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const total = filteredLogs.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total
    };
  }

  /**
   * Generate audit report
   */
  async generateReport(filters: {
    dateFrom: Date;
    dateTo: Date;
    groupBy?: 'day' | 'hour' | 'action' | 'user';
  }): Promise<any> {
    const { logs } = await this.search({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    });

    const report: any = {
      period: {
        from: filters.dateFrom,
        to: filters.dateTo
      },
      summary: {
        total: logs.length,
        critical: logs.filter(l => l.severity === 'CRITICAL').length,
        high: logs.filter(l => l.severity === 'HIGH').length,
        medium: logs.filter(l => l.severity === 'MEDIUM').length,
        low: logs.filter(l => l.severity === 'LOW').length
      }
    };

    if (filters.groupBy) {
      report.groups = this.groupLogs(logs, filters.groupBy);
    }

    return report;
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeWindow: 'hour' | 'day' | 'week' = 'day'): Promise<any> {
    const now = new Date();
    let timeFrom: Date;

    switch (timeWindow) {
      case 'hour':
        timeFrom = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'week':
        timeFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default: // day
        timeFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const { logs } = await this.search({
      dateFrom: timeFrom,
      dateTo: now
    });

    const uniqueIps = new Set(logs.map(log => log.ipAddress));
    const failedLogins = logs.filter(log => log.action === 'LOGIN_FAILED').length;
    const suspiciousActivity = logs.filter(log => log.severity === 'HIGH' || log.severity === 'CRITICAL').length;

    return {
      timeWindow,
      totalEvents: logs.length,
      uniqueIps: uniqueIps.size,
      failedLogins,
      suspiciousActivity,
      criticalEvents: logs.filter(log => log.severity === 'CRITICAL').length
    };
  }

  /**
   * Group logs by specified criteria
   */
  private groupLogs(logs: AuditLog[], groupBy: string): any[] {
    const groups = new Map<string, AuditLog[]>();

    logs.forEach(log => {
      let key: string;
      
      switch (groupBy) {
        case 'day':
          key = log.timestamp.toISOString().split('T')[0];
          break;
        case 'hour':
          key = log.timestamp.toISOString().slice(0, 13) + ':00';
          break;
        case 'action':
          key = log.action;
          break;
        case 'user':
          key = log.userId || 'anonymous';
          break;
        default:
          key = 'unknown';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(log);
    });

    return Array.from(groups.entries()).map(([key, groupLogs]) => ({
      key,
      count: groupLogs.length,
      severity: {
        critical: groupLogs.filter(l => l.severity === 'CRITICAL').length,
        high: groupLogs.filter(l => l.severity === 'HIGH').length,
        medium: groupLogs.filter(l => l.severity === 'MEDIUM').length,
        low: groupLogs.filter(l => l.severity === 'LOW').length
      }
    }));
  }

  /**
   * Persist audit log to external system
   */
  private async persistAuditLog(auditLog: AuditLog): Promise<void> {
    // In production, this would:
    // 1. Write to database table
    // 2. Send to log aggregation service (ELK, Splunk, etc.)
    // 3. Send to SIEM system
    // 4. Store in immutable storage for compliance
    
    // For now, just log to console
    console.log('AUDIT LOG PERSISTED:', auditLog.id);
  }

  /**
   * Trigger security alert
   */
  private async triggerSecurityAlert(
    context: SecurityContext, 
    violation: string, 
    details?: Record<string, any>
  ): Promise<void> {
    const alert = {
      id: uuidv4(),
      type: 'SECURITY_VIOLATION',
      violation,
      severity: 'CRITICAL',
      context: {
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
        userId: context.user?.id
      },
      details,
      timestamp: new Date(),
      requiresAction: true
    };

    console.error('CRITICAL SECURITY ALERT:', alert);
    
    // In production, this would:
    // 1. Send to security team
    // 2. Create incident ticket
    // 3. Block IP if necessary
    // 4. Notify compliance team
  }
}