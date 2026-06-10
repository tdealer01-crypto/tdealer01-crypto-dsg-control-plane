/**
 * Delegation Audit Hash Chain
 *
 * Provides deterministic event hashing and chain verification
 * for tamper-proof audit trails of delegation actions.
 */

import { sha256Json } from '@/lib/dsg/runtime/hash';
import { stableJsonStringify } from '@/lib/dsg/runtime/stable-json';

/**
 * Event payload used for hash computation
 * (excludes the eventHash itself)
 */
export interface EventPayloadForHash {
  eventId: string;
  jobId: string;
  delegationId: string;
  agentId: string;

  tool: string;
  action: string;
  target?: string;
  risk: string;

  decision: 'ALLOW' | 'BLOCK';
  reason: string;

  evidenceJson: object;
  previousHash?: string;
  createdAt: string;
}

/**
 * Compute deterministic SHA256 hash of an audit event.
 * Hash includes all event data except the hash itself.
 * Same input always produces the same hash (deterministic).
 *
 * @param event Event payload without hash
 * @returns SHA256 hash (prefixed with 'sha256:')
 */
export function computeEventHash(event: EventPayloadForHash): string {
  return sha256Json(event);
}

/**
 * Fetch the hash of the previous event in the chain for a given job.
 * This would typically query the database for the most recent event
 * before the current one.
 *
 * @param jobId Job ID to search for
 * @param beforeCreatedAt Only consider events created before this timestamp
 * @returns Hash of previous event, or undefined if this is the first event
 */
export async function getPreviousEventHash(
  jobId: string,
  beforeCreatedAt: string,
  db?: any, // Could be a Supabase client
): Promise<string | undefined> {
  // This is a placeholder that assumes db integration.
  // In real use, query the audit table:
  // SELECT event_hash FROM agi_action_audit
  // WHERE job_id = $1 AND created_at < $2
  // ORDER BY created_at DESC LIMIT 1

  if (!db) {
    // Mock implementation for testing
    return undefined;
  }

  try {
    const result = await db
      .from('agi_action_audit')
      .select('event_hash')
      .eq('job_id', jobId)
      .lt('created_at', beforeCreatedAt)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return result.data?.event_hash;
  } catch (error: any) {
    // No previous event found (first event in chain)
    if (error?.code === 'PGRST116') {
      return undefined;
    }
    throw error;
  }
}

/**
 * Verify the integrity of an event chain for a job.
 * Checks:
 * 1. All events are sorted by createdAt
 * 2. Each event's previousHash matches the prior event's hash
 * 3. Each event's hash recomputes to the stored hash
 *
 * @param events List of audit events in chain
 * @returns { ok: true } if valid, { ok: false, errors: [...] } if tampering detected
 */
export function verifyEventChain(
  events: Array<{
    eventId: string;
    jobId: string;
    delegationId: string;
    agentId: string;
    tool: string;
    action: string;
    target?: string;
    risk: string;
    decision: 'ALLOW' | 'BLOCK';
    reason: string;
    evidenceJson: object;
    previousHash?: string;
    eventHash: string;
    createdAt: string;
  }>,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (events.length === 0) {
    return { ok: true, errors: [] };
  }

  // Sort by createdAt, then eventId for stable ordering
  const sorted = [...events].sort((a, b) => {
    const dateCompare = a.createdAt.localeCompare(b.createdAt);
    return dateCompare !== 0 ? dateCompare : a.eventId.localeCompare(b.eventId);
  });

  // Verify each event in the chain
  for (let index = 0; index < sorted.length; index += 1) {
    const event = sorted[index];
    const previousEvent = index === 0 ? undefined : sorted[index - 1];

    // Check previousHash links
    const expectedPreviousHash = previousEvent?.eventHash;
    if (event.previousHash !== expectedPreviousHash) {
      errors.push(`AUDIT_PREVIOUS_HASH_MISMATCH:${event.eventId}`);
    }

    // Recompute hash
    const payloadForHash: EventPayloadForHash = {
      eventId: event.eventId,
      jobId: event.jobId,
      delegationId: event.delegationId,
      agentId: event.agentId,
      tool: event.tool,
      action: event.action,
      target: event.target,
      risk: event.risk,
      decision: event.decision,
      reason: event.reason,
      evidenceJson: event.evidenceJson,
      previousHash: event.previousHash,
      createdAt: event.createdAt,
    };

    const recomputedHash = computeEventHash(payloadForHash);
    if (recomputedHash !== event.eventHash) {
      errors.push(`AUDIT_EVENT_HASH_MISMATCH:${event.eventId}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

/**
 * Check if a single event's hash is valid.
 *
 * @param event Event to verify
 * @returns true if hash is valid, false otherwise
 */
export function isEventHashValid(event: {
  eventId: string;
  jobId: string;
  delegationId: string;
  agentId: string;
  tool: string;
  action: string;
  target?: string;
  risk: string;
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  evidenceJson: object;
  previousHash?: string;
  eventHash: string;
  createdAt: string;
}): boolean {
  const payload: EventPayloadForHash = {
    eventId: event.eventId,
    jobId: event.jobId,
    delegationId: event.delegationId,
    agentId: event.agentId,
    tool: event.tool,
    action: event.action,
    target: event.target,
    risk: event.risk,
    decision: event.decision,
    reason: event.reason,
    evidenceJson: event.evidenceJson,
    previousHash: event.previousHash,
    createdAt: event.createdAt,
  };

  const recomputed = computeEventHash(payload);
  return recomputed === event.eventHash;
}
