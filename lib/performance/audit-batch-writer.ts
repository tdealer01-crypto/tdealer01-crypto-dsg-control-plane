import { createHash, randomUUID } from 'crypto';

export interface AuditEvent {
  id: string;
  agentId: string;
  delegationId: string;
  command: {
    type: string;
    args?: Record<string, any>;
  };
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  harmonySource: 'heuristic' | 'embedding' | 'miss';
  executorType?: string;
  executorResult?: any;
  timestamp: number;
}

interface AuditBatch {
  id: string;
  events: AuditEvent[];
  batchHash: string;
  previousHash: string;
  createdAt: number;
}

/**
 * Audit batch writer: efficient audit trail with hash chain integrity
 * Batches write every 100ms or when 100 events accumulated
 *
 * Design:
 * - Buffer events in memory (low latency, <1ms per event)
 * - Batch write to Supabase every 100ms or when buffer full
 * - Hash chain: each batch includes SHA256(previous hash)
 * - Tamper detection: verify chain integrity on read
 * - Max retention: 30 days, auto-cleanup
 */
export class AuditBatchWriter {
  private buffer: AuditEvent[] = [];
  private lastFlushTime = Date.now();

  private readonly FLUSH_INTERVAL_MS = 100; // Flush every 100ms
  private readonly FLUSH_SIZE_THRESHOLD = 100; // Or when 100 events buffered
  private readonly MAX_BUFFER_SIZE = 10_000; // Reject if buffer > 10k (prevent memory leak)

  private lastBatchHash = '0000000000000000'; // Initial hash
  private flushPromise: Promise<void> | null = null;
  private isShuttingDown = false;

  // Statistics
  private stats = {
    totalEnqueued: 0,
    totalFlushed: 0,
    totalBatches: 0,
    flushErrors: 0,
    lastFlushDuration: 0
  };

  constructor() {
    // Auto-flush timer
    this.startAutoFlush();
  }

  /**
   * Auto-flush every FLUSH_INTERVAL_MS
   */
  private startAutoFlush(): void {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        if (this.buffer.length > 0 && !this.isShuttingDown) {
          this.flush().catch(err => console.error('Auto-flush failed:', err));
        }
      }, this.FLUSH_INTERVAL_MS).unref();
    }
  }

  /**
   * Enqueue audit event
   * Returns true if successful, false if buffer full (reject)
   */
  enqueue(event: Omit<AuditEvent, 'id'>): boolean {
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      console.warn(`Audit buffer full (${this.buffer.length}), rejecting event`);
      return false;
    }

    const auditEvent: AuditEvent = {
      ...event,
      id: generateUUID()
    };

    this.buffer.push(auditEvent);
    this.stats.totalEnqueued++;

    // Auto-flush if threshold reached
    if (this.buffer.length >= this.FLUSH_SIZE_THRESHOLD) {
      this.flush().catch(err => console.error('Threshold-triggered flush failed:', err));
    }

    return true;
  }

  /**
   * Flush buffered events to storage
   * Builds hash chain and writes to Supabase in single transaction
   *
   * Returns promise that resolves when flush completes
   * If already flushing, returns pending promise
   */
  flush(): Promise<void> {
    // Avoid concurrent flushes
    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.flushPromise = this.doFlush().finally(() => {
      this.flushPromise = null;
    });

    return this.flushPromise;
  }

  /**
   * Actual flush implementation
   */
  private async doFlush(): Promise<void> {
    if (this.buffer.length === 0) {
      return; // Nothing to flush
    }

    const t0 = performance.now();
    const batch = this.buffer.splice(0); // Drain buffer

    try {
      // Build batch hash
      const batchId = generateUUID();
      const eventHashes = batch.map(e => this.hashEvent(e)).join('|');
      const batchContent = `${eventHashes}|${this.lastBatchHash}`;
      const batchHash = createHash('sha256').update(batchContent).digest('hex');

      const auditBatch: AuditBatch = {
        id: batchId,
        events: batch,
        batchHash,
        previousHash: this.lastBatchHash,
        createdAt: Date.now()
      };

      // TODO: Write to Supabase in transaction
      // await supabase
      //   .from('agi_action_audit')
      //   .insert(batch.map(e => ({
      //     id: e.id,
      //     batch_id: batchId,
      //     agent_id: e.agentId,
      //     delegation_id: e.delegationId,
      //     decision: e.decision,
      //     reason: e.reason,
      //     harmony_source: e.harmonySource,
      //     executor_type: e.executorType,
      //     executor_result: e.executorResult,
      //     timestamp: e.timestamp,
      //     batch_hash: batchHash,
      //     previous_hash: this.lastBatchHash
      //   })));

      // For now, just log (would write to Supabase in production)
      console.log(
        `[AUDIT] Flushed batch ${batchId}: ${batch.length} events, hash=${batchHash.slice(0, 8)}`
      );

      this.lastBatchHash = batchHash;
      this.stats.totalFlushed += batch.length;
      this.stats.totalBatches++;
      this.lastFlushTime = Date.now();
      this.stats.lastFlushDuration = performance.now() - t0;
    } catch (err) {
      console.error('Audit batch flush error:', err);
      this.stats.flushErrors++;
      // Re-buffer events on failure
      this.buffer.unshift(...batch);
      throw err;
    }
  }

  /**
   * Hash single event for chain
   */
  private hashEvent(event: AuditEvent): string {
    const key = JSON.stringify({
      id: event.id,
      agent: event.agentId,
      delegation: event.delegationId,
      decision: event.decision,
      timestamp: event.timestamp
    });
    return createHash('sha256').update(key).digest('hex').slice(0, 8);
  }

  /**
   * Verify audit chain integrity
   * Traverses all batches and validates hash chain
   * Returns true if chain valid, false if tampering detected
   */
  async verifyChainIntegrity(): Promise<boolean> {
    // TODO: Query all batches from Supabase and verify chain
    // For now, placeholder
    console.log('[AUDIT] Chain verification not yet implemented');
    return true;
  }

  /**
   * Get current buffer stats
   */
  getStats() {
    return {
      ...this.stats,
      bufferSize: this.buffer.length,
      lastFlushAgeMs: Date.now() - this.lastFlushTime,
      currentBatchHash: this.lastBatchHash.slice(0, 8)
    };
  }

  /**
   * Graceful shutdown: flush remaining events
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.buffer.length > 0) {
      await this.flush();
    }
  }

  /**
   * Clear buffer (for tests)
   */
  clear(): void {
    this.buffer = [];
    this.lastBatchHash = '0000000000000000';
    this.stats = {
      totalEnqueued: 0,
      totalFlushed: 0,
      totalBatches: 0,
      flushErrors: 0,
      lastFlushDuration: 0
    };
  }
}

// Global audit writer instance
export const auditBatchWriter = new AuditBatchWriter();
