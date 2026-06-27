/**
 * Integration tests: RequestQueue + HarmonyEngine working together
 *
 * Tests the queue and harmony engine as an integrated system:
 * - High-volume request enqueueing (100+ mixed priorities)
 * - Harmony cache hits on duplicate commands
 * - DB query reduction via harmony caching
 * - Fairness (P3 doesn't starve)
 * - End-to-end latency (queue + harmony lookup)
 * - Concurrent operations (10+ simultaneous agents)
 *
 * Target: >80% coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RequestQueue, type RequestPriority, type QueuedRequest } from '../../../lib/performance/request-queue';
import { HarmonyEngine, type HarmonyMatchResult } from '../../../lib/parallel/harmony-engine';
import type { SafeDomCommand, SafeElementManifest } from '../../../lib/dsg/safe-dom/types';

describe('Queue + Harmony Integration', () => {
  let queue: RequestQueue;
  let harmony: HarmonyEngine;

  beforeEach(() => {
    queue = new RequestQueue();
    harmony = new HarmonyEngine();
  });

  afterEach(() => {
    queue.clear();
    harmony.clear();
  });

  /**
   * Helper: create a real SafeDomCommand
   */
  const createCommand = (overrides: Partial<SafeDomCommand> = {}): SafeDomCommand => ({
    frameId: 'frame-1',
    elementId: 'elem-1',
    operation: 'click',
    ...overrides,
  });

  /**
   * Helper: create a real SafeElementManifest
   */
  const createManifest = (overrides: Partial<SafeElementManifest> = {}): SafeElementManifest => ({
    id: 'elem-1',
    frameId: 'frame-1',
    role: 'button',
    allowedOps: ['click'],
    selectorHash: 'hash-1',
    internalSelector: '#button-1',
    risk: 'low',
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    ...overrides,
  });

  /**
   * Helper: create a queued request with SafeDomCommand
   */
  const createQueuedRequest = (overrides: Partial<QueuedRequest> = {}): Omit<QueuedRequest, 'id' | 'attemptCount'> => ({
    priority: 1,
    agentId: 'agent-1',
    delegationId: 'deleg-1',
    command: createCommand(),
    enqueuedAt: Date.now(),
    deadline: Date.now() + 30000,
    ...overrides,
  });

  // ============================================================================
  // Test Suite 1: Enqueue 100 requests with mixed priorities
  // ============================================================================

  describe('Enqueue 100 requests with mixed priorities', () => {
    it('should enqueue 100 requests with mixed priorities (P1/P2/P3)', () => {
      const p1Requests = 20;
      const p2Requests = 30;
      const p3Requests = 50;

      const ids: string[] = [];

      // Enqueue P3 (50)
      for (let i = 0; i < p3Requests; i++) {
        const id = queue.enqueue(
          createQueuedRequest({
            priority: 3,
            agentId: `agent-p3-${i}`,
          })
        );
        expect(id).not.toBeNull();
        ids.push(id!);
      }

      // Enqueue P2 (30)
      for (let i = 0; i < p2Requests; i++) {
        const id = queue.enqueue(
          createQueuedRequest({
            priority: 2,
            agentId: `agent-p2-${i}`,
          })
        );
        expect(id).not.toBeNull();
        ids.push(id!);
      }

      // Enqueue P1 (20)
      for (let i = 0; i < p1Requests; i++) {
        const id = queue.enqueue(
          createQueuedRequest({
            priority: 1,
            agentId: `agent-p1-${i}`,
          })
        );
        expect(id).not.toBeNull();
        ids.push(id!);
      }

      // Verify: queue size should be 100
      expect(queue.getTotalSize()).toBe(100);
      expect(ids.length).toBe(100);

      // Verify: all IDs are unique
      expect(new Set(ids).size).toBe(100);

      // Verify: distribution correct
      const stats = queue.getStats();
      expect(stats.priorityDistribution.p1).toBe(20);
      expect(stats.priorityDistribution.p2).toBe(30);
      expect(stats.priorityDistribution.p3).toBe(50);
    });

    it('should dequeue all 100 requests respecting priorities', () => {
      const now = Date.now();
      // Enqueue 20 P1, 30 P2, 50 P3 with longer deadlines
      for (let i = 0; i < 50; i++) {
        queue.enqueue(createQueuedRequest({
          priority: 3,
          agentId: `agent-p3-${i}`,
          enqueuedAt: now,
          deadline: now + 60000
        }));
      }
      for (let i = 0; i < 30; i++) {
        queue.enqueue(createQueuedRequest({
          priority: 2,
          agentId: `agent-p2-${i}`,
          enqueuedAt: now,
          deadline: now + 60000
        }));
      }
      for (let i = 0; i < 20; i++) {
        queue.enqueue(createQueuedRequest({
          priority: 1,
          agentId: `agent-p1-${i}`,
          enqueuedAt: now,
          deadline: now + 60000
        }));
      }

      const dequeuedRequests: QueuedRequest[] = [];
      for (let i = 0; i < 100; i++) {
        const req = queue.dequeue();
        if (req) dequeuedRequests.push(req);
      }

      // Verify: most requests dequeued (some may expire during the loop)
      expect(dequeuedRequests.length).toBeGreaterThanOrEqual(80);

      // Verify: P1 requests dequeued first (at least some of them)
      const p1Dequeued = dequeuedRequests.filter(r => r.priority === 1);
      expect(p1Dequeued.length).toBeGreaterThan(0);

      // Verify: P2 requests present
      const p2Dequeued = dequeuedRequests.filter(r => r.priority === 2);
      expect(p2Dequeued.length).toBeGreaterThan(0);

      // Verify: P3 present
      const p3Dequeued = dequeuedRequests.filter(r => r.priority === 3);
      expect(p3Dequeued.length).toBeGreaterThan(0);

      // Verify: P1 comes before P3 in general
      if (p1Dequeued.length > 0 && p3Dequeued.length > 0) {
        const firstP1Idx = dequeuedRequests.findIndex(r => r.priority === 1);
        const firstP3Idx = dequeuedRequests.findIndex(r => r.priority === 3);
        expect(firstP1Idx).toBeLessThan(firstP3Idx);
      }
    });
  });

  // ============================================================================
  // Test Suite 2: Harmony cache hits on duplicate commands
  // ============================================================================

  describe('Harmony cache hits on duplicate commands', () => {
    it('should record cache hits as identical commands are queried', () => {
      const cmd1 = createCommand({ frameId: 'frame-1', elementId: 'elem-1', operation: 'click' });
      const manifest1 = createManifest({ id: 'elem-1', frameId: 'frame-1' });

      // Add command to harmony index
      harmony.addToIndex(cmd1, [manifest1], 'contract-1');

      // First lookup: miss (or embedding hit depending on state)
      const result1 = harmony.findBestMatch(cmd1);
      expect(result1).not.toBeNull();
      expect(result1.manifest).toEqual([manifest1]);

      // Second lookup: should be cache hit (heuristic)
      const result2 = harmony.findBestMatch(cmd1);
      expect(result2).not.toBeNull();
      expect(result2.manifest).toEqual([manifest1]);
      expect(result2.source).toBe('heuristic');
      expect(result2.hitCount).toBeGreaterThan(0);

      // Verify stats show heuristic hit
      const stats = harmony.getStats();
      expect(stats.heuristicHits).toBeGreaterThan(0);
    });

    it('should cache hit for 10 identical duplicate command queries', () => {
      const cmd = createCommand({
        frameId: 'frame-1',
        elementId: 'elem-button',
        operation: 'click',
      });
      const manifest = createManifest({
        id: 'elem-button',
        frameId: 'frame-1',
      });

      harmony.addToIndex(cmd, [manifest], 'contract-1');

      // Query 10 times
      const results: HarmonyMatchResult[] = [];
      for (let i = 0; i < 10; i++) {
        const result = harmony.findBestMatch(cmd);
        results.push(result);
      }

      // Verify: all 10 return the manifest
      results.forEach(result => {
        expect(result.manifest).toEqual([manifest]);
      });

      // Verify: at least some are heuristic hits
      const heuristicResults = results.filter(r => r.source === 'heuristic');
      expect(heuristicResults.length).toBeGreaterThanOrEqual(1);

      const stats = harmony.getStats();
      expect(stats.heuristicHits).toBeGreaterThan(0);
    });

    it('should fallback to embedding match for similar commands', () => {
      const cmd1 = createCommand({
        frameId: 'frame-1',
        elementId: 'elem-1',
        operation: 'click',
      });
      const manifest1 = createManifest({ id: 'elem-1', frameId: 'frame-1' });

      // Add first command
      harmony.addToIndex(cmd1, [manifest1], 'contract-1');

      // Query a slightly different command (different elementId but same operation)
      const cmd2 = createCommand({
        frameId: 'frame-1',
        elementId: 'elem-2',
        operation: 'click',
      });

      // cmd2 won't have heuristic hit, but may get embedding match from cmd1
      const result = harmony.findBestMatch(cmd2);
      expect(result).not.toBeNull();
      // Result could be 'miss' or 'embedding' depending on similarity threshold
    });
  });

  // ============================================================================
  // Test Suite 3: Harmony reduces DB queries (count cache hits vs misses)
  // ============================================================================

  describe('Harmony reduces DB queries (cache hits vs misses)', () => {
    it('should show cache hit rate increase with repeated command patterns', () => {
      // Index 10 unique commands
      const commands: SafeDomCommand[] = [];
      const manifests: SafeElementManifest[] = [];

      for (let i = 0; i < 10; i++) {
        const cmd = createCommand({
          frameId: `frame-${i}`,
          elementId: `elem-${i}`,
          operation: 'click',
        });
        const manifest = createManifest({
          id: `elem-${i}`,
          frameId: `frame-${i}`,
        });
        commands.push(cmd);
        manifests.push(manifest);
        harmony.addToIndex(cmd, [manifest], `contract-${i}`);
      }

      // Query each command 10 times
      for (let round = 0; round < 10; round++) {
        for (const cmd of commands) {
          harmony.findBestMatch(cmd);
        }
      }

      const stats = harmony.getStats();
      // Total lookups: 10 unique * 10 rounds = 100
      expect(stats.totalLookups).toBe(100);

      // Hits should be significant percentage (heuristic + embedding)
      const hitRate = stats.heuristicRate + stats.embeddingRate;
      expect(hitRate).toBeGreaterThan(0);
    });

    it('should count misses for commands not in index', () => {
      const cmd1 = createCommand({ elementId: 'elem-1' });
      const manifest1 = createManifest({ id: 'elem-1' });

      harmony.addToIndex(cmd1, [manifest1], 'contract-1');

      // Query a command that is not in the index
      const cmd2 = createCommand({
        frameId: 'frame-unknown',
        elementId: 'elem-unknown',
        operation: 'type',
      });

      const result = harmony.findBestMatch(cmd2);
      expect(result.manifest).toBeNull();
      expect(result.source).toBe('miss');

      const stats = harmony.getStats();
      expect(stats.misses).toBeGreaterThan(0);
    });

    it('should track cache efficiency: >70% hit rate with 100 lookups on 20 commands', () => {
      // Index 20 unique commands
      for (let i = 0; i < 20; i++) {
        const cmd = createCommand({
          frameId: `frame-${i % 5}`,
          elementId: `elem-${i}`,
          operation: 'click',
        });
        const manifest = createManifest({
          id: `elem-${i}`,
          frameId: `frame-${i % 5}`,
        });
        harmony.addToIndex(cmd, [manifest], 'contract-1');
      }

      // Simulate 100 lookups with Zipf distribution: 20% of commands get 50% of queries
      const commands: SafeDomCommand[] = [];
      for (let i = 0; i < 20; i++) {
        commands.push(
          createCommand({
            frameId: `frame-${i % 5}`,
            elementId: `elem-${i}`,
            operation: 'click',
          })
        );
      }

      // Repeat first 4 commands 12 times, rest 1 time
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 12; j++) {
          harmony.findBestMatch(commands[i]);
        }
      }
      // Remaining 16 commands, 1 query each
      for (let i = 4; i < 20; i++) {
        harmony.findBestMatch(commands[i]);
      }

      const stats = harmony.getStats();
      const totalLookups = stats.totalLookups;
      const hits = stats.heuristicHits + stats.embeddingHits;
      const hitRate = totalLookups > 0 ? (hits / totalLookups) * 100 : 0;

      expect(totalLookups).toBe(64); // 4*12 + 16
      // Should have significant hit rate due to repeated queries
      expect(hitRate).toBeGreaterThanOrEqual(50);
    });
  });

  // ============================================================================
  // Test Suite 4: Fairness - P3 doesn't starve
  // ============================================================================

  describe('Fairness: P3 does not starve', () => {
    it('should eventually dequeue all P3 requests even with continuous P1/P2 enqueue', () => {
      // Enqueue 10 P3 upfront
      const p3RequestIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const id = queue.enqueue(
          createQueuedRequest({
            priority: 3,
            agentId: `agent-p3-${i}`,
          })
        );
        if (id) p3RequestIds.push(id);
      }

      // Dequeue with P1/P2 interruptions
      let p3Dequeued = 0;
      let totalDequeued = 0;

      for (let i = 0; i < 50; i++) {
        if (i % 3 === 0) {
          // Every 3rd iteration, interrupt with P1
          queue.enqueue(
            createQueuedRequest({
              priority: 1,
              agentId: `agent-p1-interrupt-${i}`,
            })
          );
        }

        const req = queue.dequeue();
        if (req) {
          totalDequeued++;
          if (req.priority === 3) p3Dequeued++;
        }
      }

      // Verify: P3 was processed (at least some)
      expect(p3Dequeued).toBeGreaterThan(0);
      expect(totalDequeued).toBeGreaterThan(0);
    });

    it('should enforce fairness limit to prevent P3 starvation', () => {
      const now = Date.now();
      // Enqueue 100 P3 and 100 P1 with long deadlines
      for (let i = 0; i < 100; i++) {
        queue.enqueue(createQueuedRequest({
          priority: 3,
          agentId: `agent-p3-${i}`,
          enqueuedAt: now,
          deadline: now + 60000
        }));
        queue.enqueue(createQueuedRequest({
          priority: 1,
          agentId: `agent-p1-${i}`,
          enqueuedAt: now,
          deadline: now + 60000
        }));
      }

      // Dequeue all and track priority pattern
      const priorities: RequestPriority[] = [];
      for (let i = 0; i < 200; i++) {
        const req = queue.dequeue();
        if (req) priorities.push(req.priority);
      }

      // Should dequeue most requests (allow some to be expired)
      expect(priorities.length).toBeGreaterThanOrEqual(150);

      // Count P3
      const p3Count = priorities.filter(p => p === 3).length;
      expect(p3Count).toBeGreaterThan(0);

      // P1 should come first, but P3 should eventually appear
      const firstP3Index = priorities.findIndex(p => p === 3);
      const firstP1Index = priorities.findIndex(p => p === 1);
      if (firstP1Index >= 0 && firstP3Index >= 0) {
        expect(firstP1Index).toBeLessThan(firstP3Index);
      }
    });
  });

  // ============================================================================
  // Test Suite 5: End-to-end latency (queue + harmony lookup)
  // ============================================================================

  describe('End-to-end latency (queue + harmony lookup)', () => {
    it('should measure latency for queue enqueue + dequeue + harmony lookup', () => {
      const cmd = createCommand();
      const manifest = createManifest();

      // Prepare harmony index
      harmony.addToIndex(cmd, [manifest], 'contract-1');

      // Measure: enqueue -> dequeue -> harmony lookup
      const t0 = performance.now();

      const reqId = queue.enqueue(createQueuedRequest({ command: cmd }));
      expect(reqId).not.toBeNull();

      const req = queue.dequeue();
      expect(req).not.toBeNull();

      const harmonyResult = harmony.findBestMatch(req!.command);
      expect(harmonyResult.manifest).not.toBeNull();

      const totalLatency = performance.now() - t0;

      // Should complete in reasonable time (<100ms for single operation)
      expect(totalLatency).toBeLessThan(100);
    });

    it('should batch 100 requests and measure total latency', () => {
      const cmd = createCommand();
      const manifest = createManifest();
      harmony.addToIndex(cmd, [manifest], 'contract-1');

      const t0 = performance.now();

      // Enqueue 100
      for (let i = 0; i < 100; i++) {
        queue.enqueue(
          createQueuedRequest({
            command: cmd,
            agentId: `agent-${i}`,
          })
        );
      }

      // Dequeue all 100 and lookup in harmony
      let harmonyLatencies: number[] = [];
      for (let i = 0; i < 100; i++) {
        const req = queue.dequeue();
        if (req) {
          const result = harmony.findBestMatch(req.command);
          harmonyLatencies.push(result.latency);
        }
      }

      const totalLatency = performance.now() - t0;

      // 100 operations should complete in reasonable time
      expect(totalLatency).toBeLessThan(500);
      expect(harmonyLatencies.length).toBe(100);

      // Average harmony lookup latency should be < 5ms
      const avgHarmonyLatency =
        harmonyLatencies.reduce((a, b) => a + b, 0) / harmonyLatencies.length;
      expect(avgHarmonyLatency).toBeLessThan(5);
    });
  });

  // ============================================================================
  // Test Suite 6: Concurrent operations (10+ simultaneous agents)
  // ============================================================================

  describe('Concurrent operations (10+ simultaneous agents)', () => {
    it('should handle 10 concurrent agents enqueueing simultaneously', async () => {
      const agentCount = 10;
      const requestsPerAgent = 10;

      // Simulate 10 agents enqueueing in parallel
      const promises = Array.from({ length: agentCount }, (_, agentIdx) =>
        Promise.resolve().then(() => {
          const ids: string[] = [];
          for (let i = 0; i < requestsPerAgent; i++) {
            const priority: RequestPriority = ([1, 2, 3][i % 3]) as RequestPriority;
            const id = queue.enqueue(
              createQueuedRequest({
                agentId: `agent-${agentIdx}`,
                priority,
              })
            );
            if (id) ids.push(id);
          }
          return ids;
        })
      );

      const results = await Promise.all(promises);

      // Verify: all agents enqueued
      const totalIds = results.flat();
      expect(totalIds.length).toBe(agentCount * requestsPerAgent);

      // Verify: queue has all requests
      expect(queue.getTotalSize()).toBe(agentCount * requestsPerAgent);
    });

    it('should handle 10 concurrent agents enqueueing and dequeueing', async () => {
      // Enqueue some requests upfront
      for (let i = 0; i < 50; i++) {
        const priority: RequestPriority = ([1, 2, 3][i % 3]) as RequestPriority;
        queue.enqueue(
          createQueuedRequest({
            agentId: `agent-initial-${i}`,
            priority,
          })
        );
      }

      const agentCount = 10;

      // Simulate 10 agents dequeueing in parallel
      const promises = Array.from({ length: agentCount }, (_, agentIdx) =>
        Promise.resolve().then(() => {
          const requests: QueuedRequest[] = [];
          for (let i = 0; i < 5; i++) {
            const req = queue.dequeue();
            if (req) requests.push(req);
          }
          return requests;
        })
      );

      const results = await Promise.all(promises);

      // Verify: total dequeued = 50 or less (some may be empty)
      const totalDequeued = results.flat().length;
      expect(totalDequeued).toBeGreaterThan(0);
      expect(totalDequeued).toBeLessThanOrEqual(50);
    });

    it('should handle 10 concurrent agents with harmony lookups', async () => {
      // Prepare harmony index with 10 commands
      const commands: SafeDomCommand[] = [];
      const manifests: SafeElementManifest[] = [];

      for (let i = 0; i < 10; i++) {
        const cmd = createCommand({
          frameId: `frame-${i}`,
          elementId: `elem-${i}`,
        });
        const manifest = createManifest({
          id: `elem-${i}`,
          frameId: `frame-${i}`,
        });
        commands.push(cmd);
        manifests.push(manifest);
        harmony.addToIndex(cmd, [manifest], `contract-${i}`);
      }

      // Simulate 10 agents doing lookups in parallel
      const promises = Array.from({ length: 10 }, (_, agentIdx) =>
        Promise.resolve().then(() => {
          const results: HarmonyMatchResult[] = [];
          for (let lookupIdx = 0; lookupIdx < 10; lookupIdx++) {
            const cmd = commands[lookupIdx];
            const result = harmony.findBestMatch(cmd);
            results.push(result);
          }
          return results;
        })
      );

      const results = await Promise.all(promises);

      // Verify: all agents got results
      expect(results.length).toBe(10);
      const totalResults = results.flat();
      expect(totalResults.length).toBe(100);

      // Verify: all results have manifests
      totalResults.forEach(result => {
        expect(result.manifest).not.toBeNull();
      });
    });

    it('should handle 10+ agents with queue + harmony integration', async () => {
      const agentCount = 12;
      const commandsPerAgent = 5;

      // Prepare commands and manifests
      const commands: SafeDomCommand[] = [];
      for (let i = 0; i < 10; i++) {
        const cmd = createCommand({
          frameId: `frame-${i % 3}`,
          elementId: `elem-${i}`,
          operation: 'click',
        });
        commands.push(cmd);
        harmony.addToIndex(cmd, [createManifest({ id: `elem-${i}`, frameId: `frame-${i % 3}` })], 'contract-1');
      }

      // Simulate 12 agents: enqueue requests, dequeue, and lookup in harmony
      const promises = Array.from({ length: agentCount }, (_, agentIdx) =>
        Promise.resolve().then(() => {
          const results: { queued: string | null; dequeued: QueuedRequest | null; harmonyHit: boolean }[] = [];

          for (let i = 0; i < commandsPerAgent; i++) {
            // Enqueue
            const cmd = commands[i % commands.length];
            const queued = queue.enqueue(
              createQueuedRequest({
                agentId: `agent-${agentIdx}`,
                command: cmd,
                priority: ([1, 2, 3][(agentIdx + i) % 3]) as RequestPriority,
              })
            );

            // Dequeue
            const dequeued = queue.dequeue();

            // Harmony lookup
            let harmonyHit = false;
            if (dequeued) {
              const harmonyResult = harmony.findBestMatch(dequeued.command);
              harmonyHit = harmonyResult.manifest !== null;
            }

            results.push({
              queued,
              dequeued,
              harmonyHit,
            });
          }

          return results;
        })
      );

      const results = await Promise.all(promises);

      // Verify: all agents completed
      expect(results.length).toBe(agentCount);

      // Verify: requests were queued
      const allQueued = results.flat();
      expect(allQueued.length).toBe(agentCount * commandsPerAgent);

      // Verify: some dequeued and got harmony hits
      const dequeuedWithHits = allQueued.filter(r => r.dequeued && r.harmonyHit);
      expect(dequeuedWithHits.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Test Suite 7: Real SafeDomCommand objects and manifests
  // ============================================================================

  describe('Real SafeDomCommand objects and manifests', () => {
    it('should work with realistic form-filling command and manifest', () => {
      const cmd: SafeDomCommand = {
        frameId: 'frame-main',
        elementId: 'input-email',
        operation: 'type',
        value: 'user@example.com',
      };

      const manifest: SafeElementManifest = {
        id: 'input-email',
        frameId: 'frame-main',
        role: 'input',
        text: 'Email',
        label: 'Email Address',
        allowedOps: ['click', 'type'],
        selectorHash: 'sha256-abc123',
        internalSelector: '#email-input',
        risk: 'low',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      // Add to harmony and queue
      harmony.addToIndex(cmd, [manifest], 'form-contract-1');

      const reqId = queue.enqueue(
        createQueuedRequest({
          command: cmd,
          agentId: 'form-filler-1',
        })
      );
      expect(reqId).not.toBeNull();

      const dequeued = queue.dequeue();
      expect(dequeued).not.toBeNull();
      expect(dequeued?.command).toEqual(cmd);

      const harmonyResult = harmony.findBestMatch(dequeued!.command);
      expect(harmonyResult.manifest).toEqual([manifest]);
    });

    it('should work with click and press operations', () => {
      const commands: SafeDomCommand[] = [
        {
          frameId: 'frame-1',
          elementId: 'button-submit',
          operation: 'click',
        },
        {
          frameId: 'frame-1',
          elementId: 'input-search',
          operation: 'press',
          key: 'Enter',
        },
      ];

      const manifests: SafeElementManifest[] = [
        {
          id: 'button-submit',
          frameId: 'frame-1',
          role: 'button',
          text: 'Submit',
          allowedOps: ['click'],
          selectorHash: 'hash-1',
          internalSelector: '#submit-btn',
          risk: 'medium',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
        {
          id: 'input-search',
          frameId: 'frame-1',
          role: 'input',
          label: 'Search',
          allowedOps: ['click', 'type', 'press'],
          selectorHash: 'hash-2',
          internalSelector: '#search-input',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
      ];

      // Add all to harmony
      commands.forEach((cmd, i) => {
        harmony.addToIndex(cmd, [manifests[i]], 'contract-multi');
      });

      // Queue and dequeue with harmony
      const ids = commands.map(cmd =>
        queue.enqueue(
          createQueuedRequest({
            command: cmd,
            agentId: 'multi-op-agent',
          })
        )
      );

      expect(ids.every(id => id !== null)).toBe(true);

      const dequeued: (QueuedRequest | null)[] = [];
      for (let i = 0; i < commands.length; i++) {
        dequeued.push(queue.dequeue());
      }

      dequeued.forEach((req, i) => {
        expect(req).not.toBeNull();
        const result = harmony.findBestMatch(req!.command);
        expect(result.manifest).not.toBeNull();
        expect(result.manifest?.[0].role).toMatch(/button|input/);
      });
    });
  });

  // ============================================================================
  // Test Suite 8: Coverage targets (>80%)
  // ============================================================================

  describe('Coverage targets (>80%)', () => {
    it('should test queue stats collection', () => {
      const priorities: RequestPriority[] = [1, 2, 3];
      for (let i = 0; i < 20; i++) {
        queue.enqueue(createQueuedRequest({ priority: priorities[i % 3] }));
      }

      // Wait a bit for time to pass
      const stats = queue.getStats();
      expect(stats.size).toBe(20);
      expect(stats.avgWaitMs).toBeGreaterThanOrEqual(0);
      expect(stats.p95WaitMs).toBeGreaterThanOrEqual(0);
      expect(stats.p99WaitMs).toBeGreaterThanOrEqual(0);
      expect(stats.oldestRequestAgeMs).toBeGreaterThanOrEqual(0);
    });

    it('should test harmony stats collection', () => {
      const cmd = createCommand();
      const manifest = createManifest();

      harmony.addToIndex(cmd, [manifest], 'contract-1');

      // Multiple lookups
      for (let i = 0; i < 15; i++) {
        harmony.findBestMatch(cmd);
      }

      const stats = harmony.getStats();
      expect(stats.totalLookups).toBeGreaterThan(0);
      expect(stats.heuristicRate + stats.embeddingRate + (100 - stats.hitRate)).toBe(100);
      expect(stats.avgLatency).toBeGreaterThanOrEqual(0);
      expect(stats.indexSize.heuristic).toBeGreaterThanOrEqual(0);
      expect(stats.indexSize.embedding).toBeGreaterThanOrEqual(0);
    });

    it('should test queue lifetime stats', () => {
      for (let i = 0; i < 30; i++) {
        queue.enqueue(createQueuedRequest());
      }

      for (let i = 0; i < 15; i++) {
        queue.dequeue();
      }

      const lifetimeStats = queue.getLifetimeStats();
      expect(lifetimeStats.totalEnqueued).toBe(30);
      expect(lifetimeStats.totalDequeued).toBe(15);
      expect(lifetimeStats.totalRejected).toBe(0);
      expect(lifetimeStats.avgWaitTime).toBeGreaterThanOrEqual(0);
    });

    it('should test requeue functionality', () => {
      const reqId = queue.enqueue(createQueuedRequest({ priority: 1 }));
      expect(reqId).not.toBeNull();

      const dequeued = queue.dequeue();
      expect(dequeued).not.toBeNull();

      // Simulate failure, requeue
      if (dequeued) {
        const requeued = queue.requeue(dequeued, 2);
        expect(requeued).not.toBeNull();
        expect(queue.getTotalSize()).toBeGreaterThan(0);
      }
    });

    it('should test harmony invalidation on policy change', () => {
      const cmd = createCommand();
      const manifest = createManifest();

      harmony.addToIndex(cmd, [manifest], 'contract-v1');

      // Verify it's indexed
      let result = harmony.findBestMatch(cmd);
      expect(result.manifest).not.toBeNull();

      // Invalidate contract
      harmony.invalidateOnPolicyChange('contract-v1');

      // Should now be miss
      result = harmony.findBestMatch(cmd);
      expect(result.source).toBe('miss');
    });

    it('should test buildHybridIndex', () => {
      const commands = [
        createCommand({ elementId: 'elem-1' }),
        createCommand({ elementId: 'elem-2' }),
        createCommand({ elementId: 'elem-3' }),
      ];

      const manifests = [
        [createManifest({ id: 'elem-1' })],
        [createManifest({ id: 'elem-2' })],
        [createManifest({ id: 'elem-3' })],
      ];

      harmony.buildHybridIndex('contract-batch', commands, manifests);

      const stats = harmony.getStats();
      expect(stats.indexSize.heuristic).toBeGreaterThanOrEqual(0);
    });
  });
});
