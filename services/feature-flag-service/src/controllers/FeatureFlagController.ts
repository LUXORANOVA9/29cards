// src/controllers/FeatureFlagController.ts
import { Request, Response } from 'express';
import { FeatureFlagService } from '../services/FeatureFlagService';
import { CreateFlagRequest, UpdateFlagRequest, FlagEvaluationContext } from '../models/types';
import { z } from 'zod';

const createFlagSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['BOOLEAN', 'PERCENTAGE', 'MULTIVARIATE', 'RULE_BASED']),
  percentage: z.number().min(0).max(100).optional(),
  isAbTest: z.boolean().default(false),
  variants: z.array(z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    weight: z.number().min(0).max(1),
    enabled: z.boolean().default(true),
    payload: z.any().optional()
  })).optional(),
  rules: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    enabled: z.boolean().default(true),
    priority: z.number().default(0),
    conditions: z.array(z.object({
      attribute: z.string().min(1),
      operator: z.enum(['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'GREATER_THAN', 'LESS_THAN', 'IN', 'NOT_IN', 'REGEX']),
      value: z.string()
    })).optional()
  })).optional()
});

const evaluateFlagSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    role: z.string(),
    panelId: z.string().optional(),
    brokerId: z.string().optional(),
    customProperties: z.record(z.any()).optional()
  }),
  environment: z.string().optional(),
  customAttributes: z.record(z.any()).optional()
});

export class FeatureFlagController {
  constructor(private featureFlagService: FeatureFlagService) {}

  async createFlag(req: Request, res: Response): Promise<void> {
    try {
      const validation = createFlagSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const flagData = {
        ...validation.data,
        createdBy: req.user?.id || 'system',
        environment: req.query.environment as string || 'production'
      };

      const flag = await this.featureFlagService.createFlag(flagData);

      // Notify WebSocket clients
      req.app.get('io')?.emit('flag_created', {
        flag,
        timestamp: Date.now()
      });

      res.status(201).json(flag);
    } catch (error) {
      console.error('Create flag error:', error);
      res.status(500).json({ error: 'Failed to create flag' });
    }
  }

  async updateFlag(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const environment = req.query.environment as string || 'production';
      
      const validation = createFlagSchema.partial().safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const updateData = {
        ...validation.data,
        updatedBy: req.user?.id || 'system'
      };

      const flag = await this.featureFlagService.updateFlag(key, environment, updateData);

      // Notify WebSocket clients
      req.app.get('io')?.emit('flag_update', {
        flag,
        timestamp: Date.now()
      });

      res.json(flag);
    } catch (error) {
      console.error('Update flag error:', error);
      res.status(500).json({ error: 'Failed to update flag' });
    }
  }

  async deleteFlag(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const environment = req.query.environment as string || 'production';

      await this.featureFlagService.deleteFlag(key, environment);

      // Notify WebSocket clients
      req.app.get('io')?.emit('flag_deleted', {
        key,
        environment,
        timestamp: Date.now()
      });

      res.status(204).send();
    } catch (error) {
      console.error('Delete flag error:', error);
      res.status(500).json({ error: 'Failed to delete flag' });
    }
  }

  async getFlags(req: Request, res: Response): Promise<void> {
    try {
      const environment = req.query.environment as string;
      const flags = await this.featureFlagService.getFlagConfigs(environment);
      res.json(flags);
    } catch (error) {
      console.error('Get flags error:', error);
      res.status(500).json({ error: 'Failed to get flags' });
    }
  }

  async getFlag(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const environment = req.query.environment as string || 'production';
      
      const flags = await this.featureFlagService.getFlagConfigs(environment);
      const flag = flags.find(f => f.key === key);
      
      if (!flag) {
        res.status(404).json({ error: 'Flag not found' });
        return;
      }

      res.json(flag);
    } catch (error) {
      console.error('Get flag error:', error);
      res.status(500).json({ error: 'Failed to get flag' });
    }
  }

  async evaluateFlag(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const validation = evaluateFlagSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const context: FlagEvaluationContext = {
        ...validation.data,
        timestamp: Date.now(),
        sessionId: req.headers['x-session-id'] as string,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };

      const result = await this.featureFlagService.evaluateFlag(key, context);
      res.json(result);
    } catch (error) {
      console.error('Evaluate flag error:', error);
      res.status(500).json({ error: 'Failed to evaluate flag' });
    }
  }

  async evaluateMultipleFlags(req: Request, res: Response): Promise<void> {
    try {
      const { keys } = req.body;
      const contextValidation = evaluateFlagSchema.omit({ user: true }).safeParse(req.body);
      
      if (!Array.isArray(keys) || !contextValidation.success) {
        res.status(400).json({ error: 'Invalid request' });
        return;
      }

      const context: FlagEvaluationContext = {
        user: req.body.user,
        ...contextValidation.data,
        timestamp: Date.now(),
        sessionId: req.headers['x-session-id'] as string,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };

      const results = await Promise.all(
        keys.map(async (key: string) => {
          const result = await this.featureFlagService.evaluateFlag(key, context);
          return { key, result };
        })
      );

      res.json(results);
    } catch (error) {
      console.error('Evaluate multiple flags error:', error);
      res.status(500).json({ error: 'Failed to evaluate flags' });
    }
  }
}