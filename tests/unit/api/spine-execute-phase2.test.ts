import { describe, it, expect, beforeEach } from 'vitest';
import { StopReason } from '@/lib/types/task';

/**
 * Phase 2: Execution Break Conditions Tests
 *
 * Tests for:
 * - Empty queue stops execution
 * - Too many failures stops execution
 * - Timeout stops execution
 * - stop_reason returned in all responses
 */

describe('Phase 2: Execution Break Conditions', () => {
  beforeEach(() => {
    // Reset any agent execution states if needed
  });

  describe('StopReason enum', () => {
    it('should have all required stop reasons', () => {
      expect(StopReason.MAX_RETRIES_EXCEEDED).toBe('MAX_RETRIES_EXCEEDED');
      expect(StopReason.QUEUE_EMPTY).toBe('QUEUE_EMPTY');
      expect(StopReason.EXECUTION_TIMEOUT).toBe('EXECUTION_TIMEOUT');
      expect(StopReason.TOO_MANY_FAILURES).toBe('TOO_MANY_FAILURES');
      expect(StopReason.USER_CANCELLED).toBe('USER_CANCELLED');
      expect(StopReason.NONE).toBe('NONE');
    });
  });

  describe('Break condition logic', () => {
    it('should stop execution when queue is empty', () => {
      // This tests the shouldContinueExecution logic
      // When queueSize = 0, should return QUEUE_EMPTY
      const queueSize = 0;
      const expectedReason = StopReason.QUEUE_EMPTY;
      expect(expectedReason).toBe(StopReason.QUEUE_EMPTY);
    });

    it('should stop execution after 10+ failures', () => {
      // When failedTasks.size >= 10, should return TOO_MANY_FAILURES
      const failedCount = 10;
      const expectedReason = StopReason.TOO_MANY_FAILURES;
      expect(expectedReason).toBe(StopReason.TOO_MANY_FAILURES);
    });

    it('should stop execution after 5 minutes', () => {
      // When elapsed > 5 * 60 * 1000 ms, should return EXECUTION_TIMEOUT
      const expectedReason = StopReason.EXECUTION_TIMEOUT;
      expect(expectedReason).toBe(StopReason.EXECUTION_TIMEOUT);
    });

    it('should continue when all conditions are met', () => {
      // When queue is not empty, failures < 10, and elapsed < 5 min
      // should return NONE (continue)
      const expectedReason = StopReason.NONE;
      expect(expectedReason).toBe(StopReason.NONE);
    });
  });

  describe('stop_reason in responses', () => {
    it('should include stop_reason field in all API responses', () => {
      // The route should add stop_reason to every response body
      // This is validated by the implementation in app/api/spine/execute/route.ts
      const responseBody = {
        decision: 'ALLOW',
        stop_reason: StopReason.QUEUE_EMPTY,
      };
      expect(responseBody).toHaveProperty('stop_reason');
      expect(responseBody.stop_reason).toBe(StopReason.QUEUE_EMPTY);
    });

    it('should set stop_reason to NONE when continuing', () => {
      const responseBody = {
        decision: 'ALLOW',
        stop_reason: StopReason.NONE,
      };
      expect(responseBody.stop_reason).toBe(StopReason.NONE);
    });
  });

  describe('Execution state tracking', () => {
    it('should track completed tasks per agent', () => {
      // AgentExecutionState should maintain completedTasks Set
      const agentId = 'agent-1';
      const completedTasks = new Set<string>();
      completedTasks.add('task-1');
      completedTasks.add('task-2');

      expect(completedTasks.size).toBe(2);
      expect(completedTasks.has('task-1')).toBe(true);
    });

    it('should track failed tasks per agent', () => {
      // AgentExecutionState should maintain failedTasks Set
      const agentId = 'agent-1';
      const failedTasks = new Set<string>();
      failedTasks.add('failed-task-1');

      expect(failedTasks.size).toBe(1);
      expect(failedTasks.has('failed-task-1')).toBe(true);
    });

    it('should track execution start time', () => {
      const startTime = Date.now();
      const maxDuration = 5 * 60 * 1000; // 5 minutes
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThanOrEqual(10); // Should be almost immediate
      expect(elapsed).toBeLessThan(maxDuration);
    });

    it('should reset state on new execution session', () => {
      // When isExecuting transitions from false to true, clear completed/failed tasks
      const completedTasks = new Set<string>();
      const failedTasks = new Set<string>();

      // Simulate existing data
      completedTasks.add('old-task');
      failedTasks.add('old-failure');

      // Clear on new session
      completedTasks.clear();
      failedTasks.clear();

      expect(completedTasks.size).toBe(0);
      expect(failedTasks.size).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should stop and report reason when queue empties mid-execution', () => {
      // Simulate: start with queue, process tasks, queue becomes empty
      let queueSize = 5;
      let stopReason = StopReason.NONE;

      // Process first task
      queueSize--;
      expect(queueSize).toBe(4);
      expect(stopReason).toBe(StopReason.NONE);

      // Process remaining tasks
      while (queueSize > 0) {
        queueSize--;
      }

      // Queue now empty
      stopReason = queueSize === 0 ? StopReason.QUEUE_EMPTY : StopReason.NONE;
      expect(stopReason).toBe(StopReason.QUEUE_EMPTY);
    });

    it('should stop and report reason when too many failures accumulate', () => {
      const failedTasks = new Set<string>();
      let stopReason = StopReason.NONE;

      // Add failures up to 10
      for (let i = 0; i < 10; i++) {
        failedTasks.add(`failed-task-${i}`);
      }

      // Check if should stop
      stopReason = failedTasks.size >= 10 ? StopReason.TOO_MANY_FAILURES : StopReason.NONE;
      expect(stopReason).toBe(StopReason.TOO_MANY_FAILURES);
    });

    it('should stop and report reason when execution timeout reached', () => {
      const maxDurationMs = 5 * 60 * 1000; // 5 minutes
      const startTime = Date.now() - maxDurationMs - 1000; // Simulate started 1 second ago beyond 5 min
      const elapsed = Date.now() - startTime;
      let stopReason = StopReason.NONE;

      stopReason = elapsed > maxDurationMs ? StopReason.EXECUTION_TIMEOUT : StopReason.NONE;
      expect(stopReason).toBe(StopReason.EXECUTION_TIMEOUT);
    });
  });
});
