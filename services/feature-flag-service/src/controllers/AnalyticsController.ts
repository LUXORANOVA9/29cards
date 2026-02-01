// src/controllers/AnalyticsController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AnalyticsEvent } from '../models/types';
import { z } from 'zod';

const analyticsEventSchema = z.object({
  type: z.enum(['impression', 'conversion', 'evaluation']),
  featureKey: z.string(),
  userId: z.string(),
  variantKey: z.string().optional(),
  timestamp: z.number(),
  metadata: z.record(z.any()).optional()
});

export class AnalyticsController {
  constructor(private prisma: PrismaClient) {}

  async trackEvent(req: Request, res: Response): Promise<void> {
    try {
      const validation = analyticsEventSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const event = validation.data;

      // Update variant impressions/conversions if applicable
      if (event.variantKey && (event.type === 'impression' || event.type === 'conversion')) {
        const updateField = event.type === 'impression' ? 'impressions' : 'conversions';
        
        await this.prisma.abVariant.updateMany({
          where: {
            key: event.variantKey,
            featureFlag: {
              key: event.featureKey
            }
          },
          data: {
            [updateField]: {
              increment: 1
            }
          }
        });
      }

      // Store analytics event
      await this.prisma.flagAnalytics.create({
        data: {
          featureKey: event.featureKey,
          timestamp: new Date(event.timestamp),
          totalRequests: 1,
          enabledRequests: event.type === 'evaluation' && req.body.enabled ? 1 : 0,
          variantImpressions: event.type === 'impression' && event.variantKey 
            ? JSON.stringify({ [event.variantKey]: 1 })
            : '{}',
          variantConversions: event.type === 'conversion' && event.variantKey
            ? JSON.stringify({ [event.variantKey]: 1 })
            : '{}',
          evaluationTimeMs: event.metadata?.evaluationTimeMs || 0
        }
      });

      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Track analytics error:', error);
      res.status(500).json({ error: 'Failed to track event' });
    }
  }

  async getFlagAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { featureKey } = req.params;
      const { startDate, endDate, environment } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const analytics = await this.prisma.flagAnalytics.findMany({
        where: {
          featureKey,
          timestamp: {
            gte: start,
            lte: end
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      // Aggregate the data
      const aggregated = analytics.reduce((acc: any, curr) => {
        const totalRequests = (acc.totalRequests || 0) + curr.totalRequests;
        const enabledRequests = (acc.enabledRequests || 0) + curr.enabledRequests;
        const avgEvaluationTime = ((acc.avgEvaluationTime || 0) * (acc.totalRequests || 0) + curr.evaluationTimeMs * curr.totalRequests) / totalRequests;

        const variantImpressions = { ...acc.variantImpressions };
        const variantConversions = { ...acc.variantConversions };

        try {
          const currImpressions = JSON.parse(curr.variantImpressions);
          const currConversions = JSON.parse(curr.variantConversions);

          Object.keys(currImpressions).forEach(key => {
            variantImpressions[key] = (variantImpressions[key] || 0) + currImpressions[key];
          });

          Object.keys(currConversions).forEach(key => {
            variantConversions[key] = (variantConversions[key] || 0) + currConversions[key];
          });
        } catch (e) {
          // Ignore JSON parsing errors
        }

        return {
          totalRequests,
          enabledRequests,
          enabledRate: totalRequests > 0 ? (enabledRequests / totalRequests) * 100 : 0,
          avgEvaluationTime,
          variantImpressions,
          variantConversions,
          period: {
            start,
            end
          }
        };
      }, {});

      res.json(aggregated);
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }

  async getUserEvaluations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const evaluations = await this.prisma.userFlagEvaluation.findMany({
        where: {
          userId
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      });

      res.json(evaluations);
    } catch (error) {
      console.error('Get user evaluations error:', error);
      res.status(500).json({ error: 'Failed to get user evaluations' });
    }
  }

  async getAbTestResults(req: Request, res: Response): Promise<void> {
    try {
      const { featureKey } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get variants for this flag
      const variants = await this.prisma.abVariant.findMany({
        where: {
          featureFlag: {
            key: featureKey
          }
        },
        include: {
          featureFlag: {
            select: {
              name: true,
              description: true
            }
          }
        }
      });

      // Get analytics data for the period
      const analytics = await this.prisma.flagAnalytics.findMany({
        where: {
          featureKey,
          timestamp: {
            gte: start,
            lte: end
          }
        }
      });

      // Aggregate variant performance
      const variantPerformance = variants.map(variant => {
        const totalImpressions = analytics.reduce((sum, curr) => {
          try {
            const impressions = JSON.parse(curr.variantImpressions);
            return sum + (impressions[variant.key] || 0);
          } catch {
            return sum;
          }
        }, 0);

        const totalConversions = analytics.reduce((sum, curr) => {
          try {
            const conversions = JSON.parse(curr.variantConversions);
            return sum + (conversions[variant.key] || 0);
          } catch {
            return sum;
          }
        }, 0);

        const conversionRate = totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0;

        return {
          ...variant,
          totalImpressions,
          totalConversions,
          conversionRate,
          winner: false // Could be calculated based on statistical significance
        };
      });

      // Calculate statistical significance
      const winner = this.calculateWinner(variantPerformance);

      res.json({
        flag: variants[0]?.featureFlag,
        period: { start, end },
        variants: variantPerformance,
        winner,
        totalParticipants: variantPerformance.reduce((sum, v) => sum + v.totalImpressions, 0)
      });
    } catch (error) {
      console.error('Get A/B test results error:', error);
      res.status(500).json({ error: 'Failed to get A/B test results' });
    }
  }

  private calculateWinner(variants: any[]): string | null {
    if (variants.length < 2) return null;

    // Simple implementation: choose variant with highest conversion rate
    // In production, you'd want to use proper statistical tests (e.g., chi-square test)
    const winner = variants.reduce((best, current) => 
      current.conversionRate > best.conversionRate ? current : best
    );

    // Check if difference is statistically significant
    const significance = this.calculateStatisticalSignificance(variants);
    
    return significance ? winner.key : null;
  }

  private calculateStatisticalSignificance(variants: any[]): boolean {
    // Simplified significance calculation
    // In production, implement proper statistical tests
    const sorted = [...variants].sort((a, b) => b.conversionRate - a.conversionRate);
    if (sorted.length < 2) return false;

    const top = sorted[0];
    const second = sorted[1];

    // Simple heuristic: need at least 1000 impressions and 5% difference
    return top.totalImpressions >= 1000 && 
           (top.conversionRate - second.conversionRate) >= 5;
  }
}