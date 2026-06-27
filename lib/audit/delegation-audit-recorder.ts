/**
 * Delegation Audit Recorder
 *
 * Records all delegation actions with tamper-proof hash chains.
 * Each action is recorded with a deterministic hash, linked to the previous event.
 */

import { randomUUID } from 'node:crypto';
import { computeEventHash, getPreviousEventHash } from './hash-chain';

/**
 * AuditEvent represents a single recorded delegation action
 * with deterministic hash chain integrity.
 */
export interface AuditEvent {
  /** Unique event identifier (UUID) */
  eventId: string;

  /** Job ID for this delegation */
  jobId: string;

  /** Delegation contract ID */
  delegationId: string;

  /** Agent ID performing the action */
  agentId: string;

  /** Tool being invoked (e.g., "browser", "repo", "email") */
  tool: string;

  /** Specific action on that tool (e.g., "fill_form", "commit_push") */
  action: string;

  /** Optional target of the action (URL, file path, recipient, etc.) */
  target?: string;

  /** Risk level of this action */
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Gate decision: ALLOW or BLOCK */
  decision: 'ALLOW' | 'BLOCK';

  /** Reason for the decision */
  reason: string;

  /** Structured evidence supporting the decision (JSON) */
  evidenceJson: object;

  /** Hash of the previous event in the chain (undefined for first event) */
  previousHash?: string;

  /** Deterministic SHA256 hash of this event */
  eventHash: string;

  /** ISO8601 timestamp when event was recorded */
  createdAt: string;
}

/**
 * Input for recording a delegation action
 */
export interface RecordDelegationActionInput {
  jobId: string;
  delegationId: string;
  agentId: string;
  tool: string;
  action: string;
  target?: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  evidenceJson: object;
}

/**
 * Record a delegation action with deterministic hash chain.
 *
 * Process:
 * 1. Generate unique eventId (UUID)
 * 2. Get previous event's hash from DB
 * 3. Create event payload with previousHash
 * 4. Compute deterministic hash
 * 5. Store in audit table
 * 6. Return AuditEvent
 *
 * @param input Action details to record
 * @param db Supabase client (required for actual DB write)
 * @returns Recorded AuditEvent with hash
 */
export async function recordDelegationActionAudit(
  input: RecordDelegationActionInput,
  db?: any, // Supabase client
): Promise<AuditEvent> {
  const eventId = randomUUID();
  const createdAt = new Date().toISOString();

  // Get previous event hash if this is not the first event
  let previousHash: string | undefined;
  if (db) {
    previousHash = await getPreviousEventHash(input.jobId, createdAt, db);
  }

  // Compute deterministic hash for this event
  const eventHash = computeEventHash({
    eventId,
    jobId: input.jobId,
    delegationId: input.delegationId,
    agentId: input.agentId,
    tool: input.tool,
    action: input.action,
    target: input.target,
    risk: input.risk,
    decision: input.decision,
    reason: input.reason,
    evidenceJson: input.evidenceJson,
    previousHash,
    createdAt,
  });

  const auditEvent: AuditEvent = {
    eventId,
    jobId: input.jobId,
    delegationId: input.delegationId,
    agentId: input.agentId,
    tool: input.tool,
    action: input.action,
    target: input.target,
    risk: input.risk,
    decision: input.decision,
    reason: input.reason,
    evidenceJson: input.evidenceJson,
    previousHash,
    eventHash,
    createdAt,
  };

  // Write to database if available
  if (db) {
    await db.from('agi_action_audit').insert({
      event_id: auditEvent.eventId,
      job_id: auditEvent.jobId,
      delegation_id: auditEvent.delegationId,
      agent_id: auditEvent.agentId,
      tool: auditEvent.tool,
      action: auditEvent.action,
      target: auditEvent.target,
      risk: auditEvent.risk,
      decision: auditEvent.decision,
      reason: auditEvent.reason,
      evidence_json: auditEvent.evidenceJson,
      previous_hash: auditEvent.previousHash,
      event_hash: auditEvent.eventHash,
      created_at: auditEvent.createdAt,
    });
  }

  return auditEvent;
}

/**
 * Record an ALLOW decision for a delegation action.
 *
 * @param input Action details
 * @param db Supabase client (optional)
 * @returns Recorded AuditEvent with ALLOW decision
 */
export async function recordAllowAction(
  input: Omit<RecordDelegationActionInput, 'decision'> & { reason?: string },
  db?: any,
): Promise<AuditEvent> {
  return recordDelegationActionAudit(
    {
      ...input,
      decision: 'ALLOW',
      reason: input.reason ?? 'Action allowed by delegation contract',
    },
    db,
  );
}

/**
 * Record a BLOCK decision for a delegation action.
 *
 * @param input Action details
 * @param db Supabase client (optional)
 * @returns Recorded AuditEvent with BLOCK decision
 */
export async function recordBlockAction(
  input: Omit<RecordDelegationActionInput, 'decision'> & { reason?: string },
  db?: any,
): Promise<AuditEvent> {
  return recordDelegationActionAudit(
    {
      ...input,
      decision: 'BLOCK',
      reason: input.reason ?? 'Action blocked by policy',
    },
    db,
  );
}
