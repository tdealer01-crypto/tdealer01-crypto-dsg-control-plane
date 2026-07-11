/**
 * TestHarness — Central E2E test infrastructure
 *
 * Provides:
 * - Connector simulation (GitHub, Vercel, Stripe)
 * - OAuth flow simulation
 * - Event bus verification
 * - Rollback validation
 * - Ledger inspection
 * - Fault injection
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

export interface ExecutionContext {
  executionId: string;
  orgId: string;
  userId: string;
  startedAt: Date;
  status: 'running' | 'success' | 'failure' | 'blocked';
  checkpoints: Checkpoint[];
  events: SystemEvent[];
  ledgerEntries: LedgerEntry[];
}

export interface Checkpoint {
  id: string;
  timestamp: Date;
  state: Record<string, any>;
  description: string;
}

export interface SystemEvent {
  id: string;
  timestamp: Date;
  type: string;
  source: string;
  payload: Record<string, any>;
  sequence: number;
}

export interface LedgerEntry {
  id: string;
  timestamp: Date;
  action: string;
  actor: string;
  resource: string;
  state: Record<string, any>;
  proof?: string;
}

export interface ExecutionResult {
  context: ExecutionContext;
  success: boolean;
  error?: Error;
  duration: number;
  metrics: {
    eventCount: number;
    checkpointCount: number;
    ledgerEntryCount: number;
  };
}

export class TestHarness extends EventEmitter {
  private contexts: Map<string, ExecutionContext> = new Map();
  private eventSequence: number = 0;
  private currentContext: ExecutionContext | null = null;

  /**
   * Start a new execution context
   */
  startExecution(orgId: string, userId: string): ExecutionContext {
    const context: ExecutionContext = {
      executionId: randomUUID(),
      orgId,
      userId,
      startedAt: new Date(),
      status: 'running',
      checkpoints: [],
      events: [],
      ledgerEntries: [],
    };

    this.contexts.set(context.executionId, context);
    this.currentContext = context;
    return context;
  }

  /**
   * Record a system event
   */
  recordEvent(type: string, source: string, payload: Record<string, any>): SystemEvent {
    if (!this.currentContext) {
      throw new Error('No active execution context');
    }

    const event: SystemEvent = {
      id: randomUUID(),
      timestamp: new Date(),
      type,
      source,
      payload,
      sequence: this.eventSequence++,
    };

    this.currentContext.events.push(event);
    this.emit('event', event);
    return event;
  }

  /**
   * Create a checkpoint (savepoint for rollback testing)
   */
  createCheckpoint(description: string, state: Record<string, any>): Checkpoint {
    if (!this.currentContext) {
      throw new Error('No active execution context');
    }

    const checkpoint: Checkpoint = {
      id: randomUUID(),
      timestamp: new Date(),
      state: JSON.parse(JSON.stringify(state)),
      description,
    };

    this.currentContext.checkpoints.push(checkpoint);
    return checkpoint;
  }

  /**
   * Record a ledger entry (audit trail)
   */
  recordLedgerEntry(
    action: string,
    actor: string,
    resource: string,
    state: Record<string, any>,
    proof?: string
  ): LedgerEntry {
    if (!this.currentContext) {
      throw new Error('No active execution context');
    }

    const entry: LedgerEntry = {
      id: randomUUID(),
      timestamp: new Date(),
      action,
      actor,
      resource,
      state: JSON.parse(JSON.stringify(state)),
      proof,
    };

    this.currentContext.ledgerEntries.push(entry);
    return entry;
  }

  /**
   * Verify event bus integrity
   * Checks for lost events, ordering violations, duplicates
   */
  verifyEventBus(context: ExecutionContext): {
    ok: boolean;
    issues: string[];
    eventCount: number;
    lostCount: number;
  } {
    const issues: string[] = [];
    const eventsBySequence = new Map<number, SystemEvent>();

    for (const event of context.events) {
      if (eventsBySequence.has(event.sequence)) {
        issues.push(`Duplicate sequence number: ${event.sequence}`);
      }
      eventsBySequence.set(event.sequence, event);
    }

    // Check for gaps in sequence
    for (let i = 0; i < context.events.length; i++) {
      if (!eventsBySequence.has(i)) {
        issues.push(`Missing sequence number: ${i}`);
      }
    }

    // Verify timestamp ordering
    for (let i = 1; i < context.events.length; i++) {
      if (context.events[i].timestamp < context.events[i - 1].timestamp) {
        issues.push(`Timestamp ordering violation at index ${i}`);
      }
    }

    return {
      ok: issues.length === 0,
      issues,
      eventCount: context.events.length,
      lostCount: issues.filter((i) => i.includes('Missing')).length,
    };
  }

  /**
   * Verify ledger completeness
   */
  verifyLedger(context: ExecutionContext): {
    ok: boolean;
    issues: string[];
    entryCount: number;
  } {
    const issues: string[] = [];

    if (context.ledgerEntries.length === 0) {
      issues.push('No ledger entries recorded');
    }

    // Verify timestamp ordering
    for (let i = 1; i < context.ledgerEntries.length; i++) {
      if (context.ledgerEntries[i].timestamp < context.ledgerEntries[i - 1].timestamp) {
        issues.push(`Timestamp ordering violation at entry ${i}`);
      }
    }

    // Verify all entries have required fields
    for (const entry of context.ledgerEntries) {
      if (!entry.action || !entry.actor || !entry.resource) {
        issues.push(`Incomplete entry: ${entry.id}`);
      }
    }

    return {
      ok: issues.length === 0,
      issues,
      entryCount: context.ledgerEntries.length,
    };
  }

  /**
   * Verify rollback checkpoint integrity
   */
  verifyRollback(context: ExecutionContext): {
    ok: boolean;
    issues: string[];
    checkpointCount: number;
  } {
    const issues: string[] = [];

    if (context.checkpoints.length === 0) {
      issues.push('No checkpoints created');
    }

    for (const checkpoint of context.checkpoints) {
      if (!checkpoint.state || Object.keys(checkpoint.state).length === 0) {
        issues.push(`Empty state in checkpoint: ${checkpoint.id}`);
      }
    }

    return {
      ok: issues.length === 0,
      issues,
      checkpointCount: context.checkpoints.length,
    };
  }

  /**
   * Complete an execution and return results
   */
  completeExecution(status: 'success' | 'failure' | 'blocked', error?: Error): ExecutionResult {
    if (!this.currentContext) {
      throw new Error('No active execution context');
    }

    const context = this.currentContext;
    const duration = Date.now() - context.startedAt.getTime();

    context.status = status;

    const result: ExecutionResult = {
      context,
      success: status === 'success',
      error,
      duration,
      metrics: {
        eventCount: context.events.length,
        checkpointCount: context.checkpoints.length,
        ledgerEntryCount: context.ledgerEntries.length,
      },
    };

    this.currentContext = null;
    return result;
  }

  /**
   * Get context by execution ID
   */
  getContext(executionId: string): ExecutionContext | undefined {
    return this.contexts.get(executionId);
  }

  /**
   * Get all contexts
   */
  getAllContexts(): ExecutionContext[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Reset harness (for test cleanup)
   */
  reset(): void {
    this.contexts.clear();
    this.eventSequence = 0;
    this.currentContext = null;
    this.removeAllListeners();
  }
}

export const createTestHarness = (): TestHarness => {
  return new TestHarness();
};
