import { readFileSync } from 'fs';

describe('runtime migration coverage', () => {
  it('defines runtime spine tables for fresh installs', () => {
    const sql = readFileSync('supabase/migrations/20260331_runtime_spine.sql', 'utf8');
    expect(sql).toContain('create table if not exists runtime_truth_states');
    expect(sql).toContain('create table if not exists runtime_approval_requests');
    expect(sql).toContain('create table if not exists runtime_ledger_entries');
  });

  it('supports upgrade paths with if not exists and rpc migration', () => {
    const sqlSpine = readFileSync('supabase/migrations/20260331_runtime_spine.sql', 'utf8');
    const sqlRpc = readFileSync('supabase/migrations/20260331_runtime_spine_rpc.sql', 'utf8');
    expect(sqlSpine).toMatch(/if not exists/g);
    expect(sqlRpc).toContain('create or replace function runtime_commit_execution');
  });
});
