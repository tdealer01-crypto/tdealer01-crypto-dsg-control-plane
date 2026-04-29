import { createHash } from 'crypto';
import type { FinanceGovernanceActionResult } from './actions';

export type FinanceGovernanceAuditEvent = {
  orgId: string;
  caseId: string | null;
  approvalId: string | null;
  action: FinanceGovernanceActionResult['action'];
  actor: string;
  result: 'ok' | 'error' | 'denied';
  target: string | null;
  message: string;
  nextStatus: string;
  payload: FinanceGovernanceActionResult;
};

export type FinanceGovernanceAuditProof = {
  requestHash: string;
  recordHash: string;
  stored: boolean;
};

export type FinanceGovernanceAuditLedgerRow = {
  id?: string;
  org_id: string;
  case_id: string | null;
  approval_id: string | null;
  action: FinanceGovernanceActionResult['action'];
  actor: string;
  result: 'ok' | 'error' | 'denied';
  target: string | null;
  message: string;
  next_status: string;
  request_hash: string;
  record_hash: string;
  payload: FinanceGovernanceActionResult;
  created_at?: string;
};

export type FinanceGovernanceAuditVerification = {
  ok: boolean;
  expectedRequestHash: string;
  expectedRecordHash: string;
  storedRequestHash: string;
  storedRecordHash: string;
  mismatches: string[];
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function isMissingRelation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? '');
  return /relation .* does not exist|relation not found|does not exist/i.test(message);
}

function toAuditEvent(row: FinanceGovernanceAuditLedgerRow): FinanceGovernanceAuditEvent {
  return {
    orgId: row.org_id,
    caseId: row.case_id,
    approvalId: row.approval_id,
    action: row.action,
    actor: row.actor,
    result: row.result,
    target: row.target,
    message: row.message,
    nextStatus: row.next_status,
    payload: row.payload,
  };
}

function toRecord(row: FinanceGovernanceAuditLedgerRow) {
  return {
    org_id: row.org_id,
    case_id: row.case_id,
    approval_id: row.approval_id,
    action: row.action,
    actor: row.actor,
    result: row.result,
    target: row.target,
    message: row.message,
    next_status: row.next_status,
    request_hash: row.request_hash,
    payload: row.payload,
  };
}

export function verifyFinanceGovernanceAuditLedgerRow(
  row: FinanceGovernanceAuditLedgerRow
): FinanceGovernanceAuditVerification {
  const expectedRequestHash = sha256(toAuditEvent(row));
  const expectedRecordHash = sha256(toRecord(row));
  const mismatches: string[] = [];

  if (row.request_hash !== expectedRequestHash) {
    mismatches.push('request_hash');
  }

  if (row.record_hash !== expectedRecordHash) {
    mismatches.push('record_hash');
  }

  return {
    ok: mismatches.length === 0,
    expectedRequestHash,
    expectedRecordHash,
    storedRequestHash: row.request_hash,
    storedRecordHash: row.record_hash,
    mismatches,
  };
}

export async function writeFinanceGovernanceAuditLedger(
  supabase: any,
  event: FinanceGovernanceAuditEvent
): Promise<FinanceGovernanceAuditProof> {
  const requestHash = sha256(event);
  const record = {
    org_id: event.orgId,
    case_id: event.caseId,
    approval_id: event.approvalId,
    action: event.action,
    actor: event.actor,
    result: event.result,
    target: event.target,
    message: event.message,
    next_status: event.nextStatus,
    request_hash: requestHash,
    payload: event.payload,
  };
  const recordHash = sha256(record);

  const { error } = await supabase.from('finance_governance_audit_ledger').insert({
    ...record,
    record_hash: recordHash,
  });

  if (error) {
    if (isMissingRelation(error)) {
      return { requestHash, recordHash, stored: false };
    }

    throw new Error(`failed_to_write_audit_ledger:${error.message}`);
  }

  return { requestHash, recordHash, stored: true };
}
