import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceGovernanceRepository } from '../../lib/finance-governance/repository';

const calls: Array<{ table: string; op: string; payload?: any }> = [];
let caseExists = true;
let legacyWorkflowExists = true;

function buildClient() {
  return {
    from(table: string) {
      return {
        select() {
          calls.push({ table, op: 'select' });
          return this;
        },
        eq() {
          return this;
        },
        limit() {
          if (table === 'finance_workflow_approvals' && !legacyWorkflowExists) {
            return Promise.resolve({ data: null, error: { message: 'relation not found' } });
          }
          return Promise.resolve({ data: [] });
        },
        order() {
          return Promise.resolve({ data: [{ id: 'APR-1001', vendor: 'v', amount: 'US$1', status: 'Needs approver', risk: 'r' }] });
        },
        maybeSingle() {
          if (table === 'finance_workflow_cases') {
            if (!caseExists) {
              return Promise.resolve({ data: null });
            }
            return Promise.resolve({ data: { id: 'sample-case', status: 'pending', export_status: 'Ready', vendor: 'v', amount: 1, currency: 'USD', workflow: 'wf' } });
          }
          if (table === 'finance_approval_requests') {
            return Promise.resolve({ data: { id: 'APR-1001', transaction_id: 'sample-case' } });
          }
          return Promise.resolve({ data: { case_id: 'sample-case' } });
        },
        upsert(payload: unknown) {
          calls.push({ table, op: 'upsert', payload });
          return Promise.resolve({ error: null });
        },
        update(payload: unknown) {
          calls.push({ table, op: 'update', payload });
          return this;
        },
        insert(payload: unknown) {
          calls.push({ table, op: 'insert', payload });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

vi.mock('../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => buildClient()),
}));

describe('FinanceGovernanceRepository', () => {
  beforeEach(() => {
    calls.length = 0;
    caseExists = true;
    legacyWorkflowExists = true;
  });

  it('writes submit action to DB tables and audit ledger', async () => {
    const repository = new FinanceGovernanceRepository();
    await repository.submit('org-test', 'case-123');

    expect(calls.some((c) => c.table === 'finance_workflow_cases' && c.op === 'update')).toBe(true);
    expect(calls.some((c) => c.table === 'finance_workflow_action_events' && c.op === 'insert')).toBe(true);
    expect(calls.some((c) => c.table === 'finance_governance_audit_ledger' && c.op === 'insert')).toBe(true);
  });

  it('stores audit proof hashes in the workflow action event payload', async () => {
    const repository = new FinanceGovernanceRepository();
    await repository.submit('org-test', 'case-123');

    const eventInsert = calls.find((c) => c.table === 'finance_workflow_action_events' && c.op === 'insert');

    expect(eventInsert?.payload?.payload?.audit?.requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(eventInsert?.payload?.payload?.audit?.recordHash).toMatch(/^[a-f0-9]{64}$/);
    expect(eventInsert?.payload?.payload?.audit?.stored).toBe(true);
  });

  it('does not write action event when submit case does not exist', async () => {
    caseExists = false;
    const repository = new FinanceGovernanceRepository();

    await expect(repository.submit('org-test', 'case-404')).rejects.toThrow('case_not_found');

    expect(calls.some((c) => c.table === 'finance_workflow_action_events' && c.op === 'insert')).toBe(false);
    expect(calls.some((c) => c.table === 'finance_governance_audit_ledger' && c.op === 'insert')).toBe(false);
  });

  it('skips legacy approval table updates when runtime backend runs only control-layer tables', async () => {
    legacyWorkflowExists = false;
    const repository = new FinanceGovernanceRepository();
    await repository.applyAction('org-test', 'APR-1001', 'approve');

    expect(calls.some((c) => c.table === 'finance_workflow_approvals' && c.op === 'update')).toBe(false);
    expect(calls.some((c) => c.table === 'finance_approval_requests' && c.op === 'update')).toBe(true);
    expect(calls.some((c) => c.table === 'finance_governance_audit_ledger' && c.op === 'insert')).toBe(true);
  });

  it('updates approval status and logs action events', async () => {
    const repository = new FinanceGovernanceRepository();
    await repository.applyAction('org-test', 'APR-1001', 'approve');

    expect(calls.some((c) => c.table === 'finance_workflow_approvals' && c.op === 'update')).toBe(true);
    expect(calls.some((c) => c.table === 'finance_workflow_action_events' && c.op === 'insert')).toBe(true);
    expect(calls.some((c) => c.table === 'finance_governance_audit_ledger' && c.op === 'insert')).toBe(true);
  });
});
