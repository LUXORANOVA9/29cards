// src/models/types.ts
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
  timestamp?: number;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  customAttributes?: Record<string, any>;
}

export interface FlagEvaluationResult {
  enabled: boolean;
  variantKey?: string;
  payload?: any;
  ruleId?: string;
  reason: EvaluationReason;
}

export enum EvaluationReason {
  DEFAULT = 'default',
  RULE_MATCH = 'rule_match',
  PERCENTAGE_MATCH = 'percentage_match',
  VARIANT_ASSIGNMENT = 'variant_assignment',
  DISABLED = 'disabled',
  ERROR = 'error'
}

export interface FlagConfig {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: FlagType;
  percentage?: number;
  rules?: TargetingRule[];
  variants?: AbVariant[];
  isAbTest: boolean;
  environment: string;
}

export enum FlagType {
  BOOLEAN = 'BOOLEAN',
  PERCENTAGE = 'PERCENTAGE',
  MULTIVARIATE = 'MULTIVARIATE',
  RULE_BASED = 'RULE_BASED'
}

export interface TargetingRule {
  id: string;
  name: string;
  description?: string;
  conditions: TargetingCondition[];
  enabled: boolean;
  priority: number;
}

export interface TargetingCondition {
  id: string;
  attribute: string;
  operator: ConditionOperator;
  value: string;
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  REGEX = 'REGEX'
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

export interface CreateFlagRequest {
  key: string;
  name: string;
  description?: string;
  type: FlagType;
  percentage?: number;
  isAbTest?: boolean;
  variants?: Omit<AbVariant, 'id' | 'impressions' | 'conversions'>[];
  rules?: Omit<TargetingRule, 'id' | 'conditions'>[];
}

export interface UpdateFlagRequest extends Partial<CreateFlagRequest> {
  enabled?: boolean;
}

export interface WebSocketMessage {
  type: 'flag_update' | 'flag_created' | 'flag_deleted';
  data: {
    flag: FlagConfig;
    timestamp: number;
  };
}

export interface AnalyticsEvent {
  type: 'impression' | 'conversion' | 'evaluation';
  featureKey: string;
  userId: string;
  variantKey?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}