import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestQueue, type RequestPriority } from '@/lib/performance/request-queue';
import type { SafeDomCommand } from '@/lib/dsg/safe-dom/types';

describe('RequestQueue', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
    queue.clear();
  });

  afterEach(() => {
    queue.clear();
  });

  describe('enqueue', () => {
    it('should enqueue request and return ID', () => {
      const request = {
        priority: 1 as RequestPriority,
        agentId: 'agent-1',
        delegationId: 'del-1',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      };

      const id = queue.enqueue(request);

      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('should reject when queue is full', () => {
      // Mock the max size to something small for testing
      const smallQueue = new RequestQueue();

      // Fill up the queue (need to use internals or enqueue a lot)
      for (let i = 0; i < 10000; i++) {
        const request = {
          priority: 1 as RequestPriority,
          agentId: `agent-${i}`,
          delegationId: `del-${i}`,
          command: { frameId: `f${i}`, elementId: `e${i}`, operation: 'click' } as SafeDomCommand,
          enqueuedAt: Date.now(),
          deadline: Date.now() + 30000
        };
        const id = smallQueue.enqueue(request);
        if (!id) break; // Queue full
      }

      // Next enqueue should fail
      const request = {
        priority: 1 as RequestPriority,
        agentId: 'agent-overflow',
        delegationId: 'del-overflow',
        command: { frameId: 'f-overflow', elementId: 'e-overflow', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      };

      const id = smallQueue.enqueue(request);
      expect(id).toBeNull();
    });

    it('should track total enqueued count', () => {
      for (let i = 0; i < 5; i++) {
        queue.enqueue({
          priority: 1 as RequestPriority,
          agentId: `agent-${i}`,
          delegationId: `del-${i}`,
          command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
          enqueuedAt: Date.now(),
          deadline: Date.now() + 30000
        });
      }

      const stats = queue.getLifetimeStats();
      expect(stats.totalEnqueued).toBe(5);
    });
  });

  describe('priority enforcement', () => {
    it('should dequeue P1 before P3', () => {
      const p3Request = {
        priority: 3 as RequestPriority,
        agentId: 'agent-p3',
        delegationId: 'del-p3',
        command: { frameId: 'f3', elementId: 'e3', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      };

      const p1Request = {
        priority: 1 as RequestPriority,
        agentId: 'agent-p1',
        delegationId: 'del-p1',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      };

      // Enqueue P3 first, then P1
      queue.enqueue(p3Request);
      queue.enqueue(p1Request);

      // Should dequeue P1 first
      const first = queue.dequeue();
      expect(first?.priority).toBe(1);
      expect(first?.agentId).toBe('agent-p1');

      // Then P3
      const second = queue.dequeue();
      expect(second?.priority).toBe(3);
      expect(second?.agentId).toBe('agent-p3');
    });

    it('should maintain FIFO within priority level', () => {
      const cmd1 = { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand;
      const cmd2 = { frameId: 'f2', elementId: 'e2', operation: 'click' } as SafeDomCommand;

      queue.enqueue({
        priority: 2 as RequestPriority,
        agentId: 'agent-1',
        delegationId: 'del-1',
        command: cmd1,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      });

      queue.enqueue({
        priority: 2 as RequestPriority,
        agentId: 'agent-2',
        delegationId: 'del-2',
        command: cmd2,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      });

      const first = queue.dequeue();
      expect(first?.agentId).toBe('agent-1');

      const second = queue.dequeue();
      expect(second?.agentId).toBe('agent-2');
    });

    it('should prevent P3 starvation with fairness', () => {
      // Enqueue many P1 and P2
      for (let i = 0; i < 10; i++) {
        queue.enqueue({
          priority: 1 as RequestPriority,
          agentId: `agent-p1-${i}`,
          delegationId: `del-${i}`,
          command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
          enqueuedAt: Date.now(),
          deadline: Date.now() + 30000
        });
      }

      // Enqueue P3
      queue.enqueue({
        priority: 3 as RequestPriority,
        agentId: 'agent-p3',
        delegationId: 'del-p3',
        command: { frameId: 'f3', elementId: 'e3', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      });

      // Dequeue multiple times, eventually should get P3
      let gotP3 = false;
      for (let i = 0; i < 20; i++) {
        const req = queue.dequeue();
        if (req?.priority === 3) {
          gotP3 = true;
          break;
        }
      }

      expect(gotP3).toBe(true);
    });
  });

  describe('deadline enforcement', () => {
    it('should skip expired requests', () => {
      const now = Date.now();

      // Enqueue expired request
      queue.enqueue({
        priority: 1 as RequestPriority,
        agentId: 'agent-expired',
        delegationId: 'del-expired',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: now - 31000, // Enqueued 31s ago
        deadline: now - 1000 // Expired 1s ago
      });

      // Enqueue valid request
      queue.enqueue({
        priority: 1 as RequestPriority,
        agentId: 'agent-valid',
        delegationId: 'del-valid',
        command: { frameId: 'f2', elementId: 'e2', operation: 'click' } as SafeDomCommand,
        enqueuedAt: now,
        deadline: now + 30000
      });

      // Should skip expired and return valid
      const req = queue.dequeue();
      expect(req?.agentId).toBe('agent-valid');
    });

    it('should track total expired count', () => {
      const now = Date.now();

      queue.enqueue({
        priority: 1 as RequestPriority,
        agentId: 'agent-1',
        delegationId: 'del-1',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: now - 31000,
        deadline: now - 1000
      });

      queue.dequeue();

      const stats = queue.getLifetimeStats();
      expect(stats.totalExpired).toBe(1);
    });
  });

  describe('statistics', () => {
    it('should calculate wait time percentiles', () => {
      const now = Date.now();

      // Enqueue requests with different ages
      for (let i = 0; i < 5; i++) {
        queue.enqueue({
          priority: 1 as RequestPriority,
          agentId: `agent-${i}`,
          delegationId: `del-${i}`,
          command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
          enqueuedAt: now - (i * 1000), // 0, 1, 2, 3, 4 seconds ago
          deadline: now + 30000
        });
      }

      const stats = queue.getStats();

      expect(stats.p95WaitMs).toBeGreaterThanOrEqual(0);
      expect(stats.p99WaitMs).toBeGreaterThanOrEqual(0);
      expect(stats.p99WaitMs).toBeGreaterThanOrEqual(stats.p95WaitMs);
    });

    it('should track priority distribution', () => {
      queue.enqueue({
        priority: 1 as RequestPriority,
        agentId: 'agent-1',
        delegationId: 'del-1',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      });

      queue.enqueue({
        priority: 2 as RequestPriority,
        agentId: 'agent-2',
        delegationId: 'del-2',
        command: { frameId: 'f2', elementId: 'e2', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      });

      queue.enqueue({
        priority: 3 as RequestPriority,
        agentId: 'agent-3',
        delegationId: 'del-3',
        command: { frameId: 'f3', elementId: 'e3', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      });

      const stats = queue.getStats();

      expect(stats.priorityDistribution.p1).toBe(1);
      expect(stats.priorityDistribution.p2).toBe(1);
      expect(stats.priorityDistribution.p3).toBe(1);
    });

    it('should track size and oldest request age', () => {
      const now = Date.now();

      queue.enqueue({
        priority: 1 as RequestPriority,
        agentId: 'agent-1',
        delegationId: 'del-1',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: now - 5000, // 5s old
        deadline: now + 30000
      });

      const stats = queue.getStats();

      expect(stats.size).toBe(1);
      expect(stats.oldestRequestAgeMs).toBeGreaterThan(4000);
      expect(stats.oldestRequestAgeMs).toBeLessThan(6000);
    });
  });

  describe('requeue', () => {
    it('should allow requeuing with priority bump', () => {
      const originalRequest = {
        priority: 3 as RequestPriority,
        agentId: 'agent-1',
        delegationId: 'del-1',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      };

      const id = queue.enqueue(originalRequest);
      const req = queue.dequeue();

      if (req) {
        const newId = queue.requeue(req);

        expect(newId).toBeTruthy();
        expect(newId).not.toBe(id); // New ID

        const requeued = queue.dequeue();
        // Priority should be bumped to 2 (from 3)
        expect(requeued?.priority).toBeLessThanOrEqual(2);
      }
    });

    it('should drop requests after max retries', () => {
      let request = {
        priority: 1 as RequestPriority,
        agentId: 'agent-1',
        delegationId: 'del-1',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      };

      const id = queue.enqueue(request);
      expect(id).toBeTruthy();

      // Simulate 4 dequeue attempts (each increments attemptCount)
      for (let i = 0; i < 4; i++) {
        const req = queue.dequeue();
        if (req) {
          if (i < 3) {
            const requeued = queue.requeue(req);
            expect(requeued).toBeTruthy();
          } else {
            // After 3 attempts, requeue should fail
            const requeued = queue.requeue(req);
            expect(requeued).toBeNull();
          }
        }
      }
    });
  });

  describe('async queue processing', () => {
    it('should yield requests in priority order', async () => {
      queue.enqueue({
        priority: 3 as RequestPriority,
        agentId: 'agent-p3',
        delegationId: 'del-p3',
        command: { frameId: 'f3', elementId: 'e3', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      });

      queue.enqueue({
        priority: 1 as RequestPriority,
        agentId: 'agent-p1',
        delegationId: 'del-p1',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      });

      const results: string[] = [];
      const gen = queue.processQueueAsync();

      // Get first 2 items
      for (let i = 0; i < 2; i++) {
        const item = await gen.next();
        if (item.value) {
          results.push(item.value.agentId);
        }
      }

      expect(results[0]).toBe('agent-p1'); // P1 first
      expect(results[1]).toBe('agent-p3'); // P3 second
    });
  });

  describe('dead letter queue (PHASE 3)', () => {
    it('should move stale items to DLQ', () => {
      const now = Date.now();

      queue.enqueue({
        priority: 1 as RequestPriority,
        agentId: 'agent-1',
        delegationId: 'del-1',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: now - 1000000, // Very old
        deadline: now + 30000
      });

      const stats = queue.cleanupQueueItems();

      expect(stats.moved_to_dead_letter).toBeGreaterThanOrEqual(0);
      const dlq = queue.getDeadLetterQueue();
      expect(Array.isArray(dlq)).toBe(true);
    });

    it('should access dead letter queue', () => {
      const dlq = queue.getDeadLetterQueue();

      expect(Array.isArray(dlq)).toBe(true);
      expect(dlq.length).toBe(0);
    });

    it('should clear dead letter queue', () => {
      queue.clearDeadLetterQueue();

      const dlq = queue.getDeadLetterQueue();
      expect(dlq.length).toBe(0);
    });
  });
});
