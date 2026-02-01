import { FeatureFlagService } from '../src/services/FeatureFlagService';
import { PrismaClient } from '@prisma/client';
import Redis from 'redis';
import { FlagEvaluationContext, FlagType } from '../src/models/types';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('redis');

describe('FeatureFlagService', () => {
  let featureFlagService: FeatureFlagService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    mockRedis = new Redis() as jest.Mocked<Redis>;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock behavior
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.keys.mockResolvedValue([]);
    mockRedis.del.mockResolvedValue(1);
    
    featureFlagService = new FeatureFlagService(mockPrisma, mockRedis);
  });

  describe('evaluateFlag', () => {
    const mockContext: FlagEvaluationContext = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'PLAYER'
      },
      environment: 'production'
    };

    it('should return disabled result for disabled flag', async () => {
      const mockFlag = {
        id: 'flag-123',
        key: 'test-flag',
        name: 'Test Flag',
        enabled: false,
        type: FlagType.BOOLEAN,
        isAbTest: false,
        environment: 'production'
      };

      mockPrisma.featureFlag.findFirst.mockResolvedValue(mockFlag as any);

      const result = await featureFlagService.evaluateFlag('test-flag', mockContext);

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('disabled');
    });

    it('should return enabled result for boolean flag', async () => {
      const mockFlag = {
        id: 'flag-123',
        key: 'test-flag',
        name: 'Test Flag',
        enabled: true,
        type: FlagType.BOOLEAN,
        isAbTest: false,
        environment: 'production'
      };

      mockPrisma.featureFlag.findFirst.mockResolvedValue(mockFlag as any);

      const result = await featureFlagService.evaluateFlag('test-flag', mockContext);

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('default');
    });

    it('should evaluate percentage flag correctly', async () => {
      const mockFlag = {
        id: 'flag-123',
        key: 'test-flag',
        name: 'Test Flag',
        enabled: true,
        type: FlagType.PERCENTAGE,
        percentage: 50,
        isAbTest: false,
        environment: 'production'
      };

      mockPrisma.featureFlag.findFirst.mockResolvedValue(mockFlag as any);

      const result = await featureFlagService.evaluateFlag('test-flag', mockContext);

      expect([true, false]).toContain(result.enabled);
      expect(['percentage_match', 'default']).toContain(result.reason);
    });

    it('should evaluate rules correctly', async () => {
      const mockFlag = {
        id: 'flag-123',
        key: 'test-flag',
        name: 'Test Flag',
        enabled: true,
        type: FlagType.RULE_BASED,
        isAbTest: false,
        environment: 'production',
        rules: [
          {
            id: 'rule-1',
            name: 'Admin Rule',
            enabled: true,
            priority: 1,
            conditions: [
              {
                id: 'cond-1',
                attribute: 'role',
                operator: 'EQUALS',
                value: 'ADMIN'
              }
            ]
          }
        ]
      };

      mockPrisma.featureFlag.findFirst.mockResolvedValue(mockFlag as any);

      const result = await featureFlagService.evaluateFlag('test-flag', {
        user: { ...mockContext.user, role: 'ADMIN' }
      });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('rule_match');
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        enabled: true,
        reason: 'default'
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await featureFlagService.evaluateFlag('test-flag', mockContext);

      expect(result).toEqual(cachedResult);
      expect(mockPrisma.featureFlag.findFirst).not.toHaveBeenCalled();
    });

    it('should handle missing flag gracefully', async () => {
      mockPrisma.featureFlag.findFirst.mockResolvedValue(null);

      const result = await featureFlagService.evaluateFlag('nonexistent-flag', mockContext);

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('error');
    });
  });

  describe('createFlag', () => {
    const flagData = {
      key: 'new-flag',
      name: 'New Flag',
      type: FlagType.BOOLEAN,
      enabled: true,
      createdBy: 'user-123',
      environment: 'production'
    };

    it('should create a new flag successfully', async () => {
      const createdFlag = { id: 'flag-123', ...flagData };
      mockPrisma.featureFlag.create.mockResolvedValue(createdFlag as any);
      mockRedis.keys.mockResolvedValue([]);

      const result = await featureFlagService.createFlag(flagData);

      expect(result).toEqual(createdFlag);
      expect(mockPrisma.featureFlag.create).toHaveBeenCalledWith({
        data: expect.objectContaining(flagData),
        include: expect.any(Object)
      });
    });

    it('should invalidate cache after creating flag', async () => {
      const createdFlag = { id: 'flag-123', ...flagData };
      mockPrisma.featureFlag.create.mockResolvedValue(createdFlag as any);
      mockRedis.keys.mockResolvedValue(['cache-key-1', 'cache-key-2']);
      mockRedis.del.mockResolvedValue(2);

      await featureFlagService.createFlag(flagData);

      expect(mockRedis.del).toHaveBeenCalledWith(['cache-key-1', 'cache-key-2']);
    });
  });

  describe('updateFlag', () => {
    const updateData = {
      name: 'Updated Flag',
      enabled: false
    };

    it('should update flag successfully', async () => {
      const updatedFlag = {
        id: 'flag-123',
        key: 'test-flag',
        name: 'Updated Flag',
        enabled: false,
        environment: 'production'
      };

      mockPrisma.featureFlag.update.mockResolvedValue(updatedFlag as any);
      mockRedis.keys.mockResolvedValue([]);

      const result = await featureFlagService.updateFlag('test-flag', 'production', updateData);

      expect(result).toEqual(updatedFlag);
      expect(mockPrisma.featureFlag.update).toHaveBeenCalledWith({
        where: {
          key_environment: {
            key: 'test-flag',
            environment: 'production'
          }
        },
        data: expect.objectContaining(updateData),
        include: expect.any(Object)
      });
    });
  });

  describe('deleteFlag', () => {
    it('should delete flag successfully', async () => {
      mockPrisma.featureFlag.delete.mockResolvedValue(undefined as any);
      mockRedis.keys.mockResolvedValue([]);

      await featureFlagService.deleteFlag('test-flag', 'production');

      expect(mockPrisma.featureFlag.delete).toHaveBeenCalledWith({
        where: {
          key_environment: {
            key: 'test-flag',
            environment: 'production'
          }
        }
      });
    });
  });
});