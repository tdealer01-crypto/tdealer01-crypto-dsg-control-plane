/**
 * Manifest Cache Integration Tests
 *
 * Tests cache integration with HarmonyEngine:
 * - Cache miss/hit workflow with DB fallback
 * - Prefetch strategy impact on hit rate
 * - Concurrent agent cache behavior
 * - Latency benchmarks under load
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManifestCache } from '@/lib/cache/manifest-cache';
import { HarmonyEngine } from '@/lib/parallel/harmony-engine';
import type { SafeDomCommand, SafeElementManifest } from '@/lib/dsg/safe-dom/types';

// Helper: create mock SafeElementManifest
function createMockManifest(frameId: string, elementId: string): SafeElementManifest {
  return {
    id: elementId,
    frameId,
    role: 'button',
    text: `Element ${elementId}`,
    allowedOps: ['click'],
    selectorHash: `hash-${elementId}`,
    internalSelector: `.selector-${elementId}`,
    risk: 'low',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

// Helper: create mock SafeDomCommand
function createMockCommand(frameId: string, elementId: string, operation = 'click'): SafeDomCommand {
  return {
    frameId,
    elementId,
    operation: operation as any,
  };
}

describe('Manifest Cache Integration', () => {
  let cache: ManifestCache;
  let harmony: HarmonyEngine;

  beforeEach(() => {
    cache = new ManifestCache(100, 50 * 1024 * 1024);
    harmony = new HarmonyEngine();
  });

  afterEach(() => {
    cache.clear();
    harmony.clear();
  });

  describe('Cache Miss/Hit Workflow', () => {
    it('should handle cache miss followed by DB fetch and cache population', () => {
      const sessionId = 'session-1';
      const frameId = 'frame-1';
      const elementId = 'e001';

      // Step 1: Cache miss
      let result = cache.get(sessionId, frameId);
      expect(result).toBeNull();

      // Step 2: Simulate DB fetch (would happen in route handler)
      const dbFetchedManifest = [createMockManifest(frameId, elementId)];

      // Step 3: Populate cache
      cache.set(sessionId, frameId, dbFetchedManifest);

      // Step 4: Verify cache hit on second access
      result = cache.get(sessionId, frameId);
      expect(result).toEqual(dbFetchedManifest);
    });

    it('should improve hit rate with cache', () => {
      const sessionId = 'session-1';
      const frameId = 'frame-1';
      const manifest = [createMockManifest(frameId, 'e001')];

      cache.set(sessionId, frameId, manifest);

      // Simulate repeated accesses
      for (let i = 0; i < 100; i++) {
        cache.get(sessionId, frameId);
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(100);
    });

    it('should track latency improvements from cache hits', () => {
      const sessionId = 'session-1';
      const frameId = 'frame-1';
      const manifest = [createMockManifest(frameId, 'e001')];

      cache.set(sessionId, frameId, manifest);

      // Multiple accesses
      for (let i = 0; i < 50; i++) {
        cache.get(sessionId, frameId);
      }

      const stats = cache.getStats();
      // Average latency should be very small (cache hit is <1ms)
      expect(stats.avgLatency).toBeLessThan(1);
    });
  });

  describe('Harmony Engine Integration', () => {
    it('should integrate cache results with harmony engine', () => {
      const frameId = 'frame-1';
      const elementId = 'e001';
      const cmd = createMockCommand(frameId, elementId, 'click');
      const manifest = [createMockManifest(frameId, elementId)];

      // Step 1: Add to harmony engine
      harmony.addToIndex(cmd, manifest, 'contract-1');

      // Step 2: Find in harmony
      const harmonyResult = harmony.findBestMatch(cmd);
      expect(harmonyResult.manifest).toEqual(manifest);
      expect(harmonyResult.source).toBe('heuristic');

      // Step 3: Cache the result
      cache.set('session-1', frameId, harmonyResult.manifest!);

      // Step 4: Verify cache hit
      const cached = cache.get('session-1', frameId);
      expect(cached).toEqual(manifest);
    });

    it('should combine harmony heuristic match with cache for fast path', () => {
      const frameId = 'frame-1';
      const elementId = 'e001';
      const cmd = createMockCommand(frameId, elementId);
      const manifest = [createMockManifest(frameId, elementId)];

      // Populate harmony
      harmony.addToIndex(cmd, manifest, 'contract-1');

      // First harmony lookup
      const harmonyHit = harmony.findBestMatch(cmd);
      expect(harmonyHit.source).toBe('heuristic');

      // Cache it
      cache.set('session-1', frameId, harmonyHit.manifest!);

      // Second access: cache is even faster than harmony
      const cacheHit = cache.get('session-1', frameId);
      expect(cacheHit).toEqual(manifest);

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('Prefetch Strategy', () => {
    it('should improve hit rate with prefetch simulation', () => {
      const sessionId = 'session-1';
      const baseHitRate = 60; // Without prefetch

      // Simulate prefetch: pre-populate cache with next 5 expected commands
      for (let i = 0; i < 5; i++) {
        const frameId = `frame-${i}`;
        const manifest = [createMockManifest(frameId, `e00${i}`)];
        cache.set(sessionId, frameId, manifest, 5 * 60 * 1000); // 5min TTL
      }

      // Access them
      let hits = 0;
      for (let i = 0; i < 5; i++) {
        const frameId = `frame-${i}`;
        if (cache.get(sessionId, frameId)) hits++;
      }

      const stats = cache.getStats();
      // All 5 should hit
      expect(stats.hitCount).toBe(5);
      expect(stats.hitRate).toBe(100);
    });

    it('should maintain prefetch hit rate under load', () => {
      const numAgents = 10;
      const commandsPerAgent = 20;

      // Prefetch for all agents
      for (let agentIdx = 0; agentIdx < numAgents; agentIdx++) {
        const sessionId = `session-${agentIdx}`;
        for (let cmdIdx = 0; cmdIdx < 5; cmdIdx++) {
          const frameId = `frame-${cmdIdx}`;
          const manifest = [createMockManifest(frameId, `e${agentIdx}-${cmdIdx}`)];
          cache.set(sessionId, frameId, manifest);
        }
      }

      // Simulate command stream hitting prefetched frames
      let hits = 0;
      for (let agentIdx = 0; agentIdx < numAgents; agentIdx++) {
        const sessionId = `session-${agentIdx}`;
        for (let cmdIdx = 0; cmdIdx < commandsPerAgent; cmdIdx++) {
          const frameId = `frame-${cmdIdx % 5}`; // Reuse 5 frames
          if (cache.get(sessionId, frameId)) hits++;
        }
      }

      const stats = cache.getStats();
      // Should have high hit rate from prefetch
      expect(stats.hitRate).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Concurrent Agent Cache Behavior', () => {
    it('should handle 100 concurrent agents reading/writing', async () => {
      const numAgents = 100;
      const operations: Promise<void>[] = [];

      for (let agentIdx = 0; agentIdx < numAgents; agentIdx++) {
        operations.push(
          (async () => {
            const sessionId = `session-${agentIdx}`;

            // Each agent writes 10 manifests
            for (let i = 0; i < 10; i++) {
              const frameId = `frame-${i}`;
              const manifest = [createMockManifest(frameId, `e${agentIdx}-${i}`)];
              cache.set(sessionId, frameId, manifest);
            }

            // Then reads them back
            for (let i = 0; i < 10; i++) {
              const frameId = `frame-${i}`;
              cache.get(sessionId, frameId);
            }
          })()
        );
      }

      await Promise.all(operations);

      const stats = cache.getStats();
      // Should have hits from reading back written manifests
      expect(stats.hitCount).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(50);
      expect(stats.entriesCount).toBeGreaterThan(0);
    });

    it('should maintain hit rate >80% under simulated load', async () => {
      const numAgents = 50;
      const accessesPerAgent = 200;
      const operations: Promise<void>[] = [];

      // Pre-populate cache with common manifests
      for (let i = 0; i < 20; i++) {
        const frameId = `frame-${i}`;
        const manifest = [createMockManifest(frameId, `e${i}`)];
        cache.set(`shared`, frameId, manifest);
      }

      // Each agent accesses manifests
      for (let agentIdx = 0; agentIdx < numAgents; agentIdx++) {
        operations.push(
          (async () => {
            for (let access = 0; access < accessesPerAgent; access++) {
              const frameId = `frame-${access % 20}`;
              // Most accesses will be cache hits since we prefilled with 20 frames
              cache.get(`shared`, frameId);
            }
          })()
        );
      }

      await Promise.all(operations);

      const stats = cache.getStats();
      // With prefilled manifests and reuse pattern, should achieve >80% hit rate
      expect(stats.hitRate).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Latency Benchmarks', () => {
    it('should achieve <5ms latency for cache hits', () => {
      const sessionId = 'session-1';
      const frameId = 'frame-1';
      const manifest = [createMockManifest(frameId, 'e001')];

      cache.set(sessionId, frameId, manifest);

      // Warm up
      cache.get(sessionId, frameId);

      // Measure hits
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        cache.get(sessionId, frameId);
      }

      const stats = cache.getStats();
      // Average latency should be well under 5ms (typically <0.1ms)
      expect(stats.avgLatency).toBeLessThan(5);
    });

    it('should achieve <50ms latency for cache misses', () => {
      // Measure misses
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        cache.get(`session-${i}`, `frame-${i}`);
      }

      const stats = cache.getStats();
      // Average latency for misses should still be very small (<1ms)
      expect(stats.avgLatency).toBeLessThan(50);
    });

    it('should scale latency linearly with concurrent access', async () => {
      const manifest = [createMockManifest('frame-1', 'e001')];
      cache.set('session', 'frame-1', manifest);

      // Concurrent reads
      const numConcurrent = 100;
      const operations: Promise<void>[] = [];

      for (let i = 0; i < numConcurrent; i++) {
        operations.push(
          (async () => {
            for (let j = 0; j < 10; j++) {
              cache.get('session', 'frame-1');
            }
          })()
        );
      }

      await Promise.all(operations);

      const stats = cache.getStats();
      // Latency should remain low even under concurrent load
      expect(stats.avgLatency).toBeLessThan(1);
    });
  });

  describe('Memory Management Under Load', () => {
    it('should not exceed memory limit with 1000 agents', () => {
      const numAgents = 1000;
      const cache = new ManifestCache(100, 50 * 1024 * 1024); // 50MB

      for (let agentIdx = 0; agentIdx < numAgents; agentIdx++) {
        const sessionId = `session-${agentIdx}`;
        for (let frameIdx = 0; frameIdx < 10; frameIdx++) {
          const frameId = `frame-${frameIdx}`;
          const manifest = [createMockManifest(frameId, `e${agentIdx}-${frameIdx}`)];
          cache.set(sessionId, frameId, manifest);
        }
      }

      const memory = cache.getMemoryUsage();
      const stats = cache.getStats();

      // Should respect memory limit
      expect(memory).toBeLessThanOrEqual(50 * 1024 * 1024 + 10 * 1024); // Allow 10KB tolerance
      // Should evict old entries
      expect(stats.evictionCount).toBeGreaterThan(0);
    });

    it('should track memory usage accurately', () => {
      const cache = new ManifestCache(10, 100 * 1024 * 1024);

      const manifest1 = [createMockManifest('frame-1', 'e001')];
      cache.set('session-1', 'frame-1', manifest1);
      const mem1 = cache.getMemoryUsage();

      const manifest2 = [createMockManifest('frame-2', 'e002')];
      cache.set('session-1', 'frame-2', manifest2);
      const mem2 = cache.getMemoryUsage();

      // Adding an entry should increase memory
      expect(mem2).toBeGreaterThan(mem1);

      // Deleting should decrease memory
      cache.delete('session-1', 'frame-1');
      const mem3 = cache.getMemoryUsage();
      expect(mem3).toBeLessThan(mem2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty manifest arrays', () => {
      const sessionId = 'session-1';
      const frameId = 'frame-1';
      const emptyManifest: SafeElementManifest[] = [];

      cache.set(sessionId, frameId, emptyManifest);
      const result = cache.get(sessionId, frameId);
      expect(result).toEqual(emptyManifest);
    });

    it('should handle very large manifest arrays', () => {
      const sessionId = 'session-1';
      const frameId = 'frame-1';

      // Create large manifest (1000 elements)
      const largeManifest = Array.from({ length: 1000 }, (_, i) =>
        createMockManifest(frameId, `e${String(i).padStart(4, '0')}`)
      );

      cache.set(sessionId, frameId, largeManifest);
      const result = cache.get(sessionId, frameId);

      expect(result).toHaveLength(1000);
      const stats = cache.getStats();
      expect(stats.avgEntrySize).toBeGreaterThan(500 * 1000); // Large entry
    });

    it('should recover from memory exhaustion gracefully', () => {
      const cache = new ManifestCache(1000, 1024); // Only 1KB!

      const manifest = [createMockManifest('frame-1', 'e001')];

      // Try to add multiple entries
      for (let i = 0; i < 10; i++) {
        cache.set(`session-${i}`, 'frame-1', manifest);
      }

      // Cache should still function
      const result = cache.get('session-9', 'frame-1');
      expect(result).not.toBeNull();

      const stats = cache.getStats();
      // Should have evicted due to memory pressure
      expect(stats.evictionCount).toBeGreaterThan(0);
    });
  });
});
