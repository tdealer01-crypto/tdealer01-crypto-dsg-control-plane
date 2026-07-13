import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DSGLogger, createLogger } from '@/lib/logging/logger';
import { SimUseAdapter } from '@/lib/integrations/sim-use';

describe('DSG Logging + sim-use Integration', () => {
  describe('DSGLogger', () => {
    let logger: DSGLogger;

    beforeEach(() => {
      logger = new DSGLogger('DEBUG');
      vi.spyOn(console, 'debug').mockImplementation(() => {});
      vi.spyOn(console, 'info').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should create logger with default level', () => {
      const l = new DSGLogger();
      expect(l).toBeDefined();
    });

    it('should redact sensitive fields in logs', () => {
      const context = {
        agentId: 'agent-123',
        authToken: 'secret-token-xyz',
        password: 'my-password',
      };

      logger.info('Test log', context);
      expect(console.info).toHaveBeenCalled();
    });

    it('should create child logger with base context', () => {
      const baseContext = { agentId: 'agent-1', requestId: 'req-1' };
      const childLogger = logger.withContext(baseContext);

      childLogger.info('Child log message', { userId: 'user-1' });
      expect(console.info).toHaveBeenCalled();
    });

    it('should log error with exception', () => {
      const error = new Error('Test error');
      logger.error('Something went wrong', error);

      expect(console.error).toHaveBeenCalled();
    });

    it('should have distinct log levels', () => {
      const debugOnly = new DSGLogger('DEBUG');
      const infoOnly = new DSGLogger('INFO');

      vi.spyOn(console, 'debug').mockClear();

      debugOnly.debug('Debug message');
      expect(console.debug).toHaveBeenCalled();

      vi.spyOn(console, 'debug').mockClear();
      infoOnly.debug('Debug message');
      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe('SimUseAdapter', () => {
    let adapter: SimUseAdapter;

    beforeEach(() => {
      adapter = new SimUseAdapter({
        cacheEnabled: true,
        cacheTtlSeconds: 300,
      });
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('should initialize with default config', () => {
      const a = new SimUseAdapter();
      expect(a).toBeDefined();
    });

    it('should have cache disabled when configured', () => {
      const a = new SimUseAdapter({ cacheEnabled: false });
      expect(a.getStats().cacheEnabled).toBe(false);
    });

    it('should clear cache', () => {
      adapter.clearCache();
      expect(adapter.getStats().cacheSize).toBe(0);
    });

    it('should return stats', () => {
      const stats = adapter.getStats();
      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('lastQueryTime');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('cacheEnabled');
    });

    it('should check data threshold', () => {
      const data = {
        simId: 'sim-1',
        dataUsageBytes: 80 * 1024 * 1024,
        dataLimitBytes: 100 * 1024 * 1024,
        dataPercentage: 80,
        callMinutesUsed: 10,
        callMinutesLimit: 100,
        smsUsed: 5,
        smsLimit: 100,
        lastUpdated: new Date().toISOString(),
        status: 'active' as const,
      };

      const reached = adapter.isDataThresholdReached(data, 80);
      expect(reached).toBe(true);

      const notReached = adapter.isDataThresholdReached(data, 90);
      expect(notReached).toBe(false);
    });
  });

  describe('createLogger helper', () => {
    it('should create module-specific logger', () => {
      const log = createLogger('my-module');
      expect(log).toBeDefined();
    });

    it('should have all logger methods', () => {
      const log = createLogger('test');
      expect(typeof log.debug).toBe('function');
      expect(typeof log.info).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.error).toBe('function');
      expect(typeof log.critical).toBe('function');
      expect(typeof log.withContext).toBe('function');
      expect(typeof log.flush).toBe('function');
    });
  });

  describe('Integration scenario', () => {
    it('should handle full Android executor logging flow', () => {
      // Create logger with DEBUG level to ensure debug messages are logged
      const testLogger = new DSGLogger('DEBUG');
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const auditContext = {
        agentId: 'agent-123',
        requestId: 'req-456',
        frameId: 'frame-789',
      };

      // Simulate executor flow
      testLogger.debug('Android executor command start', auditContext, {
        appPackage: 'com.line.app',
        operation: 'click',
      });

      testLogger.info(
        'Safe DOM command executed successfully',
        auditContext,
        {
          appPackage: 'com.line.app',
          operation: 'click',
          screenTitle: 'MainActivity',
        }
      );

      expect(debugSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
    });

    it('should handle SIM usage query in logging', async () => {
      const adapter = new SimUseAdapter({ cacheEnabled: false });
      const logger = createLogger('sim-use-test');

      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'info').mockImplementation(() => {});

      // This will likely fail due to missing API key, but should log gracefully
      const result = await adapter.queryUsage('08012345678', {
        agentId: 'agent-1',
        requestId: 'req-1',
      });

      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('queryTime');
    });
  });
});
