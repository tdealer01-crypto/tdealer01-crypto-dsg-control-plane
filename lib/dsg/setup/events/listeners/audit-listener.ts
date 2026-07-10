/**
 * Audit Listener
 * Records events to immutable hash-chain audit trail
 */

import { canonicalHash, type CanonicalInput } from '@/lib/runtime/canonical';
import type { DSGEvent } from '../types';

interface AuditRecord {
  id: string;
  org_id: string;
  execution_id?: string;
  event_type: string;
  event_data: Record<string, unknown>;
  previous_event_hash: string | null;
  event_hash: string;
  created_at: Date;
}

export class AuditListener {
  private auditChain: AuditRecord[] = [];
  private dbConnected = false;

  constructor() {
    // Initialize database connection check
    this.checkDatabaseConnection().catch(() => {
      console.warn('[audit-listener] Database connection not available');
    });
  }

  private async checkDatabaseConnection(): Promise<void> {
    // Placeholder for actual DB connection check
    // In production, verify supabase client or server connection
    this.dbConnected = true;
  }

  /**
   * Listen to all events and record to audit trail
   */
  async onEvent<T = Record<string, unknown>>(event: DSGEvent<T>): Promise<void> {
    // Get previous event hash (last item in chain)
    const previousRecord = this.auditChain[this.auditChain.length - 1];
    const previousEventHash = previousRecord?.event_hash || null;

    // Create audit record
    const auditData = {
      event_type: event.type,
      event_data: JSON.stringify(event.data),
      timestamp: event.timestamp.toISOString(),
      org_id: event.org_id,
      execution_id: event.execution_id || '',
      metadata: JSON.stringify(event.metadata || {}),
    };

    // Compute hash-chain hash: SHA256(current_event + previous_hash)
    const chainInput = {
      event_type: auditData.event_type,
      event_data: auditData.event_data,
      timestamp: auditData.timestamp,
      org_id: auditData.org_id,
      execution_id: auditData.execution_id,
      previous_hash: previousEventHash || '',
    };

    const eventHash = canonicalHash(chainInput as CanonicalInput);

    const record: AuditRecord = {
      id: crypto.randomUUID(),
      org_id: event.org_id,
      execution_id: event.execution_id,
      event_type: event.type,
      event_data: auditData,
      previous_event_hash: previousEventHash,
      event_hash: eventHash,
      created_at: new Date(),
    };

    // Add to local chain
    this.auditChain.push(record);

    // Persist to database (async, non-blocking)
    if (this.dbConnected) {
      this.persistToDatabase(record).catch((error) => {
        console.error('[audit-listener] Failed to persist audit record:', error);
      });
    }
  }

  /**
   * Persist audit record to database
   */
  private async persistToDatabase(record: AuditRecord): Promise<void> {
    // Placeholder for actual Supabase insert
    // INSERT INTO dsg_provision_audit_events (
    //   org_id, execution_id, event_type, event_data,
    //   previous_event_hash, event_hash, created_at
    // ) VALUES (...)
    console.debug('[audit-listener] Persisting audit record:', record.id);
  }

  /**
   * Verify audit chain integrity
   */
  verifyChainIntegrity(): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (let i = 0; i < this.auditChain.length; i++) {
      const current = this.auditChain[i];
      const previous = i > 0 ? this.auditChain[i - 1] : null;

      // Verify previous hash reference
      if (previous) {
        if (current.previous_event_hash !== previous.event_hash) {
          errors.push(
            `Record ${i}: previous_event_hash mismatch (expected ${previous.event_hash}, got ${current.previous_event_hash})`,
          );
        }
      } else {
        if (current.previous_event_hash !== null) {
          errors.push(`Record 0: should have null previous_event_hash, got ${current.previous_event_hash}`);
        }
      }

      // Verify hash is canonical (recompute and compare)
      const chainInput = {
        ...current.event_data,
        previous_hash: current.previous_event_hash,
      };
      const recomputedHash = canonicalHash(chainInput);
      if (current.event_hash !== recomputedHash) {
        errors.push(
          `Record ${i}: event_hash mismatch (expected ${recomputedHash}, got ${current.event_hash})`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get audit chain (read-only)
   */
  getChain(): AuditRecord[] {
    return [...this.auditChain];
  }

  /**
   * Get chain hash (for proof/verification)
   */
  getChainHash(): string {
    if (this.auditChain.length === 0) {
      return canonicalHash({ chain_length: 0 });
    }

    const lastRecord = this.auditChain[this.auditChain.length - 1];
    return canonicalHash({
      chain_length: this.auditChain.length,
      tail_hash: lastRecord.event_hash,
    });
  }

  /**
   * Clear audit chain (for testing only)
   */
  clearChain(): void {
    this.auditChain = [];
  }
}

export const auditListener = new AuditListener();
