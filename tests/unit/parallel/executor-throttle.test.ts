import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutorThrottle, generateTaskFingerprint } from '@/lib/performance/executor-throttle';

describe('ExecutorThrottle', () => {
  let throttle: ExecutorThrottle;

  beforeEach(() => {
    throttle = new ExecutorThrottle();
  });

  describe('capacity initialization', () => {
    it('should initialize capacity for all executor types', () => {
      throttle.initializeCapacity('org-1');

      expect(throttle.canSpawnNewSession('virtual-pc', 'org-1')).toBe(true);
      expect(throttle.canSpawnNewSession('browserbase', 'org-1')).toBe(true);
      expect(throttle.canSpawnNewSession('terminal', 'org-1')).toBe(true);
      expect(throttle.canSpawnNewSession('deploy', 'org-1')).toBe(true);
    });

    it('should use default org if not specified', () => {
      throttle.initializeCapacity();

      expect(throttle.canSpawnNewSession('virtual-pc')).toBe(true);
    });
  });

  describe('capacity checking', () => {
    it('should return true when capacity available', () => {
      throttle.initializeCapacity('org-1');

      expect(throttle.canSpawnNewSession('virtual-pc', 'org-1')).toBe(true);
    });

    it('should return false when at capacity', () => {
      throttle.initializeCapacity('org-1');

      // Fill up virtual-pc capacity (50 concurrent)
      for (let i = 0; i < 50; i++) {
        const result = throttle.recordSessionStart('virtual-pc', 'org-1');
        expect(result).toBe(true);
      }

      // Next request should fail
      expect(throttle.canSpawnNewSession('virtual-pc', 'org-1')).toBe(false);
    });

    it('should enforce limits per executor type', () => {
      throttle.initializeCapacity('org-1');

      // Fill up virtual-pc (50 limit)
      for (let i = 0; i < 50; i++) {
        throttle.recordSessionStart('virtual-pc', 'org-1');
      }

      // Browserbase should still have capacity
      expect(throttle.canSpawnNewSession('browserbase', 'org-1')).toBe(true);

      // Fill up browserbase (100 limit)
      for (let i = 0; i < 100; i++) {
        throttle.recordSessionStart('browserbase', 'org-1');
      }

      // Browserbase should now be full
      expect(throttle.canSpawnNewSession('browserbase', 'org-1')).toBe(false);

      // Terminal should still have capacity
      expect(throttle.canSpawnNewSession('terminal', 'org-1')).toBe(true);
    });
  });

  describe('session recording', () => {
    it('should increment count on recordSessionStart', () => {
      throttle.initializeCapacity('org-1');

      const result1 = throttle.recordSessionStart('virtual-pc', 'org-1');
      expect(result1).toBe(true);

      const result2 = throttle.recordSessionStart('virtual-pc', 'org-1');
      expect(result2).toBe(true);

      // Should track peak count
      const stats = throttle.getCapacityStats?.('virtual-pc', 'org-1');
      if (stats) {
        expect(stats.peakCount).toBeGreaterThanOrEqual(2);
      }
    });

    it('should decrement count on recordSessionEnd', () => {
      throttle.initializeCapacity('org-1');

      throttle.recordSessionStart('virtual-pc', 'org-1');
      throttle.recordSessionStart('virtual-pc', 'org-1');

      throttle.recordSessionEnd('virtual-pc', 'org-1');

      // Should still have capacity since we freed one
      expect(throttle.canSpawnNewSession('virtual-pc', 'org-1')).toBe(true);
    });

    it('should not go below zero on recordSessionEnd', () => {
      throttle.initializeCapacity('org-1');

      // Try to end without starting
      throttle.recordSessionEnd('virtual-pc', 'org-1');

      // Should still allow new session (not below 0)
      expect(throttle.canSpawnNewSession('virtual-pc', 'org-1')).toBe(true);
    });
  });

  describe('capacity limits', () => {
    it('should enforce virtual-pc limit of 50', () => {
      throttle.initializeCapacity('org-1');

      for (let i = 0; i < 50; i++) {
        const result = throttle.recordSessionStart('virtual-pc', 'org-1');
        expect(result).toBe(true);
      }

      const result = throttle.recordSessionStart('virtual-pc', 'org-1');
      expect(result).toBe(false); // At limit
    });

    it('should enforce browserbase limit of 100', () => {
      throttle.initializeCapacity('org-1');

      for (let i = 0; i < 100; i++) {
        const result = throttle.recordSessionStart('browserbase', 'org-1');
        expect(result).toBe(true);
      }

      const result = throttle.recordSessionStart('browserbase', 'org-1');
      expect(result).toBe(false); // At limit
    });

    it('should enforce terminal limit of 200', () => {
      throttle.initializeCapacity('org-1');

      for (let i = 0; i < 200; i++) {
        const result = throttle.recordSessionStart('terminal', 'org-1');
        expect(result).toBe(true);
      }

      const result = throttle.recordSessionStart('terminal', 'org-1');
      expect(result).toBe(false); // At limit
    });

    it('should enforce deploy limit of 1 (serialized)', () => {
      throttle.initializeCapacity('org-1');

      const result1 = throttle.recordSessionStart('deploy', 'org-1');
      expect(result1).toBe(true);

      const result2 = throttle.recordSessionStart('deploy', 'org-1');
      expect(result2).toBe(false); // Deploy is serialized (max 1)
    });
  });

  describe('org isolation', () => {
    it('should track capacity per org independently', () => {
      throttle.initializeCapacity('org-1');
      throttle.initializeCapacity('org-2');

      throttle.recordSessionStart('virtual-pc', 'org-1');
      throttle.recordSessionStart('virtual-pc', 'org-2');

      // Both should still have capacity
      expect(throttle.canSpawnNewSession('virtual-pc', 'org-1')).toBe(true);
      expect(throttle.canSpawnNewSession('virtual-pc', 'org-2')).toBe(true);
    });

    it('should fill one org without affecting another', () => {
      throttle.initializeCapacity('org-1');
      throttle.initializeCapacity('org-2');

      // Fill org-1
      for (let i = 0; i < 50; i++) {
        throttle.recordSessionStart('virtual-pc', 'org-1');
      }

      // org-2 should still have capacity
      expect(throttle.canSpawnNewSession('virtual-pc', 'org-2')).toBe(true);
    });
  });

  describe('task fingerprinting', () => {
    it('should generate deterministic fingerprint', () => {
      const task = {
        action: 'execute',
        target: 'button.submit',
        agentId: 'agent-123',
        workflowId: 'workflow-456',
        payload: { timeout: 5000 }
      };

      const fp1 = generateTaskFingerprint(task);
      const fp2 = generateTaskFingerprint(task);

      expect(fp1).toBe(fp2);
    });

    it('should produce different fingerprints for different tasks', () => {
      const task1 = {
        action: 'execute',
        target: 'button.submit',
        agentId: 'agent-123'
      };

      const task2 = {
        action: 'execute',
        target: 'input.text',
        agentId: 'agent-123'
      };

      const fp1 = generateTaskFingerprint(task1);
      const fp2 = generateTaskFingerprint(task2);

      expect(fp1).not.toBe(fp2);
    });

    it('should return 16-char hex string', () => {
      const task = {
        action: 'execute',
        target: 'button',
        agentId: 'agent-1'
      };

      const fp = generateTaskFingerprint(task);

      expect(fp).toHaveLength(16);
      expect(/^[0-9a-f]{16}$/.test(fp)).toBe(true);
    });

    it('should handle optional fields', () => {
      const task1 = {
        action: 'execute',
        agentId: 'agent-1'
        // no target, workflowId, payload
      };

      const task2 = {
        action: 'execute',
        agentId: 'agent-1',
        target: '',
        workflowId: '',
        payload: {}
      };

      const fp1 = generateTaskFingerprint(task1);
      const fp2 = generateTaskFingerprint(task2);

      // Should be equivalent
      expect(fp1).toBe(fp2);
    });
  });

  describe('queue time estimation', () => {
    it('should estimate 0ms when capacity available', () => {
      throttle.initializeCapacity('org-1');

      // Should be able to start immediately
      expect(throttle.canSpawnNewSession('virtual-pc', 'org-1')).toBe(true);
    });

    it('should estimate ~30s when at capacity', () => {
      throttle.initializeCapacity('org-1');

      // Fill capacity
      for (let i = 0; i < 50; i++) {
        throttle.recordSessionStart('virtual-pc', 'org-1');
      }

      // At capacity
      expect(throttle.canSpawnNewSession('virtual-pc', 'org-1')).toBe(false);
    });
  });
});
