import { readFileSync } from 'fs';

describe('finance workflow migration', () => {
  it('creates DB-backed finance workflow tables and indexes', () => {
    const sql = readFileSync('supabase/migrations/20260411101500_finance_governance_workflow.sql', 'utf8');
    expect(sql).toContain('create table if not exists public.finance_workflow_cases');
    expect(sql).toContain('create table if not exists public.finance_workflow_approvals');
    expect(sql).toContain('create table if not exists public.finance_workflow_action_events');
    expect(sql).toContain('idx_finance_workflow_cases_org_id_updated');
    expect(sql).toContain('idx_finance_workflow_approvals_org_id_status');
  });

  it('locks workflow actions to submit → approve/reject/escalate lifecycle', () => {
    const sql = readFileSync('supabase/migrations/20260411101500_finance_governance_workflow.sql', 'utf8');

    expect(sql).toContain("action in ('submit', 'approve', 'reject', 'escalate')");
    expect(sql).toContain("status in ('pending', 'approved', 'rejected', 'escalated', 'compliance_review')");
    expect(sql).toContain("status in ('Needs approver', 'Exception open', 'Compliance review', 'approved', 'rejected', 'escalated')");
  });
});
