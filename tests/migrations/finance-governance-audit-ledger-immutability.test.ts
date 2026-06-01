import { readFileSync } from 'fs';

describe('finance governance audit ledger immutability migration', () => {
  it('keeps the ledger constrained to submit/approve/reject/escalate actions', () => {
    const sql = readFileSync('supabase/migrations/20260429060000_finance_governance_audit_ledger.sql', 'utf8');

    expect(sql).toContain("action in ('submit', 'approve', 'reject', 'escalate')");
    expect(sql).toContain("result in ('ok', 'error', 'denied')");
    expect(sql).toContain('record_hash text not null unique');
  });

  it('adds DB-level update and delete blockers to the finance audit ledger', () => {
    const sql = readFileSync('supabase/migrations/20260601143000_finance_audit_ledger_immutable.sql', 'utf8');

    expect(sql).toContain('create or replace trigger prevent_update_finance_governance_audit_ledger');
    expect(sql).toContain('before update on public.finance_governance_audit_ledger');
    expect(sql).toContain("execute function public.raise_immutable_record('Cannot update finance_governance_audit_ledger')");
    expect(sql).toContain('create or replace trigger prevent_delete_finance_governance_audit_ledger');
    expect(sql).toContain('before delete on public.finance_governance_audit_ledger');
    expect(sql).toContain("execute function public.raise_immutable_record('Cannot delete finance_governance_audit_ledger')");
  });
});
