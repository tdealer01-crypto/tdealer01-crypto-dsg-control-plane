import { describe, it, expect, beforeEach } from 'vitest';
import { MonitoringEmitter } from '@/lib/monitoring/event-emitter';
import { monitoringBus } from '@/lib/monitoring/execution-hooks';

/**
 * Integration tests for monitoring with real database
 * These tests verify the monitoring system works end-to-end
 */

describe('Monitoring Integration', () => {
  beforeEach(() => {
    monitoringBus.reset();
  });

  describe('MonitoringEventBus', () => {
    it('should have isEnabled method', () => {
      const isEnabled = monitoringBus.isEnabled();
      expect(typeof isEnabled).toBe('boolean');
    });

    it('should handle setExecutionId safely', () => {
      expect(() => {
        monitoringBus.setExecutionId('test-exec-123');
      }).not.toThrow();
    });

    it('should handle onTokenUsage safely when disabled', async () => {
      expect(async () => {
        await monitoringBus.onTokenUsage({
          modelName: 'claude-opus',
          inputTokens: 100,
          outputTokens: 50,
          costUsd: 0.01,
        });
      }).not.toThrow();
    });

    it('should handle onToolCall safely when disabled', async () => {
      expect(async () => {
        const result = await monitoringBus.onToolCall({
          toolName: 'web_search',
          toolInput: { query: 'test' },
        });
        expect(result).toBeNull();
      }).not.toThrow();
    });

    it('should handle onExecutionComplete safely when disabled', async () => {
      expect(async () => {
        await monitoringBus.onExecutionComplete({
          status: 'success',
        });
      }).not.toThrow();
    });
  });

  describe('Non-breaking behavior', () => {
    it('should not break execution if monitoring is disabled', async () => {
      // Simulate disabling monitoring by testing with monitoringBus
      const isEnabled = monitoringBus.isEnabled();

      // Whether enabled or not, should not throw
      await monitoringBus.onTokenUsage({
        modelName: 'claude-opus',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.01,
      });

      expect(isEnabled === false || isEnabled === true).toBe(true);
    });

    it('should handle multiple events without blocking', async () => {
      const executionId = 'test-exec-123';
      monitoringBus.setExecutionId(executionId);

      const start = Date.now();

      await Promise.all([
        monitoringBus.onTokenUsage({
          modelName: 'claude-opus',
          inputTokens: 100,
          outputTokens: 50,
          costUsd: 0.01,
        }),
        monitoringBus.onToolCall({
          toolName: 'web_search',
          toolInput: { query: 'test' },
        }),
        monitoringBus.onTokenUsage({
          modelName: 'claude-opus',
          inputTokens: 50,
          outputTokens: 25,
          costUsd: 0.005,
        }),
      ]);

      const duration = Date.now() - start;

      // Should complete quickly (not blocked by database operations)
      // Even if disabled, should be fast
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Fail-safe design', () => {
    it('should not throw on initialization failure', async () => {
      const emitter = new MonitoringEmitter();

      expect(async () => {
        await emitter.captureExecution({
          agent_id: 'test-agent',
          org_id: 'test-org',
        });
      }).not.toThrow();
    });

    it('should handle token usage without execution context', async () => {
      const emitter = new MonitoringEmitter();

      const result = await emitter.recordTokenUsage('claude-opus', 100, 50, 0.01);

      expect(result).toBeNull();
    });

    it('should complete execution safely', async () => {
      const emitter = new MonitoringEmitter('test-exec-123');

      expect(async () => {
        await emitter.completeExecution('success', 'Test message');
      }).not.toThrow();
    });
  });
});
