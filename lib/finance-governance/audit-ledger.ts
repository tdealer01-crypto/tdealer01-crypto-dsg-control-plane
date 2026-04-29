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
