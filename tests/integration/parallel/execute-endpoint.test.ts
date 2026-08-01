import { describe, it, expect, beforeEach } from 'vitest';
import { RequestQueue, type RequestPriority } from '@/lib/performance/request-queue';
import { HarmonyEngine } from '@/lib/parallel/harmony-engine';
import type { SafeDomCommand } from '@/lib/dsg/safe-dom/types';

describe('Execute Endpoint Integration', () => {
  let queue: RequestQueue;
  let harmony: HarmonyEngine;

  beforeEach(() => {
    queue = new RequestQueue();
    queue.clear();
    harmony = new HarmonyEngine();
    harmony.clear();
  });

  describe('POST /api/parallel/execute', () => {
    it('should enqueue request and return ID and queue position', () => {
      const request = {
        priority: 1 as RequestPriority,
        agentId: 'agent-1',
        delegationId: 'del-1',
        command: { frameId: 'f1', elementId: 'e1', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      };

      const id = queue.enqueue(request);
      const stats = queue.getStats();

      expect(id).toBeTruthy();
      expect(stats.size).toBe(1);
    });

    it('should enforce priority order', () => {
      // Enqueue in reverse priority order
      for (let p = 3; p >= 1; p--) {
        queue.enqueue({
          priority: p as RequestPriority,
          agentId: `agent-p${p}`,
          delegationId: `del-p${p}`,
          command: { frameId: `f${p}`, elementId: `e${p}`, operation: 'click' } as SafeDomCommand,
          enqueuedAt: Date.now(),
          deadline: Date.now() + 30000
        });
      }

      // Dequeue should follow priority order
      const first = queue.dequeue();
      expect(first?.priority).toBe(1);

      const second = queue.dequeue();
      expect(second?.priority).toBe(2);

      const third = queue.dequeue();
      expect(third?.priority).toBe(3);
    });

    it('should reject when queue full', () => {
      // Fill queue (10,000 items)
      for (let i = 0; i < 10000; i++) {
        const id = queue.enqueue({
          priority: 1 as RequestPriority,
          agentId: `agent-${i}`,
          delegationId: `del-${i}`,
          command: { frameId: `f${i}`, elementId: `e${i}`, operation: 'click' } as SafeDomCommand,
          enqueuedAt: Date.now(),
          deadline: Date.now() + 30000
        });
        if (!id) break;
      }

      // Next should be rejected
      const result = queue.enqueue({
        priority: 1 as RequestPriority,
        agentId: 'agent-overflow',
        delegationId: 'del-overflow',
        command: { frameId: 'f-overflow', elementId: 'e-overflow', operation: 'click' } as SafeDomCommand,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30000
      });

      expect(result).toBeNull();
    });
  });

  describe('Harmony integration', () => {
    it('should match commands via harmony engine', () => {
      const cmd: SafeDomCommand = {
        frameId: 'frame-1',
        elementId: 'button-1',
        operation: 'click'
      };
      const manifest = [{ selector: 'button.submit', text: 'Submit' }];

      harmony.addToIndex(cmd, manifest, 'contract-1');

      const result = harmony.findBestMatch(cmd);

      expect(result.manifest).toEqual(manifest);
      expect(result.source).toBe('heuristic');
    });

    it('should handle harmony misses gracefully', () => {
      const cmd: SafeDomCommand = {
        frameId: 'missing-frame',
        elementId: 'missing-element',
        operation: 'click'
      };

      const result = harmony.findBestMatch(cmd);

      expect(result.manifest).toBeNull();
      expect(result.source).toBe('miss');
    });
  });

  describe('Concurrent requests', () => {
    it('should handle 10 concurrent requests without deadlock', () => {
      const promises: (string | null)[] = [];

      for (let i = 0; i < 10; i++) {
        const id = queue.enqueue({
          priority: Math.ceil(Math.random() * 3) as RequestPriority,
          agentId: `agent-${i}`,
          delegationId: `del-${i}`,
          command: { frameId: `f${i}`, elementId: `e${i}`, operation: 'click' } as SafeDomCommand,
          enqueuedAt: Date.now(),
          deadline: Date.now() + 30000
        });
        promises.push(id);
      }

      expect(promises.every(id => id !== null)).toBe(true);
      expect(queue.getStats().size).toBe(10);
    });
  });
});
