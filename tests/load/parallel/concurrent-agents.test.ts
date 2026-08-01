import { describe, it, expect, beforeEach } from 'vitest';
import { HarmonyEngine } from '@/lib/parallel/harmony-engine';
import { RequestQueue, type RequestPriority } from '@/lib/performance/request-queue';
import type { SafeDomCommand } from '@/lib/dsg/safe-dom/types';

describe('Concurrent Agent Load Test', () => {
  let harmony: HarmonyEngine;
  let queue: RequestQueue;

  beforeEach(() => {
    harmony = new HarmonyEngine();
    queue = new RequestQueue();
    harmony.clear();
    queue.clear();
  });

  describe('100 agents', () => {
    it('should handle 100 agents without timeout', () => {
      const numAgents = 100;
      let totalLatency = 0;

      for (let i = 0; i < numAgents; i++) {
        const cmd: SafeDomCommand = {
          frameId: `frame-${i % 10}`,
          elementId: `element-${i % 20}`,
          operation: ['click', 'type', 'scroll', 'press'][i % 4] as any
        };

        const t0 = performance.now();
        const result = harmony.findBestMatch(cmd);
        totalLatency += result.latency;
      }

      const avgLatency = totalLatency / numAgents;
      expect(avgLatency).toBeLessThan(100); // <100ms average
    });

    it('should enqueue 100 requests without rejections', () => {
      const numRequests = 100;
      let accepted = 0;

      for (let i = 0; i < numRequests; i++) {
        const id = queue.enqueue({
          priority: Math.ceil(Math.random() * 3) as RequestPriority,
          agentId: `agent-${i}`,
          delegationId: `del-${i}`,
          command: { frameId: `f${i}`, elementId: `e${i}`, operation: 'click' } as SafeDomCommand,
          enqueuedAt: Date.now(),
          deadline: Date.now() + 30000
        });
        if (id) accepted++;
      }

      expect(accepted).toBe(100);
      expect(queue.getStats().size).toBe(100);
    });
  });

  describe('500 agents', () => {
    it('should handle 500 agents with <1s average latency', () => {
      const numAgents = 500;
      let totalLatency = 0;
      let maxLatency = 0;

      for (let i = 0; i < numAgents; i++) {
        const cmd: SafeDomCommand = {
          frameId: `frame-${i % 20}`,
          elementId: `element-${i % 50}`,
          operation: ['click', 'type', 'scroll'][i % 3] as any
        };

        const t0 = performance.now();
        harmony.findBestMatch(cmd);
        const latency = performance.now() - t0;

        totalLatency += latency;
        maxLatency = Math.max(maxLatency, latency);
      }

      const avgLatency = totalLatency / numAgents;
      expect(avgLatency).toBeLessThan(1000);
      expect(maxLatency).toBeLessThan(5000);
    });

    it('should maintain >80% cache hit rate', () => {
      const numAgents = 500;
      const manifests = Array.from({ length: 5 }, (_, i) => [
        { selector: `.btn-${i}`, text: `Button ${i}` }
      ]);

      // Build index
      for (let i = 0; i < 10; i++) {
        const cmd: SafeDomCommand = {
          frameId: `frame-${i % 5}`,
          elementId: `element-${i}`,
          operation: 'click'
        };
        harmony.addToIndex(cmd, manifests[i % 5], `contract-${i}`);
      }

      // Query same commands
      for (let i = 0; i < numAgents; i++) {
        const cmd: SafeDomCommand = {
          frameId: `frame-${i % 5}`,
          elementId: `element-${i % 10}`,
          operation: 'click'
        };
        harmony.findBestMatch(cmd);
      }

      const stats = harmony.getStats();
      expect(stats.hitRate).toBeGreaterThanOrEqual(70);
    });
  });

  describe('1000 agents', () => {
    it('should degrade gracefully at 1000 agents', () => {
      const numAgents = 1000;
      let totalLatency = 0;
      const latencies: number[] = [];

      for (let i = 0; i < numAgents; i++) {
        const cmd: SafeDomCommand = {
          frameId: `frame-${i % 50}`,
          elementId: `element-${i % 100}`,
          operation: 'click'
        };

        const t0 = performance.now();
        harmony.findBestMatch(cmd);
        const latency = performance.now() - t0;

        totalLatency += latency;
        latencies.push(latency);
      }

      const avgLatency = totalLatency / numAgents;
      latencies.sort((a, b) => a - b);

      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];

      expect(p50).toBeLessThan(100);
      expect(p95).toBeLessThan(1000);
      expect(p99).toBeLessThan(5000);
    });

    it('should queue 1000 requests efficiently', () => {
      const numRequests = 1000;
      const startTime = Date.now();

      for (let i = 0; i < numRequests; i++) {
        queue.enqueue({
          priority: Math.ceil(Math.random() * 3) as RequestPriority,
          agentId: `agent-${i}`,
          delegationId: `del-${i}`,
          command: { frameId: `f${i % 100}`, elementId: `e${i}`, operation: 'click' } as SafeDomCommand,
          enqueuedAt: Date.now(),
          deadline: Date.now() + 30000
        });
      }

      const elapsed = Date.now() - startTime;
      const throughput = numRequests / (elapsed / 1000);

      expect(queue.getStats().size).toBe(1000);
      expect(throughput).toBeGreaterThan(100); // At least 100 req/s
    });
  });
});
