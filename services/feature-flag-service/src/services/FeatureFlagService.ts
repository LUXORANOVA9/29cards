// src/services/FeatureFlagService.ts
import { PrismaClient, ConditionOperator } from '@prisma/client';
import { 
  FlagEvaluationContext, 
  FlagEvaluationResult, 
  EvaluationReason,
  FlagConfig,
  TargetingRule,
  TargetingCondition,
  AbVariant,
  User
} from '../models/types';
import { Redis } from 'redis';
import { createHash } from 'crypto';

export class FeatureFlagService {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  async evaluateFlag(featureKey: string, context: FlagEvaluationContext): Promise<FlagEvaluationResult> {
    try {
      // Try to get from cache first
      const cacheKey = `flag:${featureKey}:${context.user.id}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get flag configuration
      const flag = await this.getFlag(featureKey, context.environment);
      if (!flag) {
        return this.createResult(false, EvaluationReason.ERROR, 'Flag not found');
      }

      if (!flag.enabled) {
        return this.createResult(false, EvaluationReason.DISABLED);
      }

      // Evaluate based on flag type
      let result: FlagEvaluationResult;

      switch (flag.type) {
        case 'BOOLEAN':
          result = this.createResult(true, EvaluationReason.DEFAULT);
          break;
        case 'PERCENTAGE':
          result = this.evaluatePercentage(flag, context);
          break;
        case 'RULE_BASED':
          result = await this.evaluateRules(flag, context);
          break;
        case 'MULTIVARIATE':
          result = this.evaluateMultivariate(flag, context);
          break;
        default:
          result = this.createResult(false, EvaluationReason.ERROR, 'Unknown flag type');
      }

      // Cache the result for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(result));

      // Log evaluation for analytics
      await this.logEvaluation(featureKey, context, result);

      return result;
    } catch (error) {
      console.error('Error evaluating flag:', error);
      return this.createResult(false, EvaluationReason.ERROR, 'Evaluation failed');
    }
  }

  private async getFlag(featureKey: string, environment?: string): Promise<FlagConfig | null> {
    const cacheKey = `flag_config:${featureKey}:${environment || 'production'}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const flag = await this.prisma.featureFlag.findFirst({
      where: {
        key: featureKey,
        environment: environment || 'production'
      },
      include: {
        rules: {
          include: {
            conditions: true
          },
          orderBy: {
            priority: 'desc'
          }
        },
        variants: {
          orderBy: {
            key: 'asc'
          }
        }
      }
    });

    if (!flag) {
      return null;
    }

    const flagConfig: FlagConfig = {
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      type: flag.type as any,
      percentage: flag.percentage,
      rules: flag.rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        conditions: rule.conditions.map(cond => ({
          id: cond.id,
          attribute: cond.attribute,
          operator: cond.operator as any,
          value: cond.value
        })),
        enabled: rule.enabled,
        priority: rule.priority
      })),
      variants: flag.variants.map(variant => ({
        id: variant.id,
        key: variant.key,
        name: variant.name,
        description: variant.description,
        weight: variant.weight,
        enabled: variant.enabled,
        payload: variant.payload ? JSON.parse(variant.payload) : undefined,
        impressions: variant.impressions,
        conversions: variant.conversions
      })),
      isAbTest: flag.isAbTest,
      environment: flag.environment
    };

    // Cache for 1 minute
    await this.redis.setex(cacheKey, 60, JSON.stringify(flagConfig));

    return flagConfig;
  }

  private evaluatePercentage(flag: FlagConfig, context: FlagEvaluationContext): FlagEvaluationResult {
    if (!flag.percentage) {
      return this.createResult(false, EvaluationReason.ERROR, 'No percentage set');
    }

    // Use consistent hashing based on user ID and feature key
    const hashInput = `${context.user.id}:${flag.key}`;
    const hash = createHash('md5').update(hashInput).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const hashPercentage = (hashInt / 0xFFFFFFFF) * 100;

    const enabled = hashPercentage < flag.percentage;
    const reason = enabled ? EvaluationReason.PERCENTAGE_MATCH : EvaluationReason.DEFAULT;

    return this.createResult(enabled, reason);
  }

  private async evaluateRules(flag: FlagConfig, context: FlagEvaluationContext): Promise<FlagEvaluationResult> {
    if (!flag.rules || flag.rules.length === 0) {
      return this.createResult(false, EvaluationReason.DEFAULT);
    }

    // Sort rules by priority (highest first)
    const sortedRules = [...flag.rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      const matches = await this.evaluateRule(rule, context);
      if (matches) {
        return this.createResult(true, EvaluationReason.RULE_MATCH, undefined, rule.id);
      }
    }

    return this.createResult(false, EvaluationReason.DEFAULT);
  }

  private async evaluateRule(rule: TargetingRule, context: FlagEvaluationContext): Promise<boolean> {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true;
    }

    for (const condition of rule.conditions) {
      const matches = await this.evaluateCondition(condition, context);
      if (!matches) {
        return false; // All conditions must match (AND logic)
      }
    }

    return true;
  }

  private async evaluateCondition(condition: TargetingCondition, context: FlagEvaluationContext): Promise<boolean> {
    let userValue: any;

    // Get attribute value from user context
    switch (condition.attribute) {
      case 'user_id':
        userValue = context.user.id;
        break;
      case 'email':
        userValue = context.user.email;
        break;
      case 'phone':
        userValue = context.user.phone;
        break;
      case 'role':
        userValue = context.user.role;
        break;
      case 'panel_id':
        userValue = context.user.panelId;
        break;
      case 'broker_id':
        userValue = context.user.brokerId;
        break;
      default:
        // Check custom properties
        userValue = context.user.customProperties?.[condition.attribute] || 
                   context.customAttributes?.[condition.attribute];
        break;
    }

    const conditionValue = condition.value;
    const operator = condition.operator;

    switch (operator) {
      case ConditionOperator.EQUALS:
        return String(userValue) === conditionValue;
      case ConditionOperator.NOT_EQUALS:
        return String(userValue) !== conditionValue;
      case ConditionOperator.CONTAINS:
        return String(userValue).includes(conditionValue);
      case ConditionOperator.NOT_CONTAINS:
        return !String(userValue).includes(conditionValue);
      case ConditionOperator.STARTS_WITH:
        return String(userValue).startsWith(conditionValue);
      case ConditionOperator.ENDS_WITH:
        return String(userValue).endsWith(conditionValue);
      case ConditionOperator.IN:
        const inValues = JSON.parse(conditionValue);
        return inValues.includes(userValue);
      case ConditionOperator.NOT_IN:
        const notInValues = JSON.parse(conditionValue);
        return !notInValues.includes(userValue);
      case ConditionOperator.GREATER_THAN:
        return Number(userValue) > Number(conditionValue);
      case ConditionOperator.LESS_THAN:
        return Number(userValue) < Number(conditionValue);
      case ConditionOperator.REGEX:
        const regex = new RegExp(conditionValue);
        return regex.test(String(userValue));
      default:
        return false;
    }
  }

  private evaluateMultivariate(flag: FlagConfig, context: FlagEvaluationContext): FlagEvaluationResult {
    if (!flag.variants || flag.variants.length === 0) {
      return this.createResult(false, EvaluationReason.ERROR, 'No variants defined');
    }

    const enabledVariants = flag.variants.filter(v => v.enabled);
    if (enabledVariants.length === 0) {
      return this.createResult(false, EvaluationReason.DISABLED);
    }

    // Use consistent hashing for variant assignment
    const hashInput = `${context.user.id}:${flag.key}`;
    const hash = createHash('md5').update(hashInput).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const hashPercentage = (hashInt / 0xFFFFFFFF) * 100;

    let cumulativeWeight = 0;
    for (const variant of enabledVariants) {
      cumulativeWeight += variant.weight * 100;
      if (hashPercentage < cumulativeWeight) {
        return this.createResult(
          true, 
          EvaluationReason.VARIANT_ASSIGNMENT, 
          variant.payload,
          undefined,
          variant.key
        );
      }
    }

    // Fallback to first variant
    const firstVariant = enabledVariants[0];
    return this.createResult(
      true, 
      EvaluationReason.VARIANT_ASSIGNMENT, 
      firstVariant.payload,
      undefined,
      firstVariant.key
    );
  }

  private createResult(
    enabled: boolean, 
    reason: EvaluationReason, 
    error?: string,
    ruleId?: string,
    variantKey?: string
  ): FlagEvaluationResult {
    return {
      enabled,
      variantKey,
      reason,
      ruleId,
      payload: undefined
    };
  }

  private async logEvaluation(
    featureKey: string, 
    context: FlagEvaluationContext, 
    result: FlagEvaluationResult
  ): Promise<void> {
    try {
      await this.prisma.userFlagEvaluation.create({
        data: {
          userId: context.user.id,
          featureKey,
          enabled: result.enabled,
          variantKey: result.variantKey,
          ruleId: result.ruleId,
          context: JSON.stringify(context)
        }
      });
    } catch (error) {
      console.error('Failed to log evaluation:', error);
    }
  }

  async createFlag(data: any): Promise<FlagConfig> {
    const flag = await this.prisma.featureFlag.create({
      data: {
        ...data,
        variants: data.variants ? {
          create: data.variants.map((v: any) => ({
            ...v,
            payload: v.payload ? JSON.stringify(v.payload) : undefined
          }))
        } : undefined
      },
      include: {
        rules: {
          include: {
            conditions: true
          }
        },
        variants: true
      }
    });

    // Invalidate cache
    await this.invalidateFlagCache(data.key, data.environment || 'production');

    return flag as any;
  }

  async updateFlag(key: string, environment: string, data: any): Promise<FlagConfig> {
    const flag = await this.prisma.featureFlag.update({
      where: {
        key_environment: {
          key,
          environment
        }
      },
      data: {
        ...data,
        variants: data.variants ? {
          deleteMany: {},
          create: data.variants.map((v: any) => ({
            ...v,
            payload: v.payload ? JSON.stringify(v.payload) : undefined
          }))
        } : undefined
      },
      include: {
        rules: {
          include: {
            conditions: true
          }
        },
        variants: true
      }
    });

    // Invalidate cache
    await this.invalidateFlagCache(key, environment);

    return flag as any;
  }

  async deleteFlag(key: string, environment: string): Promise<void> {
    await this.prisma.featureFlag.delete({
      where: {
        key_environment: {
          key,
          environment
        }
      }
    });

    // Invalidate cache
    await this.invalidateFlagCache(key, environment);
  }

  private async invalidateFlagCache(key: string, environment: string): Promise<void> {
    const patterns = [
      `flag_config:${key}:${environment}`,
      `flag:${key}:*`
    ];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    }
  }

  async getFlagConfigs(environment?: string): Promise<FlagConfig[]> {
    const flags = await this.prisma.featureFlag.findMany({
      where: environment ? { environment } : undefined,
      include: {
        rules: {
          include: {
            conditions: true
          }
        },
        variants: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return flags.map(flag => ({
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      type: flag.type as any,
      percentage: flag.percentage,
      rules: flag.rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        conditions: rule.conditions.map(cond => ({
          id: cond.id,
          attribute: cond.attribute,
          operator: cond.operator as any,
          value: cond.value
        })),
        enabled: rule.enabled,
        priority: rule.priority
      })),
      variants: flag.variants.map(variant => ({
        id: variant.id,
        key: variant.key,
        name: variant.name,
        description: variant.description,
        weight: variant.weight,
        enabled: variant.enabled,
        payload: variant.payload ? JSON.parse(variant.payload) : undefined,
        impressions: variant.impressions,
        conversions: variant.conversions
      })),
      isAbTest: flag.isAbTest,
      environment: flag.environment
    }));
  }
}