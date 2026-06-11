import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateTaskFingerprint,
  executorThrottle,
  type ExecutionAttempt,
} from '@/lib/performance/executor-throttle';

describe('Phase 1: Max Retries + Fingerprint + Break Condition', () => {
  beforeEach(() => {
    executorThrottle.clearAttempts();
  });

  describe('generateTaskFingerprint()', () => {
    it('should generate a 16-char hex string', () => {
      const fingerprint = generateTaskFingerprint({
        action: 'click',
        target: '#button',
        agentId: 'agent-1',
      });
      expect(fingerprint).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should be deterministic: same input = same output', () => {
      const fp1 = generateTaskFingerprint({
        action: 'click',
        target: '#button',
        agentId: 'agent-1',
      });
      const fp2 = generateTaskFingerprint({
        action: 'click',
        target: '#button',
        agentId: 'agent-1',
      });
      expect(fp1).toBe(fp2);
    });

    it('should differ for different inputs', () => {
      const fp1 = generateTaskFingerprint({
        action: 'click',
        target: '#button',
        agentId: 'agent-1',
      });
      const fp2 = generateTaskFingerprint({
        action: 'click',
        target: '#other',
        agentId: 'agent-1',
      });
      expect(fp1).not.toBe(fp2);
    });
  });

  describe('recordTaskAttempt()', () => {
    it('should create initial attempt with retryCount=0', () => {
      const attempt = executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1');
      expect(attempt.retryCount).toBe(0);
      expect(attempt.taskId).toBe('task-1');
      expect(attempt.fingerprint).toBe('fp123');
    });

    it('should increment retryCount on subsequent calls', () => {
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1');
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1');
      const attempt = executorThrottle.getAttempt('task-1');
      expect(attempt?.retryCount).toBe(1);
    });

    it('should track failure reasons', () => {
      const error1 = new Error('Connection timeout');
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error1);
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error1);

      const attempt = executorThrottle.getAttempt('task-1');
      expect(attempt?.failureReasons).toContain('Connection timeout');
      expect(attempt?.failureReasons.length).toBe(1); // Should not duplicate
    });

    it('should record different failure reasons', () => {
      const error1 = new Error('Connection timeout');
      const error2 = new Error('Auth failed');

      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error1);
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error2);

      const attempt = executorThrottle.getAttempt('task-1');
      expect(attempt?.failureReasons).toContain('Connection timeout');
      expect(attempt?.failureReasons).toContain('Auth failed');
    });

    it('should track timestamps', () => {
      const before = Date.now();
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1');
      const after = Date.now();

      const attempt = executorThrottle.getAttempt('task-1');
      expect(attempt?.firstAttemptTime).toBeGreaterThanOrEqual(before);
      expect(attempt?.firstAttemptTime).toBeLessThanOrEqual(after);
    });
  });

  describe('canRetryTask()', () => {
    it('should allow retry on first failure', () => {
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', new Error('Test error'));
      const decision = executorThrottle.canRetryTask('task-1', 'fp123');
      expect(decision.allowed).toBe(true);
    });

    it('should allow up to 3 retries', () => {
      const error = new Error('Test error');
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error);
      expect(executorThrottle.canRetryTask('task-1', 'fp123').allowed).toBe(true); // retry 1

      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error);
      expect(executorThrottle.canRetryTask('task-1', 'fp123').allowed).toBe(true); // retry 2

      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error);
      expect(executorThrottle.canRetryTask('task-1', 'fp123').allowed).toBe(true); // retry 3

      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error);
      expect(executorThrottle.canRetryTask('task-1', 'fp123').allowed).toBe(false); // retry 4 - blocked
    });

    it('should block fingerprint after 3 identical failures', () => {
      const error = new Error('Identical error');
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error);
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error);
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error);
      executorThrottle.blockFingerprint('fp123', error.message);

      const decision = executorThrottle.canRetryTask('task-1', 'fp123');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Fingerprint blocked');
    });

    it('should return stop reason on max retries', () => {
      const error = new Error('Test error');
      for (let i = 0; i < 4; i++) {
        executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1', error);
      }

      const decision = executorThrottle.canRetryTask('task-1', 'fp123');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Max retries');
    });
  });

  describe('blockFingerprint()', () => {
    it('should mark fingerprint as blocked', () => {
      expect(executorThrottle.isFingerprinted('fp123')).toBe(false);
      executorThrottle.blockFingerprint('fp123', 'Test reason');
      expect(executorThrottle.isFingerprinted('fp123')).toBe(true);
    });

    it('should prevent retry after blocking', () => {
      executorThrottle.blockFingerprint('fp456', 'Test reason');
      const decision = executorThrottle.canRetryTask('task-1', 'fp456');
      expect(decision.allowed).toBe(false);
    });
  });

  describe('getAttempt()', () => {
    it('should return attempt for tracked task', () => {
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1');
      const attempt = executorThrottle.getAttempt('task-1');
      expect(attempt).toBeDefined();
      expect(attempt?.taskId).toBe('task-1');
    });

    it('should return undefined for untracked task', () => {
      const attempt = executorThrottle.getAttempt('nonexistent');
      expect(attempt).toBeUndefined();
    });
  });

  describe('clearAttempts()', () => {
    it('should clear all attempt tracking', () => {
      executorThrottle.recordTaskAttempt('task-1', 'fp123', 'executor-1');
      executorThrottle.blockFingerprint('fp456', 'Test');
      expect(executorThrottle.getAttempt('task-1')).toBeDefined();

      executorThrottle.clearAttempts();
      expect(executorThrottle.getAttempt('task-1')).toBeUndefined();
      expect(executorThrottle.isFingerprinted('fp456')).toBe(false);
    });
  });

  describe('Integration tests', () => {
    it('should handle single failure + retry', () => {
      const error = new Error('Transient error');
      const fp = generateTaskFingerprint({
        action: 'fetch',
        target: 'api.example.com',
        agentId: 'agent-1',
      });

      executorThrottle.recordTaskAttempt('task-1', fp, 'executor-1', error);
      expect(executorThrottle.canRetryTask('task-1', fp).allowed).toBe(true);

      // Simulate success on retry
      const attempt = executorThrottle.getAttempt('task-1');
      expect(attempt?.retryCount).toBe(0); // Still on first attempt
    });

    it('should block after 3 identical failures', () => {
      const error = new Error('Permanent network error');
      const fp = generateTaskFingerprint({
        action: 'fetch',
        target: 'api.example.com',
        agentId: 'agent-1',
      });

      // Simulate 3 failed attempts
      for (let i = 0; i < 3; i++) {
        executorThrottle.recordTaskAttempt('task-1', fp, 'executor-1', error);
      }

      // Block after 3 identical failures
      executorThrottle.blockFingerprint(fp, error.message);

      // Now retry should be blocked
      const decision = executorThrottle.canRetryTask('task-1', fp);
      expect(decision.allowed).toBe(false);
    });

    it('should differentiate between different tasks with same fingerprint', () => {
      const fp = 'shared-fp';
      const error = new Error('Test error');

      executorThrottle.recordTaskAttempt('task-1', fp, 'executor-1', error);
      executorThrottle.recordTaskAttempt('task-2', fp, 'executor-1', error);

      const attempt1 = executorThrottle.getAttempt('task-1');
      const attempt2 = executorThrottle.getAttempt('task-2');

      expect(attempt1?.taskId).toBe('task-1');
      expect(attempt2?.taskId).toBe('task-2');
      expect(attempt1?.fingerprint).toBe(attempt2?.fingerprint);
    });
  });
});
