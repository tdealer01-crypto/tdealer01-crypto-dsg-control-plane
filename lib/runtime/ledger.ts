import { sha256Hex } from './canonical';
import type { DSGDecision } from './gate';

export type LedgerEntry = {
  org_id: string;
  agent_id: string;
  request_id: string;
  approval_hash: string;
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
  entry_hash: string;
  metadata: Record<string, unknown>;
};

export type BuildLedgerEntryParams = {
  orgId: string;
  agentId: string;
  requestId: string;
  approvalHash: string;
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

export function computeLedgerEntryHash(entry: Omit<LedgerEntry, 'entry_hash'>): string {
  return sha256Hex(entry);
}

export function buildLedgerEntry(params: BuildLedgerEntryParams): LedgerEntry {
  const baseEntry: Omit<LedgerEntry, 'entry_hash'> = {
    org_id: params.orgId,
    agent_id: params.agentId,
    request_id: params.requestId,
    approval_hash: params.approvalHash,
    sequence: params.sequence,
    epoch: params.epoch,
    action: params.action,
    input_hash: params.inputHash,
    decision: params.decision,
    reason: params.reason,
    prev_state_hash: params.prevStateHash,
    next_state_hash: params.nextStateHash,
    effect_id: params.effectId,
    logical_ts: params.logicalTs,
    prev_entry_hash: params.prevEntryHash,
    metadata: params.metadata || {},
  };

  return {
    ...baseEntry,
    entry_hash: computeLedgerEntryHash(baseEntry),
  };
}
