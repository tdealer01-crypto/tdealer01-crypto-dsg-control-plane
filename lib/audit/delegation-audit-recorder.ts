/**
 * Delegation Audit Recorder
 *
 * Records delegation actions with a persisted deterministic hash chain.
 * Persistence is mandatory: an in-memory event is not audit evidence.
 */

import { randomUUID } from 'node:crypto';
import { computeEventHash, getPreviousEventHash } from './hash-chain';

export interface AuditEvent {
  eventId: string;
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
  previousHash?: string;
  eventHash: string;
  createdAt: string;
}

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

export async function recordDelegationActionAudit(
  input: RecordDelegationActionInput,
  db: any,
): Promise<AuditEvent> {
  if (!db) {
    throw new Error('AUDIT_DATABASE_REQUIRED');
  }

  const eventId = randomUUID();
  const createdAt = new Date().toISOString();
  const previousHash = await getPreviousEventHash(input.jobId, createdAt, db);

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

  const { error } = await db.from('agi_action_audit').insert({
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

  if (error) {
    throw new Error(`AUDIT_WRITE_FAILED:${error.message ?? error.code ?? 'unknown'}`);
  }

  return auditEvent;
}

export async function recordAllowAction(
  input: Omit<RecordDelegationActionInput, 'decision'> & { reason?: string },
  db: any,
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

export async function recordBlockAction(
  input: Omit<RecordDelegationActionInput, 'decision'> & { reason?: string },
  db: any,
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
