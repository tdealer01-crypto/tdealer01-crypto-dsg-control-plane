import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceGovernanceRepository } from '../../lib/finance-governance/repository';

const calls: Array<{ table: string; op: string; payload?: unknown }> = [];
let caseExists = true;

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
  });

  it('writes submit action to DB tables', async () => {
    const repository = new FinanceGovernanceRepository();
    await repository.submit('org-test', 'case-123');

    expect(calls.some((c) => c.table === 'finance_workflow_cases' && c.op === 'update')).toBe(true);
    expect(calls.some((c) => c.table === 'finance_workflow_action_events' && c.op === 'insert')).toBe(true);
  });


  it('does not write action event when submit case does not exist', async () => {
    caseExists = false;
    const repository = new FinanceGovernanceRepository();

    await expect(repository.submit('org-test', 'case-404')).rejects.toThrow('case_not_found');

    expect(calls.some((c) => c.table === 'finance_workflow_action_events' && c.op === 'insert')).toBe(false);
  });

  it('updates approval status and logs action events', async () => {
    const repository = new FinanceGovernanceRepository();
    await repository.applyAction('org-test', 'APR-1001', 'approve');

    expect(calls.some((c) => c.table === 'finance_workflow_approvals' && c.op === 'update')).toBe(true);
    expect(calls.some((c) => c.table === 'finance_workflow_action_events' && c.op === 'insert')).toBe(true);
  });
});
