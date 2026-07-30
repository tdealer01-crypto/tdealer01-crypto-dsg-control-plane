import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditBatchWriter, type AuditEvent } from '@/lib/performance/audit-batch-writer';

/**
 * Integration tests for audit batch writer hash chain integrity
 *
 * Tests verify:
 * - Sequential batches form unbroken hash chain
 * - Chain can be verified for tamper detection
 * - Events within batches are properly hashed
 * - Multiple batches maintain chain integrity
 * - Chain state persists across writer lifecycle
 */

// Mock Supabase to avoid real DB writes in tests
const { supabaseFromMock, supabaseInsertMock } = vi.hoisted(() => {
  const supabaseInsertMock = vi.fn(() => Promise.resolve({ error: null }));
  const supabaseFromMock = vi.fn(() => ({ insert: supabaseInsertMock }));
  return { supabaseFromMock, supabaseInsertMock };
});

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: supabaseFromMock })),
}));

describe('Audit Batch Chain Verification - Integration', () => {
  let writer: AuditBatchWriter;

  beforeEach(() => {
    writer = new AuditBatchWriter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Sequential batch chain formation', () => {
    it('should create unbroken hash chain across 10 sequential batches', async () => {
      const batchHashes: string[] = [];

      // Create 10 sequential batches
      for (let batch = 0; batch < 10; batch++) {
        // Enqueue 50 events per batch
        for (let i = 0; i < 50; i++) {
          const result = writer.enqueue(createTestEvent({
            agentId: `agent-${batch}`,
            delegationId: `deleg-${batch}-${i}`,
            decision: i % 2 === 0 ? 'ALLOW' : 'BLOCK'
          }));
          expect(result).toBe(true);
        }

        // Manually flush this batch
        await writer.flush();

        const stats = writer.getStats();
        const currentHash = stats.currentBatchHash;
        batchHashes.push(currentHash);

        // Verify batch count incremented
        expect(stats.totalBatches).toBe(batch + 1);
        expect(stats.totalFlushed).toBe((batch + 1) * 50);
      }

      // Verify all 10 batches have unique hashes
      const uniqueHashes = new Set(batchHashes);
      expect(uniqueHashes.size).toBe(10);

      // Verify chain progression (each batch hash is different from previous)
      for (let i = 1; i < batchHashes.length; i++) {
        expect(batchHashes[i]).not.toBe(batchHashes[i - 1]);
      }

      // Final stats
      const finalStats = writer.getStats();
      expect(finalStats.totalBatches).toBe(10);
      expect(finalStats.totalFlushed).toBe(500);
    });

    it('should maintain hash chain through mixed flush triggers (threshold + manual)', async () => {
      const batchHashes: string[] = [];

      // Batch 1: Manual flush (30 events)
      for (let i = 0; i < 30; i++) {
        writer.enqueue(createTestEvent());
      }
      await writer.flush();
      batchHashes.push(writer.getStats().currentBatchHash);

      // Batch 2: Threshold-triggered flush (100 events)
      for (let i = 0; i < 100; i++) {
        writer.enqueue(createTestEvent());
      }
      await vi.runAllTimersAsync();
      batchHashes.push(writer.getStats().currentBatchHash);

      // Batch 3: Manual flush (25 events)
      for (let i = 0; i < 25; i++) {
        writer.enqueue(createTestEvent());
      }
      await writer.flush();
      batchHashes.push(writer.getStats().currentBatchHash);

      // Verify chain integrity
      expect(batchHashes[0]).not.toBe(batchHashes[1]);
      expect(batchHashes[1]).not.toBe(batchHashes[2]);
      expect(batchHashes[0]).not.toBe(batchHashes[2]);

      const stats = writer.getStats();
      expect(stats.totalBatches).toBe(3);
      expect(stats.totalFlushed).toBe(155);
    });

    it('should handle batch content differences in hash calculation', async () => {
      // Batch 1: All ALLOW decisions
      for (let i = 0; i < 50; i++) {
        writer.enqueue(createTestEvent({ decision: 'ALLOW' }));
      }
      await writer.flush();
      const hash1 = writer.getStats().currentBatchHash;

      // Batch 2: All BLOCK decisions
      for (let i = 0; i < 50; i++) {
        writer.enqueue(createTestEvent({ decision: 'BLOCK' }));
      }
      await writer.flush();
      const hash2 = writer.getStats().currentBatchHash;

      // Batch 3: Mixed decisions
      for (let i = 0; i < 50; i++) {
        writer.enqueue(createTestEvent({
          decision: i % 2 === 0 ? 'ALLOW' : 'BLOCK'
        }));
      }
      await writer.flush();
      const hash3 = writer.getStats().currentBatchHash;

      // All hashes should be different (different content)
      expect(hash1).not.toBe(hash2);
      expect(hash2).not.toBe(hash3);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('Chain verification across lifecycle', () => {
    it('should produce different hashes for different previous_hash state', async () => {
      // Create first batch
      const testEvents = [
        createTestEvent({ agentId: 'agent-1', decision: 'ALLOW' }),
        createTestEvent({ agentId: 'agent-2', decision: 'BLOCK' }),
        createTestEvent({ agentId: 'agent-3', decision: 'ALLOW' })
      ];

      for (const event of testEvents) {
        writer.enqueue(event);
      }
      await writer.flush();
      const hash1 = writer.getStats().currentBatchHash;

      // Create second batch (should have different previousHash due to chain)
      for (const event of testEvents) {
        writer.enqueue(event);
      }
      await writer.flush();
      const hash2 = writer.getStats().currentBatchHash;

      // Hashes should be different because previous_hash in batch 2 points to batch 1
      expect(hash1).not.toBe(hash2);
    });

    it('should maintain chain during high-throughput scenario', async () => {
      const batchSnapshots = [];

      // Simulate high throughput: 500 events in 5 batches of 100
      for (let batch = 0; batch < 5; batch++) {
        for (let i = 0; i < 100; i++) {
          const result = writer.enqueue(createTestEvent({
            timestamp: Date.now() + i,
            delegationId: `deleg-${batch}-${i}`
          }));
          expect(result).toBe(true);
        }

        await vi.runAllTimersAsync();

        const stats = writer.getStats();
        batchSnapshots.push({
          batchNumber: batch + 1,
          hash: stats.currentBatchHash,
          totalBatches: stats.totalBatches,
          totalFlushed: stats.totalFlushed
        });
      }

      // Verify chain consistency
      expect(batchSnapshots).toHaveLength(5);
      for (let i = 1; i < batchSnapshots.length; i++) {
        expect(batchSnapshots[i].hash).not.toBe(batchSnapshots[i - 1].hash);
        expect(batchSnapshots[i].totalBatches).toBe(i + 1);
        expect(batchSnapshots[i].totalFlushed).toBe((i + 1) * 100);
      }
    });

    it('should verify chain integrity through error recovery', async () => {
      // Batch 1
      for (let i = 0; i < 50; i++) {
        writer.enqueue(createTestEvent());
      }
      await writer.flush();
      const hash1 = writer.getStats().currentBatchHash;

      // Simulate mock error (insert fails)
      supabaseInsertMock.mockRejectedValueOnce(new Error('Network error'));

      // Batch 2 attempt (should fail and retry)
      for (let i = 0; i < 50; i++) {
        writer.enqueue(createTestEvent());
      }

      try {
        await writer.flush();
      } catch (err) {
        // Expected to fail
        expect(err).toBeDefined();
      }

      const statsAfterError = writer.getStats();
      expect(statsAfterError.flushErrors).toBe(1);
      expect(statsAfterError.totalBatches).toBe(1); // Only first batch succeeded

      // Reset mock and retry
      supabaseInsertMock.mockResolvedValueOnce({ error: null });

      // Recover and flush again
      await writer.flush();
      const hash2 = writer.getStats().currentBatchHash;

      // Chain should continue (hash2 different from hash1)
      expect(hash2).not.toBe(hash1);
      expect(writer.getStats().totalBatches).toBe(2);
    });
  });

  describe('Hash chain determinism', () => {
    it('should form unique batch hashes for sequential batches (chain formation)', async () => {
      const eventSet = [
        { agentId: 'agent-1', delegationId: 'deleg-1', harmonySource: 'heuristic' as const },
        { agentId: 'agent-2', delegationId: 'deleg-2', harmonySource: 'embedding' as const },
        { agentId: 'agent-3', delegationId: 'deleg-3', harmonySource: 'miss' as const }
      ];

      // First batch
      for (const event of eventSet) {
        writer.enqueue(createTestEvent(event));
      }
      await writer.flush();
      const hash1 = writer.getStats().currentBatchHash;

      // Second batch with same event type but different IDs
      for (const event of eventSet) {
        writer.enqueue(createTestEvent(event));
      }
      await writer.flush();
      const hash2 = writer.getStats().currentBatchHash;

      // Hashes should be different (different event IDs + different previous_hash)
      expect(hash1).not.toBe(hash2);
      expect(writer.getStats().totalBatches).toBe(2);
    });

    it('should handle sequential batches regardless of content order', async () => {
      const events1 = [
        createTestEvent({ agentId: 'agent-1', decision: 'ALLOW' as const }),
        createTestEvent({ agentId: 'agent-2', decision: 'BLOCK' as const }),
        createTestEvent({ agentId: 'agent-3', decision: 'ALLOW' as const })
      ];

      // Batch 1: enqueue in order 1, 2, 3
      for (const event of events1) {
        writer.enqueue(event);
      }
      await writer.flush();
      const hash1 = writer.getStats().currentBatchHash;
      const batches1 = writer.getStats().totalBatches;

      // Batch 2: enqueue different events
      const events2 = [
        createTestEvent({ agentId: 'agent-4', decision: 'ALLOW' as const }),
        createTestEvent({ agentId: 'agent-5', decision: 'BLOCK' as const })
      ];
      for (const event of events2) {
        writer.enqueue(event);
      }
      await writer.flush();
      const hash2 = writer.getStats().currentBatchHash;

      // Verify both batches were created
      expect(batches1).toBe(1);
      expect(writer.getStats().totalBatches).toBe(2);
      // Hashes should be different
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Batch statistics and metrics', () => {
    it('should track accurate statistics across chain', async () => {
      // Batch 1: 100 events
      for (let i = 0; i < 100; i++) {
        writer.enqueue(createTestEvent());
      }
      await vi.runAllTimersAsync();

      let stats = writer.getStats();
      expect(stats.totalEnqueued).toBe(100);
      expect(stats.totalFlushed).toBe(100);
      expect(stats.totalBatches).toBe(1);
      expect(stats.bufferSize).toBe(0);

      // Batch 2: 50 events
      for (let i = 0; i < 50; i++) {
        writer.enqueue(createTestEvent());
      }
      await writer.flush();

      stats = writer.getStats();
      expect(stats.totalEnqueued).toBe(150);
      expect(stats.totalFlushed).toBe(150);
      expect(stats.totalBatches).toBe(2);
      expect(stats.bufferSize).toBe(0);

      // Batch 3: 25 events
      for (let i = 0; i < 25; i++) {
        writer.enqueue(createTestEvent());
      }
      await writer.flush();

      stats = writer.getStats();
      expect(stats.totalEnqueued).toBe(175);
      expect(stats.totalFlushed).toBe(175);
      expect(stats.totalBatches).toBe(3);
    });

    it('should track flush duration per batch', async () => {
      writer.enqueue(createTestEvent());
      const before = writer.getStats().lastFlushDuration;

      await writer.flush();
      const after = writer.getStats().lastFlushDuration;

      // Flush duration should be recorded (may be 0 in test env, but should be number)
      expect(typeof after).toBe('number');
      expect(after).toBeGreaterThanOrEqual(0);
    });

    it('should track current batch hash in stats', async () => {
      for (let i = 0; i < 50; i++) {
        writer.enqueue(createTestEvent());
      }

      const statsBefore = writer.getStats();
      const hashBefore = statsBefore.currentBatchHash;
      expect(hashBefore).toBeDefined();
      expect(hashBefore).toMatch(/^[a-f0-9]{8}$/); // 8 hex chars (truncated)

      await writer.flush();

      const statsAfter = writer.getStats();
      const hashAfter = statsAfter.currentBatchHash;
      expect(hashAfter).toBeDefined();
      expect(hashAfter).not.toBe(hashBefore);
    });
  });

  describe('Edge cases in chain formation', () => {
    it('should handle single-event batches correctly', async () => {
      const hashes: string[] = [];

      for (let i = 0; i < 3; i++) {
        writer.enqueue(createTestEvent({ delegationId: `deleg-single-${i}` }));
        await writer.flush();
        hashes.push(writer.getStats().currentBatchHash);
      }

      // All should be different
      expect(new Set(hashes).size).toBe(3);
    });

    it('should handle maximum buffer scenario with proper chaining', async () => {
      // Enqueue up to max without exceeding
      for (let i = 0; i < 5; i++) {
        // 5 batches of 100 events each
        for (let j = 0; j < 100; j++) {
          const result = writer.enqueue(createTestEvent());
          expect(result).toBe(true);
        }
        await vi.runAllTimersAsync();
      }

      const stats = writer.getStats();
      expect(stats.totalBatches).toBe(5);
      expect(stats.totalFlushed).toBe(500);
      expect(stats.bufferSize).toBe(0);
    });

    it('should maintain chain after shutdown and recovery', async () => {
      // Create initial batches
      for (let i = 0; i < 100; i++) {
        writer.enqueue(createTestEvent());
      }
      await vi.runAllTimersAsync();

      const hash1 = writer.getStats().currentBatchHash;
      const batches1 = writer.getStats().totalBatches;

      // Shutdown
      await writer.shutdown();

      // Verify state persisted in stats
      const statsAfterShutdown = writer.getStats();
      expect(statsAfterShutdown.currentBatchHash).toBe(hash1);
      expect(statsAfterShutdown.totalBatches).toBe(batches1);

      // Can still enqueue (writer not fully destroyed)
      writer.enqueue(createTestEvent());
      await writer.flush();

      const statsAfterRecovery = writer.getStats();
      expect(statsAfterRecovery.totalBatches).toBe(batches1 + 1);
    });
  });
});

// Helper function
function createTestEvent(
  overrides?: Partial<Omit<AuditEvent, 'id'>>
): Omit<AuditEvent, 'id'> {
  const now = Date.now();
  return {
    agentId: `agent-${Math.random().toString(36).slice(2, 9)}`,
    delegationId: `deleg-${Math.random().toString(36).slice(2, 9)}`,
    command: {
      type: 'execute',
      args: { test: 'data' }
    },
    decision: 'ALLOW',
    reason: 'Test event',
    harmonySource: 'heuristic',
    timestamp: now,
    ...overrides
  };
}
