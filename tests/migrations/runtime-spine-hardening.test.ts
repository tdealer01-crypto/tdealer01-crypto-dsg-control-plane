import { readFileSync } from 'fs';

describe('runtime spine hardening migration', () => {
  it('serializes execution ordering and validates decision input', () => {
    const sql = readFileSync('supabase/migrations/20260404_runtime_spine_rpc_hardening.sql', 'utf8');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("invalid_decision");
    expect(sql).toContain("approval_consumption_failed");
  });

  it('persists a checkpoint after each successful runtime commit', () => {
    const sql = readFileSync('supabase/migrations/20260404_runtime_spine_rpc_hardening.sql', 'utf8');
    expect(sql).toContain('insert into runtime_checkpoints');
    expect(sql).toContain('checkpoint_hash');
  });
});
