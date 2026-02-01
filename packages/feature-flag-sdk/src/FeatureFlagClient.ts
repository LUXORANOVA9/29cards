// src/FeatureFlagClient.ts
import { io, Socket } from 'socket.io-client';
import { 
  User,
  FlagEvaluationContext, 
  FlagEvaluationResult,
  FlagConfig,
  FeatureFlagClientConfig,
  FlagUpdateEvent,
  FlagEventListener,
  AnalyticsEvent
} from './types';

export class FeatureFlagClient {
  private config: FeatureFlagClientConfig;
  private user: User | null = null;
  private socket: Socket | null = null;
  private flagCache: Map<string, FlagEvaluationResult> = new Map();
  private configCache: Map<string, FlagConfig> = new Map();
  private listeners: Map<string, FlagEventListener[]> = new Map();
  private pendingEvaluations: Map<string, Promise<FlagEvaluationResult>> = new Map();

  constructor(config: FeatureFlagClientConfig) {
    this.config = {
      timeout: 5000,
      cacheTimeout: 300000, // 5 minutes
      enableRealTime: true,
      environment: 'production',
      ...config
    };
  }

  async initialize(user: User): Promise<void> {
    this.user = { ...user, ...this.config.defaultAttributes };
    
    if (this.config.enableRealTime) {
      await this.connectWebSocket();
    }

    // Pre-warm cache with common flags
    await this.preloadFlags();
  }

  private async connectWebSocket(): Promise<void> {
    if (!this.user || !this.config.wsUrl) return;

    this.socket = io(this.config.wsUrl, {
      auth: {
        token: this.config.apiKey
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to Feature Flag Service');
      this.subscribeToFlagUpdates();
    });

    this.socket.on('flag_update', (event: FlagUpdateEvent) => {
      this.handleFlagUpdate(event);
    });

    this.socket.on('flag_created', (event: FlagUpdateEvent) => {
      this.handleFlagUpdate(event);
    });

    this.socket.on('flag_deleted', (event: FlagUpdateEvent) => {
      this.handleFlagDelete(event);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Feature Flag Service');
    });
  }

  private subscribeToFlagUpdates(): void {
    if (!this.socket) return;

    this.socket.emit('subscribe_flags', {
      environment: this.config.environment
    });
  }

  private handleFlagUpdate(event: FlagUpdateEvent): void {
    const { flag } = event.data;
    
    // Update config cache
    this.configCache.set(flag.key, flag);
    
    // Clear evaluation cache for this flag
    this.flagCache.delete(flag.key);
    
    // Notify listeners
    this.notifyListeners(event);
  }

  private handleFlagDelete(event: FlagUpdateEvent): void {
    const { flagKey } = event.data;
    
    // Remove from caches
    this.flagCache.delete(flagKey);
    this.configCache.delete(flagKey);
    
    // Notify listeners
    this.notifyListeners(event);
  }

  private notifyListeners(event: FlagUpdateEvent): void {
    const listeners = this.listeners.get('*') || [];
    const flagListeners = this.listeners.get(event.data.flag.key) || [];
    
    [...listeners, ...flagListeners].forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in flag update listener:', error);
      }
    });
  }

  async isEnabled(featureKey: string, context?: Partial<FlagEvaluationContext>): Promise<boolean> {
    const result = await this.evaluateFlag(featureKey, context);
    return result.enabled;
  }

  async getVariant(featureKey: string, context?: Partial<FlagEvaluationContext>): Promise<string | null> {
    const result = await this.evaluateFlag(featureKey, context);
    return result.variantKey || null;
  }

  async getPayload<T = any>(featureKey: string, context?: Partial<FlagEvaluationContext>): Promise<T | null> {
    const result = await this.evaluateFlag(featureKey, context);
    return result.payload || null;
  }

  async evaluateFlag(featureKey: string, context?: Partial<FlagEvaluationContext>): Promise<FlagEvaluationResult> {
    if (!this.user) {
      throw new Error('Feature flag client not initialized. Call initialize() first.');
    }

    // Check cache first
    const cacheKey = `${featureKey}:${this.user.id}`;
    const cached = this.flagCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Check if evaluation is already in progress
    const pending = this.pendingEvaluations.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Perform evaluation
    const evaluationPromise = this.performEvaluation(featureKey, context);
    this.pendingEvaluations.set(cacheKey, evaluationPromise);

    try {
      const result = await evaluationPromise;
      
      // Cache the result
      this.flagCache.set(cacheKey, result);
      
      // Track analytics event
      this.trackAnalyticsEvent('evaluation', featureKey, result.variantKey);
      
      return result;
    } finally {
      this.pendingEvaluations.delete(cacheKey);
    }
  }

  private async performEvaluation(
    featureKey: string, 
    context?: Partial<FlagEvaluationContext>
  ): Promise<FlagEvaluationResult> {
    const evaluationContext: FlagEvaluationContext = {
      user: this.user!,
      environment: this.config.environment,
      ...context
    };

    // Try WebSocket evaluation first if connected
    if (this.socket && this.socket.connected) {
      try {
        const result = await new Promise<FlagEvaluationResult>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket evaluation timeout'));
          }, this.config.timeout);

          this.socket!.emit('evaluate_flag', { 
            featureKey, 
            context: evaluationContext 
          }, (response: any) => {
            clearTimeout(timeout);
            if (response.success) {
              resolve(response.result);
            } else {
              reject(new Error(response.error));
            }
          });
        });

        return result;
      } catch (error) {
        console.warn('WebSocket evaluation failed, falling back to HTTP:', error);
      }
    }

    // Fallback to HTTP
    return this.httpEvaluate(featureKey, evaluationContext);
  }

  private async httpEvaluate(
    featureKey: string, 
    context: FlagEvaluationContext
  ): Promise<FlagEvaluationResult> {
    const response = await fetch(`${this.config.apiUrl}/api/v1/evaluate/${featureKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'User-Agent': '@29cards/feature-flag-sdk'
      },
      body: JSON.stringify(context)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getAllFlags(context?: Partial<FlagEvaluationContext>): Promise<{ key: string; result: FlagEvaluationResult }[]> {
    if (!this.user) {
      throw new Error('Feature flag client not initialized. Call initialize() first.');
    }

    const flags = await this.getAllFlagConfigs();
    const flagKeys = flags.map(flag => flag.key);

    // Try WebSocket batch evaluation first
    if (this.socket && this.socket.connected) {
      try {
        const results = await new Promise<any[]>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket batch evaluation timeout'));
          }, this.config.timeout);

          this.socket!.emit('evaluate_flags', {
            keys: flagKeys,
            context: {
              user: this.user!,
              environment: this.config.environment,
              ...context
            }
          }, (response: any) => {
            clearTimeout(timeout);
            if (response.success) {
              resolve(response.results);
            } else {
              reject(new Error(response.error));
            }
          });
        });

        // Cache results
        results.forEach(({ key, result }: { key: string; result: FlagEvaluationResult }) => {
          const cacheKey = `${key}:${this.user!.id}`;
          this.flagCache.set(cacheKey, result);
          this.trackAnalyticsEvent('evaluation', key, result.variantKey);
        });

        return results;
      } catch (error) {
        console.warn('WebSocket batch evaluation failed, falling back to HTTP:', error);
      }
    }

    // Fallback to individual HTTP evaluations
    const results = await Promise.all(
      flagKeys.map(async (key) => {
        const result = await this.evaluateFlag(key, context);
        return { key, result };
      })
    );

    return results;
  }

  async getFlagConfig(featureKey: string): Promise<FlagConfig | null> {
    const cached = this.configCache.get(featureKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(`${this.config.apiUrl}/api/v1/flags/${featureKey}?environment=${this.config.environment}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'User-Agent': '@29cards/feature-flag-sdk'
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const flag = await response.json();
    this.configCache.set(featureKey, flag);
    return flag;
  }

  async getAllFlagConfigs(): Promise<FlagConfig[]> {
    const response = await fetch(`${this.config.apiUrl}/api/v1/flags?environment=${this.config.environment}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'User-Agent': '@29cards/feature-flag-sdk'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const flags = await response.json();
    
    // Update cache
    flags.forEach((flag: FlagConfig) => {
      this.configCache.set(flag.key, flag);
    });

    return flags;
  }

  onFlagUpdate(featureKey: string | '*', listener: FlagEventListener): void {
    const key = featureKey as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(listener);
  }

  offFlagUpdate(featureKey: string | '*', listener: FlagEventListener): void {
    const key = featureKey as string;
    const listeners = this.listeners.get(key);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  trackConversion(featureKey: string, variantKey?: string, metadata?: Record<string, any>): void {
    this.trackAnalyticsEvent('conversion', featureKey, variantKey, metadata);
  }

  trackImpression(featureKey: string, variantKey?: string, metadata?: Record<string, any>): void {
    this.trackAnalyticsEvent('impression', featureKey, variantKey, metadata);
  }

  private trackAnalyticsEvent(
    type: 'impression' | 'conversion' | 'evaluation',
    featureKey: string,
    variantKey?: string,
    metadata?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      type,
      featureKey,
      userId: this.user!.id,
      variantKey,
      timestamp: Date.now(),
      metadata
    };

    // Send via WebSocket if connected
    if (this.socket && this.socket.connected) {
      this.socket.emit('track_event', event);
    } else {
      // Queue for later or send via HTTP
      this.sendAnalyticsEvent(event);
    }
  }

  private async sendAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await fetch(`${this.config.apiUrl}/api/v1/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': '@29cards/feature-flag-sdk'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  private async preloadFlags(): Promise<void> {
    try {
      await this.getAllFlagConfigs();
    } catch (error) {
      console.warn('Failed to preload flags:', error);
    }
  }

  private isCacheValid(result: FlagEvaluationResult): boolean {
    // Simple timestamp-based cache validation
    // In production, you might want more sophisticated logic
    return true; // For now, assume cache is always valid until cleared
  }

  clearCache(featureKey?: string): void {
    if (featureKey) {
      this.flagCache.delete(`${featureKey}:${this.user?.id}`);
      this.configCache.delete(featureKey);
    } else {
      this.flagCache.clear();
      this.configCache.clear();
    }
  }

  updateUser(user: Partial<User>): void {
    if (!this.user) return;
    
    this.user = { ...this.user, ...user };
    
    // Clear cache since user context changed
    this.flagCache.clear();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.flagCache.clear();
    this.configCache.clear();
    this.listeners.clear();
    this.pendingEvaluations.clear();
  }
}