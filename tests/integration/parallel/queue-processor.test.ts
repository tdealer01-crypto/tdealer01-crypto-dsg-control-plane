/**
 * Integration tests for queue processor
 * Tests the async processing loop: dequeue → harmony → verify → audit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { requestQueue } from '@/lib/performance/request-queue';
import { harmonyEngine } from '@/lib/parallel/harmony-engine';
import { getProcessorStats } from '@/lib/parallel/queue-processor';
import type { SafeDomCommand } from '@/lib/dsg/safe-dom/types';

describe('Queue Processor Integration', () => {
  beforeEach(() => {
    requestQueue.clear();
    harmonyEngine.clear();
  });

  afterEach(() => {
    requestQueue.clear();
    harmonyEngine.clear();
  });

  /**
   * Queue processor should dequeue and process requests asynchronously
   */
  it('should dequeue requests from queue', async () => {
    const command: SafeDomCommand = {
      frameId: 'frame-001',
      elementId: 'e001',
      operation: 'click',
    };

    // Enqueue a request
    const requestId = requestQueue.enqueue({
      priority: 3,
      agentId: 'agent-1',
      delegationId: 'delegation-1',
      command,
      enqueuedAt: Date.now(),
      deadline: Date.now() + 30_000,
    });

    expect(requestId).toBeTruthy();

    // Dequeue should return the request
    const dequeuedRequest = requestQueue.dequeue();

    expect(dequeuedRequest).toBeTruthy();
    expect(dequeuedRequest?.id).toBe(requestId);
    expect(dequeuedRequest?.agentId).toBe('agent-1');
  });

  /**
   * Harmony engine should cache manifest lookups
   */
  it('should cache manifest lookups in harmony engine', () => {
    const command: SafeDomCommand = {
      frameId: 'frame-001',
      elementId: 'e001',
      operation: 'click',
    };

    // First lookup should miss
    const result1 = harmonyEngine.findBestMatch(command);
    expect(result1.source).toBe('miss');
    expect(result1.manifest).toBeNull();

    // Add manifest to index
    const mockManifest = [
      {
        id: 'e001',
        frameId: 'frame-001',
        role: 'button' as const,
        allowedOps: ['click'],
        selectorHash: 'hash-001',
        internalSelector: '#button-1',
        risk: 'low' as const,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      },
    ];

    harmonyEngine.addToIndex(command, mockManifest, 'contract-1');

    // Second lookup should hit heuristic cache
    const result2 = harmonyEngine.findBestMatch(command);
    expect(result2.source).toBe('heuristic');
    expect(result2.manifest).toEqual(mockManifest);
    expect(result2.latency).toBeLessThan(10); // Should be <10ms
  });

  /**
   * Harmony engine should report statistics
   */
  it('should track harmony engine statistics', () => {
    const command: SafeDomCommand = {
      frameId: 'frame-001',
      elementId: 'e001',
      operation: 'click',
    };

    // Add manifest and lookup
    const mockManifest = [
      {
        id: 'e001',
        frameId: 'frame-001',
        role: 'button' as const,
        allowedOps: ['click'],
        selectorHash: 'hash-001',
        internalSelector: '#button-1',
        risk: 'low' as const,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      },
    ];

    harmonyEngine.addToIndex(command, mockManifest, 'contract-1');

    // Lookup multiple times
    harmonyEngine.findBestMatch(command);
    harmonyEngine.findBestMatch(command);
    harmonyEngine.findBestMatch(command);

    const stats = harmonyEngine.getStats();

    expect(stats.totalLookups).toBe(3);
    expect(stats.heuristicHits).toBe(3);
    expect(stats.hitRate).toBe(100);
  });

  /**
   * Queue async processor should yield requests when available
   */
  it('should async process queue with backpressure', async () => {
    const command: SafeDomCommand = {
      frameId: 'frame-001',
      elementId: 'e001',
      operation: 'click',
    };

    // Enqueue 3 requests
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const id = requestQueue.enqueue({
        priority: 3,
        agentId: `agent-${i}`,
        delegationId: `delegation-${i}`,
        command,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30_000,
      });

      if (id) ids.push(id);
    }

    expect(ids.length).toBe(3);

    // Process queue asynchronously (limited to 3 items for this test)
    const processed = [];
    let count = 0;

    for await (const request of requestQueue.processQueueAsync()) {
      processed.push(request);
      count++;

      if (count >= 3) break;
    }

    expect(processed.length).toBe(3);
    expect(processed.map((r) => r.id)).toEqual(ids);
  });

  /**
   * Processor should handle multiple agents without interference
   */
  it('should handle multiple agents independently', async () => {
    const command: SafeDomCommand = {
      frameId: 'frame-001',
      elementId: 'e001',
      operation: 'click',
    };

    // Enqueue requests from different agents
    const agentIds = ['agent-1', 'agent-2', 'agent-3'];
    const enqueuedIds = [];

    for (const agentId of agentIds) {
      const id = requestQueue.enqueue({
        priority: 3,
        agentId,
        delegationId: `delegation-${agentId}`,
        command,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30_000,
      });

      if (id) enqueuedIds.push(id);
    }

    expect(enqueuedIds.length).toBe(3);

    // Dequeue and verify agent isolation
    for (const expectedAgentId of agentIds) {
      const request = requestQueue.dequeue();
      expect(request).toBeTruthy();
      expect(request?.agentId).toBe(expectedAgentId);
    }
  });

  /**
   * Processor should respect deadlines (timeout enforcement)
   */
  it('should respect request deadlines', async () => {
    const command: SafeDomCommand = {
      frameId: 'frame-001',
      elementId: 'e001',
      operation: 'click',
    };

    const now = Date.now();

    // Enqueue expired request
    requestQueue.enqueue({
      priority: 3,
      agentId: 'agent-1',
      delegationId: 'delegation-1',
      command,
      enqueuedAt: now - 40_000,
      deadline: now - 10_000, // Expired
    });

    // Enqueue valid request
    const validId = requestQueue.enqueue({
      priority: 3,
      agentId: 'agent-2',
      delegationId: 'delegation-2',
      command,
      enqueuedAt: now,
      deadline: now + 30_000,
    });

    // Dequeue should skip expired
    const request = requestQueue.dequeue();

    expect(request).toBeTruthy();
    expect(request?.id).toBe(validId);
    expect(request?.agentId).toBe('agent-2');
  });

  /**
   * Processor statistics should accumulate correctly
   */
  it('should track processor statistics', () => {
    const command: SafeDomCommand = {
      frameId: 'frame-001',
      elementId: 'e001',
      operation: 'click',
    };

    // Enqueue requests
    for (let i = 0; i < 5; i++) {
      requestQueue.enqueue({
        priority: 3,
        agentId: `agent-${i}`,
        delegationId: `delegation-${i}`,
        command,
        enqueuedAt: Date.now(),
        deadline: Date.now() + 30_000,
      });
    }

    const stats = requestQueue.getStats();

    expect(stats.size).toBe(5);
    expect(stats.priorityDistribution.p1).toBe(0);
    expect(stats.priorityDistribution.p2).toBe(0);
    expect(stats.priorityDistribution.p3).toBe(5);
  });

  /**
   * Processor should handle re-queueing on failure
   */
  it('should requeue failed requests with bumped priority', () => {
    const command: SafeDomCommand = {
      frameId: 'frame-001',
      elementId: 'e001',
      operation: 'click',
    };

    const originalId = requestQueue.enqueue({
      priority: 3,
      agentId: 'agent-1',
      delegationId: 'delegation-1',
      command,
      enqueuedAt: Date.now(),
      deadline: Date.now() + 30_000,
    });

    const request = requestQueue.dequeue();
    expect(request).toBeTruthy();

    // Simulate failure and requeue
    const requeuedId = requestQueue.requeue(request!);

    expect(requeuedId).toBeTruthy();
    expect(requeuedId).not.toEqual(originalId);

    // Requeued request should have bumped priority (3 → 2)
    const requeuedRequest = requestQueue.dequeue();
    expect(requeuedRequest?.priority).toBe(2);
  });

  /**
   * End-to-end: request → harmony engine → stats accumulation
   */
  it('should handle end-to-end flow with harmony engine', () => {
    const command: SafeDomCommand = {
      frameId: 'frame-001',
      elementId: 'e001',
      operation: 'click',
    };

    const mockManifest = [
      {
        id: 'e001',
        frameId: 'frame-001',
        role: 'button' as const,
        allowedOps: ['click'],
        selectorHash: 'hash-001',
        internalSelector: '#button-1',
        risk: 'low' as const,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      },
    ];

    // Pre-populate harmony cache
    harmonyEngine.addToIndex(command, mockManifest, 'contract-1');

    // Enqueue request
    const requestId = requestQueue.enqueue({
      priority: 2,
      agentId: 'agent-1',
      delegationId: 'delegation-1',
      command,
      enqueuedAt: Date.now(),
      deadline: Date.now() + 30_000,
    });

    expect(requestId).toBeTruthy();

    // Dequeue
    const request = requestQueue.dequeue();
    expect(request).toBeTruthy();

    // Harmony lookup should hit cache
    const harmonyResult = harmonyEngine.findBestMatch(command);
    expect(harmonyResult.source).toBe('heuristic');
    expect(harmonyResult.manifest).toEqual(mockManifest);

    // Stats should show cache hit
    const harmonyStats = harmonyEngine.getStats();
    expect(harmonyStats.heuristicHits).toBeGreaterThan(0);
  });
});
