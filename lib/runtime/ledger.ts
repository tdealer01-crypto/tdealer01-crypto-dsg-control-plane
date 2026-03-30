import { sha256Hex } from './canonical';
import type { DSGDecision } from './gate';

export type LedgerSeed = {
  orgId: string;
  agentId: string;
  requestId: string;
  approvalHash: string | null;
  sequence: number;
  epoch: number;
  action: string;
  inputHash: string;
  decision: DSGDecision;
  reason: string;
  prevStateHash: string;
  nextStateHash: string;
  effectId: string | null;
  logicalTs: number;
  prevEntryHash: string;
  metadata?: Record<string, unknown>;
};

export type LedgerRecord = {
  org_id: string;
  agent_id: string;
  request_id: string;
  approval_hash: string | null;
  sequence: number;
  epoch: number;
  action: string;
  input_hash: string;
  decision: DSGDecision;
  reason: string;
  prev_state_hash: string;
  next_state_hash: string;
  effect_id: string | null;
  logical_ts: number;
  prev_entry_hash: string;
  metadata: Record<string, unknown>;
  entry_hash: string;
};

export function buildLedgerEntry(seed: LedgerSeed): LedgerRecord {
  const base = {
    org_id: seed.orgId,
    agent_id: seed.agentId,
    request_id: seed.requestId,
    approval_hash: seed.approvalHash,
    sequence: seed.sequence,
    epoch: seed.epoch,
    action: seed.action,
    input_hash: seed.inputHash,
    decision: seed.decision,
    reason: seed.reason,
    prev_state_hash: seed.prevStateHash,
    next_state_hash: seed.nextStateHash,
    effect_id: seed.effectId,
    logical_ts: seed.logicalTs,
    prev_entry_hash: seed.prevEntryHash,
    metadata: seed.metadata || {},
  };

  return {
    ...base,
    entry_hash: sha256Hex(base),
  };
}
