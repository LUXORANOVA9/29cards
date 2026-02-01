import { FeatureFlagClient } from '../src/FeatureFlagClient';
import { io } from 'socket.io-client';

// Mock dependencies
jest.mock('socket.io-client');

describe('FeatureFlagClient', () => {
  let client: FeatureFlagClient;
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      connected: false,
      disconnect: jest.fn()
    };

    (io as jest.Mock).mockReturnValue(mockSocket);

    client = new FeatureFlagClient({
      apiUrl: 'http://localhost:3004',
      wsUrl: 'http://localhost:3004',
      apiKey: 'test-key'
    });
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('initialization', () => {
    it('should initialize with user context', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'PLAYER'
      };

      mockSocket.connected = true;

      await client.initialize(user);

      expect(io).toHaveBeenCalledWith('http://localhost:3004', {
        auth: {
          token: 'test-key'
        }
      });

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('flag_update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('flag_created', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('flag_deleted', expect.any(Function));
    });

    it('should not connect WebSocket if real-time is disabled', async () => {
      client = new FeatureFlagClient({
        apiUrl: 'http://localhost:3004',
        enableRealTime: false
      });

      const user = { id: 'user-123' };
      await client.initialize(user);

      expect(io).not.toHaveBeenCalled();
    });
  });

  describe('flag evaluation', () => {
    beforeEach(async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'PLAYER'
      };

      mockSocket.connected = true;
      await client.initialize(user);
    });

    it('should evaluate flag via WebSocket when connected', async () => {
      const mockResult = {
        enabled: true,
        reason: 'default'
      };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'evaluate_flag') {
          callback({ success: true, result: mockResult });
        }
      });

      const result = await client.evaluateFlag('test-flag');

      expect(result).toEqual(mockResult);
      expect(mockSocket.emit).toHaveBeenCalledWith('evaluate_flag', {
        featureKey: 'test-flag',
        context: expect.objectContaining({
          user: expect.any(Object),
          environment: 'production'
        })
      }, expect.any(Function));
    });

    it('should fall back to HTTP when WebSocket fails', async () => {
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'evaluate_flag') {
          callback({ success: false, error: 'Socket error' });
        }
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          enabled: true,
          reason: 'default'
        })
      });

      const result = await client.evaluateFlag('test-flag');

      expect(result.enabled).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3004/api/v1/evaluate/test-flag',
        expect.any(Object)
      );
    });

    it('should cache evaluation results', async () => {
      const mockResult = {
        enabled: true,
        reason: 'default'
      };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'evaluate_flag') {
          callback({ success: true, result: mockResult });
        }
      });

      // First call
      await client.evaluateFlag('test-flag');
      expect(mockSocket.emit).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await client.evaluateFlag('test-flag');
      expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedClient = new FeatureFlagClient({
        apiUrl: 'http://localhost:3004'
      });

      await expect(uninitializedClient.evaluateFlag('test-flag'))
        .rejects.toThrow('Feature flag client not initialized');
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      await client.initialize({
        id: 'user-123',
        role: 'PLAYER'
      });
    });

    it('should handle flag updates', () => {
      const listener = jest.fn();
      client.onFlagUpdate('test-flag', listener);

      const updateEvent = {
        type: 'flag_update' as const,
        data: {
          flag: {
            key: 'test-flag',
            name: 'Test Flag',
            enabled: true,
            type: 'BOOLEAN',
            isAbTest: false,
            environment: 'production'
          },
          timestamp: Date.now()
        }
      };

      // Simulate receiving update
      const updateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'flag_update')?.[1];
      if (updateHandler) {
        updateHandler(updateEvent);
      }

      expect(listener).toHaveBeenCalledWith(updateEvent);
    });

    it('should handle wildcard listeners', () => {
      const wildcardListener = jest.fn();
      client.onFlagUpdate('*', wildcardListener);

      const updateEvent = {
        type: 'flag_created' as const,
        data: {
          flag: {
            key: 'new-flag',
            name: 'New Flag',
            enabled: true,
            type: 'BOOLEAN',
            isAbTest: false,
            environment: 'production'
          },
          timestamp: Date.now()
        }
      };

      const updateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'flag_created')?.[1];
      if (updateHandler) {
        updateHandler(updateEvent);
      }

      expect(wildcardListener).toHaveBeenCalledWith(updateEvent);
    });
  });

  describe('analytics tracking', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      await client.initialize({
        id: 'user-123',
        role: 'PLAYER'
      });
    });

    it('should track conversions via WebSocket', () => {
      client.trackConversion('test-flag', 'variant-a');

      expect(mockSocket.emit).toHaveBeenCalledWith('track_event', {
        type: 'conversion',
        featureKey: 'test-flag',
        userId: 'user-123',
        variantKey: 'variant-a',
        timestamp: expect.any(Number),
        metadata: undefined
      });
    });

    it('should track impressions via WebSocket', () => {
      client.trackImpression('test-flag', 'variant-a', { source: 'homepage' });

      expect(mockSocket.emit).toHaveBeenCalledWith('track_event', {
        type: 'impression',
        featureKey: 'test-flag',
        userId: 'user-123',
        variantKey: 'variant-a',
        timestamp: expect.any(Number),
        metadata: { source: 'homepage' }
      });
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      await client.initialize({
        id: 'user-123',
        role: 'PLAYER'
      });
    });

    it('should clear specific flag cache', () => {
      client.clearCache('test-flag');
      // Should not throw and should clear cache for the specific flag
    });

    it('should clear all cache', () => {
      client.clearCache();
      // Should not throw and should clear all cache
    });
  });

  describe('disconnect', () => {
    it('should disconnect WebSocket and clear resources', () => {
      client.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});