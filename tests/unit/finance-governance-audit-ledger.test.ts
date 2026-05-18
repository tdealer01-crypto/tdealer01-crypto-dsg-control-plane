import { describe, expect, it } from 'vitest';
import {
  verifyFinanceGovernanceAuditLedgerRow,
  type FinanceGovernanceAuditLedgerRow,
} from '../../lib/finance-governance/audit-ledger';

const row: FinanceGovernanceAuditLedgerRow = {
  org_id: 'org-test',
  case_id: 'case-123',
  approval_id: null,
  action: 'submit',
  actor: 'api',
  result: 'ok',
  target: 'case-123',
  message: 'Finance workflow item submitted',
  next_status: 'pending',
  request_hash: '',
  record_hash: '',
  payload: {
    ok: true,
    action: 'submit',
    message: 'Finance workflow item submitted',
    nextStatus: 'pending',
    caseId: 'case-123',
  },
};

describe('finance governance audit ledger verification', () => {
  it('detects matching request and record hashes', () => {
    const firstPass = verifyFinanceGovernanceAuditLedgerRow(row);
    const completeRow = {
      ...row,
      request_hash: firstPass.expectedRequestHash,
      record_hash: firstPass.expectedRecordHash,
    };

    const verification = verifyFinanceGovernanceAuditLedgerRow(completeRow);

    expect(verification.ok).toBe(true);
    expect(verification.mismatches).toEqual([]);
  });

  it('detects tampered ledger records', () => {
    const firstPass = verifyFinanceGovernanceAuditLedgerRow(row);
    const completeRow = {
      ...row,
      request_hash: firstPass.expectedRequestHash,
      record_hash: firstPass.expectedRecordHash,
      message: 'tampered message',
    };

    const verification = verifyFinanceGovernanceAuditLedgerRow(completeRow);

    expect(verification.ok).toBe(false);
    expect(verification.mismatches).toContain('request_hash');
    expect(verification.mismatches).toContain('record_hash');
  });
});
