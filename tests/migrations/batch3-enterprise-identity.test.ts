import { readFileSync } from 'fs';

describe('batch 3 enterprise migrations', () => {
  it('defines sso, directory sync, billing policy, seat activation, and onboarding tables', () => {
    const sql = readFileSync('supabase/migrations/20260401093000_batch3_enterprise_identity_rollout.sql', 'utf8');
    expect(sql).toContain('create table if not exists org_sso_configs');
    expect(sql).toContain('create table if not exists directory_sync_configs');
    expect(sql).toContain('create table if not exists directory_group_role_mappings');
    expect(sql).toContain('create table if not exists org_billing_policies');
    expect(sql).toContain('create table if not exists seat_activations');
    expect(sql).toContain('create table if not exists org_onboarding_states');
  });
});
