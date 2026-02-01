// src/types.ts
export interface User {
  id: string;
  email?: string;
  phone?: string;
  role: string;
  panelId?: string;
  brokerId?: string;
  customProperties?: Record<string, any>;
}

export interface FlagEvaluationContext {
  user: User;
  environment?: string;
  customAttributes?: Record<string, any>;
}

export interface FlagEvaluationResult {
  enabled: boolean;
  variantKey?: string;
  payload?: any;
  reason: string;
  ruleId?: string;
}

export interface FlagConfig {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: string;
  percentage?: number;
  variants?: AbVariant[];
  isAbTest: boolean;
  environment: string;
}

export interface AbVariant {
  id: string;
  key: string;
  name: string;
  description?: string;
  weight: number;
  enabled: boolean;
  payload?: any;
  impressions: number;
  conversions: number;
}

export interface FeatureFlagClientConfig {
  apiUrl: string;
  wsUrl?: string;
  apiKey?: string;
  environment?: string;
  timeout?: number;
  cacheTimeout?: number;
  enableRealTime?: boolean;
  defaultAttributes?: Record<string, any>;
}

export interface FlagUpdateEvent {
  type: 'flag_update' | 'flag_created' | 'flag_deleted';
  data: {
    flag: FlagConfig;
    timestamp: number;
  };
}

export type FlagEventListener = (event: FlagUpdateEvent) => void;

export interface AnalyticsEvent {
  type: 'impression' | 'conversion' | 'evaluation';
  featureKey: string;
  userId: string;
  variantKey?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}