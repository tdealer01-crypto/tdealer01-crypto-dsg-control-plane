/**
 * Delegation Audit Hash Chain
 *
 * Provides deterministic event hashing and chain verification
 * for tamper-evident audit trails of delegation actions.
 */

import { sha256Json } from '@/lib/dsg/runtime/hash';

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

export function computeEventHash(event: EventPayloadForHash): string {
  return sha256Json(event);
}

/**
 * Fetch the previous persisted event hash. A database client is mandatory:
 * an unavailable audit store must never be interpreted as "first event".
 */
export async function getPreviousEventHash(
  jobId: string,
  beforeCreatedAt: string,
  db: any,
): Promise<string | undefined> {
  if (!db) {
    throw new Error('AUDIT_DATABASE_REQUIRED');
  }

  const result = await db
    .from('agi_action_audit')
    .select('event_hash')
    .eq('job_id', jobId)
    .lt('created_at', beforeCreatedAt)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new Error(`AUDIT_PREVIOUS_HASH_READ_FAILED:${result.error.message ?? result.error.code ?? 'unknown'}`);
  }

  return result.data?.event_hash;
}

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

  const sorted = [...events].sort((a, b) => {
    const dateCompare = a.createdAt.localeCompare(b.createdAt);
    return dateCompare !== 0 ? dateCompare : a.eventId.localeCompare(b.eventId);
  });

  for (let index = 0; index < sorted.length; index += 1) {
    const event = sorted[index];
    const previousEvent = index === 0 ? undefined : sorted[index - 1];
    const expectedPreviousHash = previousEvent?.eventHash;

    if (event.previousHash !== expectedPreviousHash) {
      errors.push(`AUDIT_PREVIOUS_HASH_MISMATCH:${event.eventId}`);
    }

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

  return computeEventHash(payload) === event.eventHash;
}
