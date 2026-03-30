import { sha256Hex } from './canonical';

export type LedgerEntryInput = {
  orgId: string;
  agentId: string;
  requestId: string;
  approvalHash: string;
  sequence: number;
  epoch: number;
  action: string;
  inputHash: string;
  decision: 'ALLOW' | 'STABILIZE' | 'BLOCK';
  reason: string;
  prevStateHash: string;
  nextStateHash: string;
  effectId: string | null;
  logicalTs: number;
  prevEntryHash: string;
  metadata?: Record<string, unknown>;
};

export type LedgerEntry = {
  org_id: string;
  agent_id: string;
  request_id: string;
  approval_hash: string;
  sequence: number;
  epoch: number;
  action: string;
  input_hash: string;
  decision: 'ALLOW' | 'STABILIZE' | 'BLOCK';
  reason: string;
  prev_state_hash: string;
  next_state_hash: string;
  effect_id: string | null;
  logical_ts: number;
  prev_entry_hash: string;
  entry_hash: string;
  metadata: Record<string, unknown>;
};

export function buildLedgerEntry(input: LedgerEntryInput): LedgerEntry {
  const baseEntry = {
    org_id: input.orgId,
    agent_id: input.agentId,
    request_id: input.requestId,
    approval_hash: input.approvalHash,
    sequence: input.sequence,
    epoch: input.epoch,
    action: input.action,
    input_hash: input.inputHash,
    decision: input.decision,
    reason: input.reason,
    prev_state_hash: input.prevStateHash,
    next_state_hash: input.nextStateHash,
    effect_id: input.effectId,
    logical_ts: input.logicalTs,
    prev_entry_hash: input.prevEntryHash,
    metadata: input.metadata || {},
  };

  const entry_hash = sha256Hex(baseEntry);

  return {
    ...baseEntry,
    entry_hash,
  };
}
