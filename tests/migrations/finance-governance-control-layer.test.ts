import { readFileSync } from 'fs';

describe('finance governance control layer migration', () => {
  it('creates control layer tables and backfill statements', () => {
    const sql = readFileSync(
      'supabase/migrations/20260424010000_finance_governance_control_layer.sql',
      'utf8'
    );

    expect(sql).toContain('create table if not exists public.finance_transactions');
    expect(sql).toContain('create table if not exists public.finance_approval_requests');
    expect(sql).toContain('create table if not exists public.finance_approval_decisions');
    expect(sql).toContain('create table if not exists public.finance_exceptions');
    expect(sql).toContain('create table if not exists public.finance_evidence_bundles');
    expect(sql).toContain('insert into public.finance_transactions');
    expect(sql).toContain('insert into public.finance_approval_requests');
  });
});
